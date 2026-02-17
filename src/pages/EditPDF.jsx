// src/pages/EditPDF.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { PDFDocument, degrees, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { createPageUrl } from '@/utils';

import PDFCanvas from '@/components/pdf/PDFCanvas';
import EditToolbar from '@/components/pdf/EditToolbar';

// Modern reliable worker (2025+ compatible - uses esm + minified)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs';

export default function EditPDF() {
  const [pdfBytes, setPdfBytes] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTool, setCurrentTool] = useState('draw');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [zoom, setZoom] = useState(1.2);
  const [rotations, setRotations] = useState([]);
  const [pageAnnotations, setPageAnnotations] = useState({});
  const [history, setHistory] = useState([{}]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showToolbar, setShowToolbar] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('editPdfBytes');
    if (stored) {
      try {
        const bytes = new Uint8Array(JSON.parse(stored));
        setPdfBytes(bytes);
        loadPdfInfo(bytes);
      } catch (err) {
        console.error('Invalid stored PDF', err);
      }
    }
  }, []);

  const loadPdfInfo = async (bytes) => {
    try {
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      setTotalPages(pdf.numPages);
      setRotations((prev) => {
        const arr = new Array(pdf.numPages).fill(0);
        prev.forEach((r, i) => { if (i < arr.length) arr[i] = r; });
        return arr;
      });
    } catch (err) {
      console.error('PDF load failed:', err);
      alert('Failed to load PDF – please try uploading again');
    }
  };

  const updatePdf = async (newBytes) => {
    setPdfBytes(newBytes);
    sessionStorage.setItem('editPdfBytes', JSON.stringify(Array.from(newBytes)));
    await loadPdfInfo(newBytes);
  };

  const handleAddBlankPage = async () => {
    if (!pdfBytes) return;
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      pdfDoc.addPage([595, 842]); // A4
      const newBytes = await pdfDoc.save();
      await updatePdf(newBytes);
      setCurrentPage(totalPages + 1);
    } catch (err) {
      console.error('Add blank page failed:', err);
    }
  };

  const handleDeleteCurrentPage = async () => {
    if (totalPages <= 1 || !pdfBytes) return alert("Cannot delete the last page");
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      pdfDoc.removePage(currentPage - 1);
      const newBytes = await pdfDoc.save();
      await updatePdf(newBytes);
      setCurrentPage(Math.max(1, currentPage - 1));
    } catch (err) {
      console.error('Delete page failed:', err);
    }
  };

  const handleRotatePage = async (dir) => {
    if (!pdfBytes) return;
    const delta = dir === 'left' ? -90 : 90;
    const newRot = (rotations[currentPage - 1] + delta + 360) % 360;
    const newRots = [...rotations];
    newRots[currentPage - 1] = newRot;
    setRotations(newRots);

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      pdfDoc.getPage(currentPage - 1).setRotation(degrees(newRot));
      const newBytes = await pdfDoc.save();
      await updatePdf(newBytes);
    } catch (err) {
      console.error('Rotate failed:', err);
    }
  };

  const handleAnnotationAdd = useCallback((ann) => {
    const pageAnns = [...(pageAnnotations[currentPage] || []), ann];
    const newAnns = { ...pageAnnotations, [currentPage]: pageAnns };
    setPageAnnotations(newAnns);

    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(newAnns);
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
  }, [pageAnnotations, currentPage, history, historyIndex]);

  const handleAnnotationEdit = (idx, newText) => {
    const anns = [...(pageAnnotations[currentPage] || [])];
    if (anns[idx]?.type === 'text') {
      anns[idx].text = newText;
      const newAnns = { ...pageAnnotations, [currentPage]: anns };
      setPageAnnotations(newAnns);

      const newHist = history.slice(0, historyIndex + 1);
      newHist.push(newAnns);
      setHistory(newHist);
      setHistoryIndex(newHist.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    setHistoryIndex(historyIndex - 1);
    setPageAnnotations(history[historyIndex - 1]);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    setHistoryIndex(historyIndex + 1);
    setPageAnnotations(history[historyIndex + 1]);
  };

  const handleSave = async () => {
    if (!pdfBytes) return alert('No PDF to save');
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);

      for (let pg = 1; pg <= totalPages; pg++) {
        const anns = pageAnnotations[pg] || [];
        if (anns.length === 0) continue;

        const srcPdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
        const page = await srcPdf.getPage(pg);
        const vp = page.getViewport({ scale: 2, rotation: rotations[pg - 1] || 0 });

        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        anns.forEach((ann) => {
          ctx.save();
          ctx.strokeStyle = ann.color || '#000';
          ctx.lineWidth = (ann.brushSize || 5) * (2 / 1.5);
          ctx.lineCap = 'round';
          if (ann.type === 'highlight') ctx.globalAlpha = 0.35;

          if (ann.points) {
            ctx.beginPath();
            ctx.moveTo(ann.points[0].x * (2 / 1.5), ann.points[0].y * (2 / 1.5));
            ann.points.forEach((p) => ctx.lineTo(p.x * (2 / 1.5), p.y * (2 / 1.5)));
            ctx.stroke();
          } else if (ann.type === 'text') {
            ctx.font = `${(ann.fontSize || 24) * (2 / 1.5)}px Arial`;
            ctx.fillStyle = ann.color;
            ctx.fillText(ann.text, ann.x * (2 / 1.5), ann.y * (2 / 1.5));
          }
          ctx.restore();
        });

        const pngData = canvas.toDataURL('image/png');
        const pngBytes = await fetch(pngData).then((r) => r.arrayBuffer());
        const img = await pdfDoc.embedPng(pngBytes);

        const pdfPage = pdfDoc.getPage(pg - 1);
        const { width, height } = pdfPage.getSize();
        pdfPage.drawImage(img, { x: 0, y: 0, width, height });
      }

      const saved = await pdfDoc.save();
      const blob = new Blob([saved], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'signed_edited.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Save failed – check console for details');
    }
  };

  const handleMouseMove = (e) => {
    setShowToolbar(e.clientY < 80);
  };

  if (!pdfBytes) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-900 text-white text-2xl">
        No PDF loaded — return to Home
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden relative" onMouseMove={handleMouseMove}>
      <div
        className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-in-out ${
          showToolbar ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <EditToolbar
          currentTool={currentTool}
          onToolChange={setCurrentTool}
          color={color}
          onColorChange={setColor}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          zoom={zoom}
          onZoomIn={() => setZoom((z) => Math.min(3, z + 0.2))}
          onZoomOut={() => setZoom((z) => Math.max(0.5, z - 0.2))}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onRotateLeft={() => handleRotatePage('left')}
          onRotateRight={() => handleRotatePage('right')}
          onAddBlank={handleAddBlankPage}
          onDelete={handleDeleteCurrentPage}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSave={handleSave}
          onBack={() => (window.location.href = createPageUrl('Home'))}
        />
      </div>

      <div className="flex-1 flex items-center justify-center overflow-auto p-6 pt-24">
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
