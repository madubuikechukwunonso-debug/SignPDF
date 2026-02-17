import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { createPageUrl } from '@/utils';

import PDFCanvas from '@/components/pdf/PDFCanvas';
import EditToolbar from '@/components/pdf/EditToolbar';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function EditPDF() {
    const [pdfBytes, setPdfBytes] = useState(null);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentTool, setCurrentTool] = useState('select');
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(3);
    
    // Annotations per page
    const [pageAnnotations, setPageAnnotations] = useState({});
    const [history, setHistory] = useState([{}]);
    const [historyIndex, setHistoryIndex] = useState(0);
    
    const canvasRef = useRef(null);

    // Load PDF from sessionStorage or file input
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

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        setPdfBytes(bytes);
        sessionStorage.setItem('editPdfBytes', JSON.stringify(Array.from(bytes)));
        loadPdfInfo(bytes);
    };

    // Get current page annotations
    const currentAnnotations = pageAnnotations[currentPage] || [];

    // Add annotation
    const handleAnnotationAdd = useCallback((annotation) => {
        const newAnnotations = {
            ...pageAnnotations,
            [currentPage]: [...(pageAnnotations[currentPage] || []), annotation]
        };
        setPageAnnotations(newAnnotations);
        
        // Save to history
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newAnnotations)));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [pageAnnotations, currentPage, history, historyIndex]);

    // Undo
    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setPageAnnotations(JSON.parse(JSON.stringify(history[historyIndex - 1])));
        }
    };

    // Redo
    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setPageAnnotations(JSON.parse(JSON.stringify(history[historyIndex + 1])));
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                e.preventDefault();
                handleRedo();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [historyIndex, history]);

    // Save PDF with annotations
    const handleSave = async () => {
        if (!pdfBytes) return;

        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        // For each page with annotations, we'll render to canvas and embed as image
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const annotations = pageAnnotations[pageNum] || [];
            if (annotations.length === 0) continue;

            // Create a temporary canvas to render the page with annotations
            const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2 });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            // Render PDF page
            await page.render({
                canvasContext: ctx,
                viewport
            }).promise;

            // Draw annotations
            annotations.forEach(annotation => {
                if (annotation.type === 'draw' || annotation.type === 'highlight' || annotation.type === 'eraser') {
                    ctx.beginPath();
                    ctx.strokeStyle = annotation.color;
                    ctx.lineWidth = annotation.brushSize * (2 / 1.5);
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    
                    if (annotation.type === 'highlight') {
                        ctx.globalAlpha = 0.3;
                    }

                    const points = annotation.points;
                    if (points.length > 0) {
                        ctx.moveTo(points[0].x * (2 / 1.5), points[0].y * (2 / 1.5));
                        for (let i = 1; i < points.length; i++) {
                            ctx.lineTo(points[i].x * (2 / 1.5), points[i].y * (2 / 1.5));
                        }
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1;
                } else if (annotation.type === 'text') {
                    ctx.font = `${(annotation.fontSize || 16) * (2 / 1.5)}px Arial`;
                    ctx.fillStyle = annotation.color;
                    ctx.fillText(annotation.text, annotation.x * (2 / 1.5), annotation.y * (2 / 1.5));
                }
            });

            // Convert canvas to image and embed in PDF
            const imageData = canvas.toDataURL('image/png');
            const imageBytes = await fetch(imageData).then(res => res.arrayBuffer());
            const pngImage = await pdfDoc.embedPng(imageBytes);

            // Replace page content
            const pdfPage = pdfDoc.getPage(pageNum - 1);
            const { width, height } = pdfPage.getSize();
            
            pdfPage.drawRectangle({
                x: 0,
                y: 0,
                width,
                height,
                color: { red: 1, green: 1, blue: 1 }
            });
            
            pdfPage.drawImage(pngImage, {
                x: 0,
                y: 0,
                width,
                height
            });
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
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-slate-800 mb-4">No PDF loaded</h2>
                    <label className="cursor-pointer">
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <div className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
                            Select PDF to Edit
                        </div>
                    </label>
                    <button
                        onClick={handleBack}
                        className="mt-4 block mx-auto text-slate-600 hover:text-slate-800 underline"
                    >
                        Go back to home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <EditToolbar
                currentTool={currentTool}
                onToolChange={setCurrentTool}
                color={color}
                onColorChange={setColor}
                brushSize={brushSize}
                onBrushSizeChange={setBrushSize}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onSave={handleSave}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onBack={handleBack}
            />

            <div className="flex justify-center py-8 px-4">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                    <PDFCanvas
                        ref={canvasRef}
                        pdfBytes={pdfBytes}
                        pageNumber={currentPage}
                        tool={currentTool}
                        color={color}
                        brushSize={brushSize}
                        annotations={currentAnnotations}
                        onAnnotationAdd={handleAnnotationAdd}
                    />
                </div>
            </div>
        </div>
    );
}
