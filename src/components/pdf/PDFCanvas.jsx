import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

export default function PDFCanvas({
  pdfBytes, pageNumber, tool, color, brushSize, zoom, rotation,
  annotations, onAnnotationAdd, onAnnotationEdit
}) {
  const pdfCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [activeText, setActiveText] = useState(null); // {x, y, text}

  // Render PDF + zoom with CSS scale
  useEffect(() => {
    if (!pdfBytes || !pageNumber) return;
    const render = async () => {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
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

  const redrawAnnotations = useCallback(() => {
    const ctx = drawCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);

    annotations.forEach(ann => {
      ctx.save();
      ctx.strokeStyle = ann.color || color;
      ctx.lineWidth = ann.brushSize || brushSize;
      ctx.lineCap = 'round';

      if (ann.type === 'highlight') ctx.globalAlpha = 0.35;
      if (ann.type === 'whiteout') ctx.fillStyle = '#ffffff';

      if (ann.points) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        ann.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (ann.type === 'text') {
        ctx.font = `${ann.fontSize || 24}px Arial`;
        ctx.fillStyle = ann.color;
        ctx.fillText(ann.text, ann.x, ann.y);
      } else if (ann.type === 'whiteout') {
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      }
      ctx.restore();
    });
  }, [annotations, color, brushSize]);

  useEffect(() => redrawAnnotations(), [redrawAnnotations]);

  const getCoords = (e) => {
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const scaleX = drawCanvasRef.current.width / rect.width;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleX };
  };

  const handleMouseDown = (e) => {
    const coords = getCoords(e);

    if (tool === 'text') {
      setActiveText({ x: coords.x, y: coords.y, text: '' });
      return;
    }

    if (tool === 'whiteout') {
      onAnnotationAdd({ type: 'whiteout', x: coords.x - 30, y: coords.y - 15, width: 60, height: 30 });
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
      type: tool,
      points: currentPath,
      color: tool === 'eraser' ? '#fff' : color,
      brushSize
    });
    setIsDrawing(false);
    setCurrentPath([]);
  };

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter' && activeText) {
      onAnnotationAdd({
        type: 'text',
        text: activeText.text,
        x: activeText.x,
        y: activeText.y,
        color,
        fontSize: 24
      });
      setActiveText(null);
    }
  };

  return (
    <div ref={containerRef} className="relative shadow-2xl border-8 border-gray-600 bg-white overflow-hidden" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
      <canvas ref={pdfCanvasRef} className="block" />
      <canvas
        ref={drawCanvasRef}
        className="absolute inset-0 pointer-events-auto"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Live text input */}
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
            left: activeText.x / zoom + 'px',
            top: activeText.y / zoom + 'px',
            fontSize: '24px',
            border: '2px solid #3b82f6',
            background: 'white',
            padding: '4px 8px',
            zIndex: 100
          }}
        />
      )}
    </div>
  );
}
