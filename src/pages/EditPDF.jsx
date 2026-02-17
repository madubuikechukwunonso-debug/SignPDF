import React, { useState, useEffect, useCallback } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { createPageUrl } from '@/utils';

import PDFCanvas from '@/components/pdf/PDFCanvas';
import EditToolbar from '@/components/pdf/EditToolbar';

// Reliable CDN worker (always works)
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

    // Load PDF
    useEffect(() => {
        const stored = sessionStorage.getItem('editPdfBytes');
        if (stored) {
            const bytes = new Uint8Array(JSON.parse(stored));
            setPdfBytes(bytes);
            loadPdfDocument(bytes);
        }
    }, []);

    const loadPdfDocument = async (bytes) => {
        try {
            const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
            setTotalPages(pdf.numPages);
            setRotations(new Array(pdf.numPages).fill(0));
        } catch (e) {
            console.error("Failed to load PDF:", e);
            alert("Failed to load PDF document");
        }
    };

    const updatePdfBytes = async (newBytes) => {
        setPdfBytes(newBytes);
        sessionStorage.setItem('editPdfBytes', JSON.stringify(Array.from(newBytes)));
        await loadPdfDocument(newBytes);
    };

    // Page operations
    const handleRotatePage = async (direction) => {
        const delta = direction === 'left' ? -90 : 90;
        const newRot = (rotations[currentPage - 1] + delta + 360) % 360;
        const newRotations = [...rotations];
        newRotations[currentPage - 1] = newRot;
        setRotations(newRotations);

        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfDoc.getPage(currentPage - 1).setRotation(degrees(newRot));
        const newBytes = await pdfDoc.save();
        await updatePdfBytes(newBytes);
    };

    const handleAddBlankPage = async () => {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfDoc.addPage([595, 842]); // A4
        const newBytes = await pdfDoc.save();
        await updatePdfBytes(newBytes);
        setCurrentPage(totalPages + 1);
    };

    const handleDeleteCurrentPage = async () => {
        if (totalPages <= 1) return alert("Cannot delete the last page");
        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfDoc.removePage(currentPage - 1);
        const newBytes = await pdfDoc.save();
        await updatePdfBytes(newBytes);
        setCurrentPage(Math.max(1, currentPage - 1));
    };

    const handleZoom = (delta) => setZoom(z => Math.max(0.5, Math.min(3, z + delta)));

    // Annotations
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
        if (anns[index] && anns[index].type === 'text') {
            anns[index].text = newText;
            const newAnn = { ...pageAnnotations, [currentPage]: anns };
            setPageAnnotations(newAnn);
            // update history
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(JSON.parse(JSON.stringify(newAnn)));
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(i => i - 1);
            setPageAnnotations(JSON.parse(JSON.stringify(history[historyIndex - 1])));
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(i => i + 1);
            setPageAnnotations(JSON.parse(JSON.stringify(history[historyIndex + 1])));
        }
    };

    const handleSave = async () => {
        if (!pdfBytes) return alert("No PDF loaded");
        try {
            const pdfDoc = await PDFDocument.load(pdfBytes);

            for (let i = 1; i <= totalPages; i++) {
                const anns = pageAnnotations[i] || [];
                if (anns.length === 0) continue;

                const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2, rotation: rotations[i - 1] || 0 });

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;

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
            a.href = url; a.download = 'edited-document.pdf'; a.click();
            URL.revokeObjectURL(url);
            alert("✅ PDF saved successfully!");
        } catch (e) {
            console.error(e);
            alert("Save failed: " + e.message);
        }
    };

    const handleBack = () => window.location.href = createPageUrl('Home');

    if (!pdfBytes) {
        return <div className="h-screen flex items-center justify-center bg-zinc-950 text-white text-3xl">No PDF loaded. Go back to Home.</div>;
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-zinc-950 text-white">
            <EditToolbar
                currentTool={currentTool} onToolChange={setCurrentTool}
                color={color} onColorChange={setColor}
                brushSize={brushSize} onBrushSizeChange={setBrushSize}
                zoom={zoom} onZoomChange={handleZoom}
                currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}
                onRotate={handleRotatePage} onAddBlank={handleAddBlankPage} onDelete={handleDeleteCurrentPage}
                canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1}
                onUndo={handleUndo} onRedo={handleRedo} onSave={handleSave} onBack={handleBack}
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
