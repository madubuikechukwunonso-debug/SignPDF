import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
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
    const containerRef = useRef(null);
    const pdfCanvasRef = useRef(null);
    const drawCanvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [scale, setScale] = useState(1);
    const [pdfPage, setPdfPage] = useState(null);

    useImperativeHandle(ref, () => ({
        getAnnotations: () => annotations,
        exportCanvas: () => {
            const canvas = document.createElement('canvas');
            const pdfCanvas = pdfCanvasRef.current;
            const drawCanvas = drawCanvasRef.current;
            
            canvas.width = pdfCanvas.width;
            canvas.height = pdfCanvas.height;
            const ctx = canvas.getContext('2d');
            
            ctx.drawImage(pdfCanvas, 0, 0);
            ctx.drawImage(drawCanvas, 0, 0);
            
            return canvas;
        }
    }));

    // Load and render PDF page
    useEffect(() => {
        if (!pdfBytes || !pageNumber) return;

        const loadPage = async () => {
            const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
            const page = await pdf.getPage(pageNumber);
            setPdfPage(page);

            const viewport = page.getViewport({ scale: 1.5 });
            setScale(1.5);

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

            // Redraw existing annotations
            redrawAnnotations();
        };

        loadPage();
    }, [pdfBytes, pageNumber]);

    // Redraw annotations when they change
    useEffect(() => {
        redrawAnnotations();
    }, [annotations]);

    const redrawAnnotations = () => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        annotations.forEach(annotation => {
            if (annotation.type === 'draw' || annotation.type === 'highlight') {
                ctx.beginPath();
                ctx.strokeStyle = annotation.color;
                ctx.lineWidth = annotation.brushSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                if (annotation.type === 'highlight') {
                    ctx.globalAlpha = 0.3;
                }

                const points = annotation.points;
                if (points.length > 0) {
                    ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        ctx.lineTo(points[i].x, points[i].y);
                    }
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            } else if (annotation.type === 'text') {
                ctx.font = `${annotation.fontSize || 16}px Arial`;
                ctx.fillStyle = annotation.color;
                ctx.fillText(annotation.text, annotation.x, annotation.y);
            } else if (annotation.type === 'eraser') {
                // Eraser creates white strokes
                ctx.beginPath();
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = annotation.brushSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                const points = annotation.points;
                if (points.length > 0) {
                    ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        ctx.lineTo(points[i].x, points[i].y);
                    }
                    ctx.stroke();
                }
            }
        });
    };

    const getCoordinates = (e) => {
        const canvas = drawCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handleMouseDown = (e) => {
        if (tool === 'select') return;
        
        if (tool === 'text') {
            const coords = getCoordinates(e);
            const text = prompt('Enter text:');
            if (text) {
                onAnnotationAdd({
                    type: 'text',
                    text,
                    x: coords.x,
                    y: coords.y,
                    color,
                    fontSize: brushSize * 2
                });
            }
            return;
        }

        setIsDrawing(true);
        const coords = getCoordinates(e);
        setCurrentPath([coords]);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || tool === 'select' || tool === 'text') return;

        const coords = getCoordinates(e);
        const newPath = [...currentPath, coords];
        setCurrentPath(newPath);

        // Draw current stroke
        const ctx = drawCanvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (tool === 'highlight') {
            ctx.globalAlpha = 0.3;
        }

        if (currentPath.length > 0) {
            const lastPoint = currentPath[currentPath.length - 1];
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    };

    const handleMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        if (currentPath.length > 1) {
            onAnnotationAdd({
                type: tool === 'highlight' ? 'highlight' : tool === 'eraser' ? 'eraser' : 'draw',
                points: currentPath,
                color: tool === 'eraser' ? '#FFFFFF' : color,
                brushSize
            });
        }
        setCurrentPath([]);
    };

    const getCursor = () => {
        switch (tool) {
            case 'draw': return 'crosshair';
            case 'highlight': return 'crosshair';
            case 'eraser': return 'crosshair';
            case 'text': return 'text';
            default: return 'default';
        }
    };

    return (
        <div ref={containerRef} className="relative inline-block">
            <canvas
                ref={pdfCanvasRef}
                className="absolute top-0 left-0"
            />
            <canvas
                ref={drawCanvasRef}
                className="relative"
                style={{ cursor: getCursor() }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />
        </div>
    );
});

export default PDFCanvas;
