import React, { useState, useEffect, useCallback } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { createPageUrl } from '@/utils';

import PDFCanvas from '@/components/pdf/PDFCanvas';
import EditToolbar from '@/components/pdf/EditToolbar';

// ✅ CDN worker – guaranteed to work (same as Home.jsx)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export default function EditPDF() {
    const [pdfBytes, setPdfBytes] = useState(null);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentTool, setCurrentTool] = useState('draw');
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [zoom, setZoom] = useState(1.5);
    const [rotations, setRotations] = useState([]);

    const [pageAnnotations, setPageAnnotations] = useState({});
    const [history, setHistory] = useState([{}]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Load from sessionStorage (from Home)
    useEffect(() => {
        const stored = sessionStorage.getItem('editPdfBytes');
        if (stored) {
            const bytes = new Uint8Array(JSON.parse(stored));
            setPdfBytes(bytes);
            loadPdfDocument(bytes);
        }
    }, []);

    const loadPdfDocument = async (bytes) => {
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        setTotalPages(pdf.numPages);
        setRotations(new Array(pdf.numPages).fill(0));
    };

    // ============== PAGE MANAGEMENT ==============
    const updatePdfBytes = async (newBytes) => {
        setPdfBytes(newBytes);
        sessionStorage.setItem('editPdfBytes', JSON.stringify(Array.from(newBytes)));
        await loadPdfDocument(newBytes);
        setCurrentPage(Math.min(currentPage, totalPages)); // safety
    };

    const handleRotatePage = async (direction) => {
        const newRot = (rotations[currentPage - 1] + (direction === 'left' ? -90 : 90) + 360) % 360;
        const newRotations = [...rotations];
        newRotations[currentPage - 1] = newRot;
        setRotations(newRotations);

        // Bake rotation into PDF bytes
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const page = pdfDoc.getPage(currentPage - 1);
        page.setRotation(degrees(newRot));
        const newBytes = await pdfDoc.save();
        await updatePdfBytes(newBytes);
    };

    const handleAddBlankPage = async () => {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const blankPage = pdfDoc.addPage([595, 842]); // A4 size
        const newBytes = await pdfDoc.save();
        await updatePdfBytes(newBytes);
        setCurrentPage(totalPages + 1); // go to new page
    };

    const handleDeleteCurrentPage = async () => {
        if (totalPages <= 1) return alert("Can't delete the only page");
        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfDoc.removePage(currentPage - 1);
        const newBytes = await pdfDoc.save();
        await updatePdfBytes(newBytes);
        setCurrentPage(Math.max(1, currentPage - 1));
    };

    const handleZoom = (newZoom) => {
        setZoom(Math.max(0.5, Math.min(3, newZoom)));
    };

    // ============== ANNOTATIONS ==============
    const handleAnnotationAdd = useCallback((annotation) => {
        const newAnn = { ...pageAnnotations, [currentPage]: [...(pageAnnotations[currentPage] || []), annotation] };
        setPageAnnotations(newAnn);

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newAnn)));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [pageAnnotations, currentPage, history, historyIndex]);

    const handleAnnotationEdit = (index, newText) => {
        const anns = [...(pageAnnotations[currentPage] || [])];
        if (anns[index]?.type === 'text') {
            anns[index].text = newText;
            const newAnn = { ...pageAnnotations, [currentPage]: anns };
            setPageAnnotations(newAnn);
            // push to history
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(JSON.parse(JSON.stringify(newAnn)));
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setPageAnnotations(JSON.parse(JSON.stringify(history[historyIndex - 1])));
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setPageAnnotations(JSON.parse(JSON.stringify(history[historyIndex + 1])));
        }
    };

    const handleSave = async () => {
        if (!pdfBytes) return;
        const pdfDoc = await PDFDocument.load(pdfBytes);

        for (let i = 1; i <= totalPages; i++) {
            const anns = pageAnnotations[i] || [];
            if (anns.length === 0) continue;

            const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2, rotation: rotations[i - 1] });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;

            // Draw all annotations
            anns.forEach(ann => {
                ctx.strokeStyle = ann.color || '#000';
                ctx.lineWidth = (ann.brushSize || 5) * (2 / 1.5);
                ctx.lineCap = 'round';

                if (ann.type === 'highlight') ctx.globalAlpha = 0.35;

                if (ann.points) {
                    ctx.beginPath();
                    ctx.moveTo(ann.points[0].x * (2 / 1.5), ann.points[0].y * (2 / 1.5));
                    ann.points.forEach(p => ctx.lineTo(p.x * (2 / 1.5), p.y * (2 / 1.5)));
                    ctx.stroke();
                } else if (ann.type === 'text') {
                    ctx.font = `${(ann.fontSize || 24) * (2 / 1.5)}px Arial`;
                    ctx.fillStyle = ann.color;
                    ctx.fillText(ann.text, ann.x * (2 / 1.5), ann.y * (2 / 1.5));
                }
                ctx.globalAlpha = 1;
            });

            const pngBytes = await fetch(canvas.toDataURL('image/png')).then(r => r.arrayBuffer());
            const pngImage = await pdfDoc.embedPng(pngBytes);

            const pdfPage = pdfDoc.getPage(i - 1);
            const { width, height } = pdfPage.getSize();
            pdfPage.drawImage(pngImage, { x: 0, y: 0, width, height });
        }

        const finalBytes = await pdfDoc.save();
        const blob = new Blob([finalBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edited-document.pdf';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleBack = () => window.location.href = createPageUrl('Home');

    if (!pdfBytes) {
        return (
            <div className="h-screen flex items-center justify-center bg-zinc-950 text-white">
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-4">No PDF Loaded</h2>
                    <button onClick={handleBack} className="px-8 py-4 bg-indigo-600 rounded-xl text-lg">← Back to Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-zinc-950 text-white">
            <EditToolbar
                currentTool={currentTool}
                onToolChange={setCurrentTool}
                color={color}
                onColorChange={setColor}
                brushSize={brushSize}
                onBrushSizeChange={setBrushSize}
                zoom={zoom}
                onZoomChange={handleZoom}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onRotate={handleRotatePage}
                onAddBlank={handleAddBlankPage}
                onDelete={handleDeleteCurrentPage}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onSave={handleSave}
                onBack={handleBack}
            />

            <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-zinc-900">
                <PDFCanvas
                    pdfBytes={pdfBytes}
                    pageNumber={currentPage}
                    tool={currentTool}
                    color={color}
                    brushSize={brushSize}
                    zoom={zoom}
                    rotation={rotations[currentPage - 1] || 0}
                    annotations={pageAnnotations[currentPage] || []}
                    onAnnotationAdd={handleAnnotationAdd}
                    onAnnotationEdit={handleAnnotationEdit}
                />
            </div>
        </div>
    );
}
