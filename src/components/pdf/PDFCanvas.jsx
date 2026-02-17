import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

const PDFCanvas = forwardRef(({
    pdfBytes,
    pageNumber,
    tool,
    color,
    brushSize,
    annotations,
    onAnnotationAdd
}, ref) => {
    const pdfCanvasRef = useRef(null);
    const drawCanvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);

    useImperativeHandle(ref, () => ({})); // optional

    // Render PDF page
    useEffect(() => {
        if (!pdfBytes || !pageNumber) return;

        const loadPage = async () => {
            const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1.8 });

            const pdfCanvas = pdfCanvasRef.current;
            const drawCanvas = drawCanvasRef.current;

            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;
            drawCanvas.width = viewport.width;
            drawCanvas.height = viewport.height;

            await page.render({
                canvasContext: pdfCanvas.getContext('2d'),
                viewport
            }).promise;
        };

        loadPage();
    }, [pdfBytes, pageNumber]);

    // Redraw saved annotations
    useEffect(() => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        annotations.forEach(ann => {
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = ann.brushSize || brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (ann.type === 'highlight') ctx.globalAlpha = 0.4;

            if (ann.points && ann.points.length > 1) {
                ctx.beginPath();
                ctx.moveTo(ann.points[0].x, ann.points[0].y);
                for (let i = 1; i < ann.points.length; i++) {
                    ctx.lineTo(ann.points[i].x, ann.points[i].y);
                }
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        });
    }, [annotations, brushSize]);

    const getCoords = (e) => {
        const rect = drawCanvasRef.current.getBoundingClientRect();
        const scaleX = drawCanvasRef.current.width / rect.width;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleX
        };
    };

    const handleMouseDown = (e) => {
        if (tool === 'select') return;
        setIsDrawing(true);
        const coords = getCoords(e);
        setCurrentPath([coords]);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing) return;
        const coords = getCoords(e);
        const newPath = [...currentPath, coords];
        setCurrentPath(newPath);

        const ctx = drawCanvasRef.current.getContext('2d');
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(currentPath[currentPath.length - 1]?.x || coords.x, currentPath[currentPath.length - 1]?.y || coords.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    };

    const handleMouseUp = useCallback(() => {
        if (!isDrawing || currentPath.length < 2) {
            setIsDrawing(false);
            setCurrentPath([]);
            return;
        }

        onAnnotationAdd({
            type: tool,
            points: currentPath,
            color,
            brushSize
        });

        setIsDrawing(false);
        setCurrentPath([]);
    }, [isDrawing, currentPath, tool, color, brushSize, onAnnotationAdd]);

    return (
        <div className="relative inline-block border-4 border-gray-300 shadow-2xl bg-white overflow-hidden">
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
