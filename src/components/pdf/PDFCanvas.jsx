import React, { useRef, useEffect, useState, forwardRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

const PDFCanvas = forwardRef(({
    pdfBytes, pageNumber, tool, color, brushSize, zoom, rotation,
    annotations, onAnnotationAdd, onAnnotationEdit
}, ref) => {
    const pdfCanvasRef = useRef(null);
    const drawCanvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);

    useEffect(() => {
        if (!pdfBytes || !pageNumber) return;

        const render = async () => {
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
        render();
    }, [pdfBytes, pageNumber, zoom, rotation]);

    const redrawAnnotations = () => {
        const ctx = drawCanvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);

        annotations.forEach((ann, idx) => {
            ctx.strokeStyle = ann.color || '#000';
            ctx.lineWidth = ann.brushSize || 5;
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
    };

    useEffect(() => { redrawAnnotations(); }, [annotations]);

    const getCoords = (e) => {
        const rect = drawCanvasRef.current.getBoundingClientRect();
        const scaleX = drawCanvasRef.current.width / rect.width;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleX
        };
    };

    const handleMouseDown = (e) => {
        const coords = getCoords(e);

        if (tool === 'text') {
            const text = prompt('Enter text to place:') || '';
            if (text) {
                onAnnotationAdd({ type: 'text', text, x: coords.x, y: coords.y, color, fontSize: brushSize * 3 });
            }
            return;
        }

        if (tool === 'select') {
            // Double-click simulation for edit (real double-click would need timer, this is simple click on text area)
            const anns = annotations;
            for (let i = 0; i < anns.length; i++) {
                const ann = anns[i];
                if (ann.type === 'text' && Math.abs(ann.x - coords.x) < 100 && Math.abs(ann.y - coords.y) < 50) {
                    const newText = prompt('Edit text:', ann.text);
                    if (newText !== null) onAnnotationEdit(i, newText);
                    return;
                }
            }
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
        ctx.strokeStyle = tool === 'eraser' ? '#fff' : color;
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
            color: tool === 'eraser' ? '#fff' : color,
            brushSize
        });
        setIsDrawing(false);
        setCurrentPath([]);
    };

    return (
        <div className="relative shadow-2xl border-4 border-gray-300 bg-white">
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
