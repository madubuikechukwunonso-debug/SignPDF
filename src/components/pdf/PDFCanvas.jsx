import React, { useRef, useEffect, useState, forwardRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

const PDFCanvas = forwardRef(({
    pdfBytes, pageNumber, tool, color, brushSize, zoom, rotation,
    annotations, onAnnotationAdd, onAnnotationEdit
}, ref) => {
    const pdfCanvasRef = useRef(null);
    const drawCanvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);

    // Render PDF + annotations
    useEffect(() => {
        if (!pdfBytes || !pageNumber) return;
        const renderPDF = async () => {
            const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: zoom, rotation });

            const pdfCanvas = pdfCanvasRef.current;
            const drawCanvas = drawCanvasRef.current;
            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;
            drawCanvas.width = viewport.width;
            drawCanvas.height = viewport.height;

            await page.render({ canvasContext: pdfCanvas.getContext('2d'), viewport }).promise;
            redrawAnnotations();
        };
        renderPDF();
    }, [pdfBytes, pageNumber, zoom, rotation]);

    const redrawAnnotations = useCallback(() => {
        const ctx = drawCanvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);

        annotations.forEach((ann, idx) => {
            ctx.strokeStyle = ann.color || '#000000';
            ctx.lineWidth = ann.brushSize || brushSize;
            ctx.lineCap = 'round';
            if (ann.type === 'highlight') ctx.globalAlpha = 0.35;

            if (ann.points) {
                ctx.beginPath();
                ctx.moveTo(ann.points[0].x, ann.points[0].y);
                ann.points.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.stroke();
            } else if (ann.type === 'text') {
                ctx.font = `${ann.fontSize || 24}px Arial`;
                ctx.fillStyle = ann.color;
                ctx.fillText(ann.text, ann.x, ann.y);
            }
            ctx.globalAlpha = 1;
        });
    }, [annotations, brushSize]);

    useEffect(() => { redrawAnnotations(); }, [redrawAnnotations]);

    const getCoords = (e) => {
        const rect = drawCanvasRef.current.getBoundingClientRect();
        const scaleX = drawCanvasRef.current.width / rect.width;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleX };
    };

    const handleMouseDown = (e) => {
        const coords = getCoords(e);
        if (tool === 'text') {
            const text = prompt('Enter text to add:') || '';
            if (text) onAnnotationAdd({ type: 'text', text, x: coords.x, y: coords.y, color, fontSize: brushSize * 3 });
            return;
        }
        if (tool === 'select') {
            // Click to edit text
            annotations.forEach((ann, i) => {
                if (ann.type === 'text' && Math.hypot(ann.x - coords.x, ann.y - coords.y) < 50) {
                    const newText = prompt('Edit text:', ann.text);
                    if (newText !== null) onAnnotationEdit(i, newText);
                }
            });
            return;
        }
        setIsDrawing(true);
        setCurrentPath([coords]);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing) return;
        const coords = getCoords(e);
        const newPath = [...currentPath, coords];
        setCurrentPath(newPath);

        const ctx = drawCanvasRef.current.getContext('2d');
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    };

    const handleMouseUp = () => {
        if (!isDrawing || currentPath.length < 2) {
            setIsDrawing(false);
            setCurrentPath([]);
            return;
        }
        onAnnotationAdd({
            type: tool === 'highlight' ? 'highlight' : tool === 'eraser' ? 'eraser' : 'draw',
            points: currentPath,
            color: tool === 'eraser' ? '#ffffff' : color,
            brushSize
        });
        setIsDrawing(false);
        setCurrentPath([]);
    };

    return (
        <div className="relative shadow-2xl border-8 border-gray-400 bg-white overflow-hidden">
            <canvas ref={pdfCanvasRef} className="block" />
            <canvas
                ref={drawCanvasRef}
                className="absolute top-0 left-0 pointer-events-auto"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />
        </div>
    );
});

export default PDFCanvas;
