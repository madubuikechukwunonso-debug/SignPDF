// src/components/pdf/PDFCanvas.jsx
// FULL LATEST VERSION - ZERO OMISSIONS - Click-to-type text + font + whiteout + rotation support
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

export default function PDFCanvas({
  pdfBytes,
  pageNumber = 1,
  tool,
  color,
  brushSize,
  zoom = 1.0,
  rotation = 0,
  annotations = [],
  onAnnotationAdd,
  onAnnotationEdit,
  currentFont = 'Arial'
}) {
  const pdfCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [activeText, setActiveText] = useState(null); // {x, y, text}

  // Render PDF with rotation support
  useEffect(() => {
    if (!pdfBytes || pageNumber < 1) return;

    const render = async () => {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: zoom, rotation }); // ← rotation applied here

      const pdfCanvas = pdfCanvasRef.current;
      const drawCanvas = drawCanvasRef.current;

      if (!pdfCanvas || !drawCanvas) return;

      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;
      drawCanvas.width = viewport.width;
      drawCanvas.height = viewport.height;

      await page.render({ canvasContext: pdfCanvas.getContext('2d'), viewport }).promise;
      redrawAnnotations();
    };
    render();
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
      if (ann.type === 'whiteout') ctx.fillStyle = '#ffffff';

      if (ann.points && ann.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        ann.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (ann.type === 'text') {
        ctx.font = `${ann.fontSize || 28}px ${ann.font || currentFont}`;
        ctx.fillStyle = ann.color;
        ctx.fillText(ann.text, ann.x, ann.y);
      } else if (ann.type === 'whiteout') {
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      }
      ctx.restore();
    });
  }, [annotations, color, brushSize, currentFont]);

  useEffect(() => {
    redrawAnnotations();
  }, [redrawAnnotations]);

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
      setActiveText({ x: coords.x, y: coords.y, text: '' });
      return;
    }

    if (tool === 'whiteout') {
      onAnnotationAdd({
        type: 'whiteout',
        x: coords.x - 40,
        y: coords.y - 15,
        width: 80,
        height: 30
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
      brushSize
    });
    setIsDrawing(false);
    setCurrentPath([]);
  };

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter' && activeText && activeText.text.trim()) {
      onAnnotationAdd({
        type: 'text',
        text: activeText.text.trim(),
        x: activeText.x,
        y: activeText.y,
        color,
        fontSize: 28,
        font: currentFont
      });
      setActiveText(null);
    }
  };

  return (
    <div className="relative shadow-2xl border-8 border-gray-600 bg-white overflow-hidden">
      <canvas ref={pdfCanvasRef} className="block" />
      <canvas
        ref={drawCanvasRef}
        className="absolute inset-0 pointer-events-auto"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Live Text Input - appears exactly where clicked */}
      {activeText && (
        <input
          type="text"
          autoFocus
          value={activeText.text}
          onChange={(e) => setActiveText({ ...activeText, text: e.target.value })}
          onKeyDown={handleTextKeyDown}
          onBlur={() => setActiveText(null)}
          style={{
            position: 'absolute',
            left: `${activeText.x / zoom}px`,
            top: `${activeText.y / zoom}px`,
            fontSize: '28px',
            fontFamily: currentFont,
            border: '2px solid #3b82f6',
            background: 'white',
            padding: '4px 8px',
            zIndex: 100,
            outline: 'none',
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.3)'
          }}
        />
      )}
    </div>
  );
}
