// src/components/pdf/PDFCanvas.jsx
// FULL COMPLETE VERSION - ZERO OMISSIONS
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

export default function PDFCanvas({
  pdfBytes,
  pageNumber = 1,
  tool,
  color,
  brushSize,
  zoom = 1.2,
  rotation = 0,
  annotations = [],
  onAnnotationAdd,
  onAnnotationEdit,
}) {
  const pdfCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);

  // Render PDF page
  useEffect(() => {
    if (!pdfBytes || pageNumber < 1) return;

    const renderPDF = async () => {
      try {
        const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: zoom, rotation });

        const pdfCanvas = pdfCanvasRef.current;
        const drawCanvas = drawCanvasRef.current;

        if (!pdfCanvas || !drawCanvas) return;

        pdfCanvas.width = viewport.width;
        pdfCanvas.height = viewport.height;
        drawCanvas.width = viewport.width;
        drawCanvas.height = viewport.height;

        const ctx = pdfCanvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        redrawAnnotations();
      } catch (err) {
        console.error('PDF render error:', err);
      }
    };

    renderPDF();
  }, [pdfBytes, pageNumber, zoom, rotation]);

  const redrawAnnotations = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    annotations.forEach((ann) => {
      ctx.save();
      ctx.strokeStyle = ann.color || color;
      ctx.lineWidth = ann.brushSize || brushSize;
      ctx.lineCap = 'round';

      if (ann.type === 'highlight') ctx.globalAlpha = 0.35;

      if (ann.points && ann.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        ann.points.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (ann.type === 'text') {
        ctx.font = `${ann.fontSize || 24}px Arial`;
        ctx.fillStyle = ann.color || color;
        ctx.fillText(ann.text, ann.x, ann.y);
      }
      ctx.restore();
    });
  }, [annotations, color, brushSize]);

  useEffect(() => {
    redrawAnnotations();
  }, [redrawAnnotations]);

  const getCoords = (e) => {
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const scaleX = drawCanvasRef.current.width / rect.width;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleX,
    };
  };

  const handleMouseDown = (e) => {
    const coords = getCoords(e);

    if (tool === 'text') {
      const text = prompt('Enter text to place:')?.trim();
      if (text) {
        onAnnotationAdd({
          type: 'text',
          text,
          x: coords.x,
          y: coords.y,
          color,
          fontSize: brushSize * 3.5,
        });
      }
      return;
    }

    if (tool === 'select') {
      annotations.forEach((ann, idx) => {
        if (ann.type === 'text' && Math.hypot(ann.x - coords.x, ann.y - coords.y) < 60) {
          const newText = prompt('Edit text:', ann.text);
          if (newText !== null) onAnnotationEdit(idx, newText);
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
    ctx.moveTo(currentPath[currentPath.length - 1]?.x ?? coords.x, currentPath[currentPath.length - 1]?.y ?? coords.y);
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
      brushSize,
    });

    setIsDrawing(false);
    setCurrentPath([]);
  };

  return (
    <div className="relative shadow-2xl border-8 border-gray-600 bg-white mx-auto overflow-hidden">
      <canvas ref={pdfCanvasRef} className="block" />
      <canvas
        ref={drawCanvasRef}
        className="absolute inset-0 pointer-events-auto touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
