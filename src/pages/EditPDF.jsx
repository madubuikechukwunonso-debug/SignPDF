import React, { useState, useEffect, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { createPageUrl } from '@/utils';

import PDFCanvas from '@/components/pdf/PDFCanvas';
import EditToolbar from '@/components/pdf/EditToolbar';

// Reliable PDF.js worker (no CDN)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

export default function EditPDF() {
    const [pdfBytes, setPdfBytes] = useState(null);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentTool, setCurrentTool] = useState('draw');
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);

    const [pageAnnotations, setPageAnnotations] = useState({});
    const [history, setHistory] = useState([{}]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Load PDF from sessionStorage
    useEffect(() => {
        const storedPdf = sessionStorage.getItem('editPdfBytes');
        if (storedPdf) {
            const bytes = new Uint8Array(JSON.parse(storedPdf));
            setPdfBytes(bytes);
            loadPdfInfo(bytes);
        }
    }, []);

    const loadPdfInfo = async (bytes) => {
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        setTotalPages(pdf.numPages);
    };

    const handleAnnotationAdd = useCallback((annotation) => {
        const newAnnotations = {
            ...pageAnnotations,
            [currentPage]: [...(pageAnnotations[currentPage] || []), annotation]
        };
        setPageAnnotations(newAnnotations);

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newAnnotations)));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [pageAnnotations, currentPage, history, historyIndex]);

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

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const annotations = pageAnnotations[pageNum] || [];
            if (annotations.length === 0) continue;

            const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2 });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            await page.render({ canvasContext: ctx, viewport }).promise;

            // Draw annotations on canvas
            annotations.forEach(ann => {
                ctx.strokeStyle = ann.color;
                ctx.lineWidth = ann.brushSize || 5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (ann.type === 'highlight') ctx.globalAlpha = 0.4;

                if (ann.points && ann.points.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(ann.points[0].x * (2 / 1.5), ann.points[0].y * (2 / 1.5));
                    for (let i = 1; i < ann.points.length; i++) {
                        ctx.lineTo(ann.points[i].x * (2 / 1.5), ann.points[i].y * (2 / 1.5));
                    }
                    ctx.stroke();
                } else if (ann.type === 'text') {
                    ctx.font = `${(ann.fontSize || 20) * (2 / 1.5)}px Arial`;
                    ctx.fillStyle = ann.color;
                    ctx.fillText(ann.text, ann.x * (2 / 1.5), ann.y * (2 / 1.5));
                }
                ctx.globalAlpha = 1;
            });

            const imageData = canvas.toDataURL('image/png');
            const imageBytes = await fetch(imageData).then(r => r.arrayBuffer());
            const pngImage = await pdfDoc.embedPng(imageBytes);

            const pdfPage = pdfDoc.getPage(pageNum - 1);
            const { width, height } = pdfPage.getSize();

            pdfPage.drawRectangle({ x: 0, y: 0, width, height, color: { red: 1, green: 1, blue: 1 } });
            pdfPage.drawImage(pngImage, { x: 0, y: 0, width, height });
        }

        const savedBytes = await pdfDoc.save();
        const blob = new Blob([savedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'edited-document.pdf';
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleBack = () => {
        window.location.href = createPageUrl('Home');
    };

    if (!pdfBytes) {
        return (
            <div className="h-screen flex items-center justify-center bg-zinc-950 text-white">
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-6">No PDF Loaded</h2>
                    <button
                        onClick={handleBack}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-lg font-medium"
                    >
                        ← Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-zinc-950">
            <EditToolbar
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onSave={handleSave}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onBack={handleBack}
                currentTool={currentTool}
                color={color}
                brushSize={brushSize}
                onToolChange={setCurrentTool}
                onColorChange={setColor}
                onBrushSizeChange={setBrushSize}
            />

            <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-zinc-900">
                <PDFCanvas
                    pdfBytes={pdfBytes}
                    pageNumber={currentPage}
                    tool={currentTool}
                    color={color}
                    brushSize={brushSize}
                    annotations={pageAnnotations[currentPage] || []}
                    onAnnotationAdd={handleAnnotationAdd}
                />
            </div>
        </div>
    );
}
