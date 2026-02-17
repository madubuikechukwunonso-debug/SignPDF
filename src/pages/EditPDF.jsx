// src/pages/EditPDF.jsx
// FULLY FIXED & COMPLETE VERSION (Feb 2026)
// Fixes:
// - Correct sessionStorage loading (Uint8Array from JSON array)
// - PDF always renders (reliable CDN worker + debug logs)
// - Toolbar auto-hides / shows when mouse moves to top
// - Add blank page, delete, rotate, zoom, undo/redo, text editing all work
// - Save bakes everything correctly into final PDF

import React, { useState, useEffect, useCallback } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { createPageUrl } from '@/utils';

import PDFCanvas from '@/components/pdf/PDFCanvas';
import EditToolbar from '@/components/pdf/EditToolbar';

// ✅ Most reliable worker CDN in 2026
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

  // ==================== LOAD PDF FROM SESSION STORAGE ====================
  useEffect(() => {
    const stored = sessionStorage.getItem('editPdfBytes');
    if (!stored) {
      console.warn('❌ No PDF found in sessionStorage');
      return;
    }

    try {
      const bytesArray = JSON.parse(stored);
      const uint8Array = new Uint8Array(bytesArray);
      console.log(`✅ Loaded PDF from storage - ${uint8Array.length} bytes`);

      setPdfBytes(uint8Array);
      loadPdfInfo(uint8Array);
    } catch (err) {
      console.error('❌ Failed to parse stored PDF:', err);
      alert('Stored PDF data is corrupted. Please upload again.');
      sessionStorage.removeItem('editPdfBytes');
    }
  }, []);

  const loadPdfInfo = async (bytes) => {
    try {
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      console.log(`✅ PDF loaded successfully - ${pdf.numPages} pages`);
      setTotalPages(pdf.numPages);
      setRotations(new Array(pdf.numPages).fill(0));
    } catch (err) {
      console.error('❌ PDF.js load error:', err);
      alert('Could not parse PDF file. Try a different PDF.');
    }
  };

  // ==================== UPDATE PDF & RELOAD ====================
  const updatePdf = async (newBytes) => {
    setPdfBytes(newBytes);
    sessionStorage.setItem('editPdfBytes', JSON.stringify(Array.from(newBytes)));
    await loadPdfInfo(newBytes);
  };

  // ==================== PAGE OPERATIONS ====================
  const handleAddBlankPage = async () => {
    if (!pdfBytes) return;
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      pdfDoc.addPage([595, 842]); // A4
      const newBytes = await pdfDoc.save();
      await updatePdf(newBytes);
      setCurrentPage(totalPages + 1);
      console.log('✅ Added blank page');
    } catch (err) {
      console.error('Add page error:', err);
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
      console.log('✅ Deleted current page');
    } catch (err) {
      console.error('Delete page error:', err);
    }
  };

  const handleRotatePage = async (direction) => {
    if (!pdfBytes) return;
    const delta = direction === 'left' ? -90 : 90;
    const newRot = (rotations[currentPage - 1] + delta + 360) % 360;
    const newRotations = [...rotations];
    newRotations[currentPage - 1] = newRot;
    setRotations(newRotations);

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      pdfDoc.getPage(currentPage - 1).setRotation(degrees(newRot));
      const newBytes = await pdfDoc.save();
      await updatePdf(newBytes);
      console.log('✅ Rotated page');
    } catch (err) {
      console.error('Rotate error:', err);
    }
  };

  const handleZoom = (delta) => {
    setZoom((z) => Math.max(0.5, Math.min(3, z + delta)));
  };

  // ==================== ANNOTATIONS ====================
  const handleAnnotationAdd = useCallback((annotation) => {
    const newPageAnns = [...(pageAnnotations[currentPage] || []), annotation];
    const newAnnotations = { ...pageAnnotations, [currentPage]: newPageAnns };

    setPageAnnotations(newAnnotations);

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [pageAnnotations, currentPage, history, historyIndex]);

  const handleAnnotationEdit = (index, newText) => {
    const anns = [...(pageAnnotations[currentPage] || [])];
    if (anns[index]?.type === 'text') {
      anns[index].text = newText;
      const newAnnotations = { ...pageAnnotations, [currentPage]: anns };
      setPageAnnotations(newAnnotations);

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newAnnotations);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
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

  // ==================== SAVE PDF ====================
  const handleSave = async () => {
    if (!pdfBytes) return alert('No PDF to save');
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);

      for (let i = 1; i <= totalPages; i++) {
        const anns = pageAnnotations[i] || [];
        if (anns.length === 0) continue;

        const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2, rotation: rotations[i - 1] || 0 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        anns.forEach((ann) => {
          ctx.save();
          ctx.strokeStyle = ann.color || '#000000';
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

        const pngBytes = await fetch(canvas.toDataURL('image/png')).then((r) => r.arrayBuffer());
        const pngImage = await pdfDoc.embedPng(pngBytes);
        const pdfPage = pdfDoc.getPage(i - 1);
        const { width, height } = pdfPage.getSize();
        pdfPage.drawImage(pngImage, { x: 0, y: 0, width, height });
      }

      const finalBytes = await pdfDoc.save();
      const blob = new Blob([finalBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'edited-document.pdf';
      link.click();
      URL.revokeObjectURL(url);
      alert('✅ PDF saved successfully!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Save failed – check console (F12)');
    }
  };

  const handleBack = () => {
    window.location.href = createPageUrl('Home');
  };

  // ==================== TOOLBAR AUTO-SHOW ====================
  const handleMouseMove = (e) => {
    setShowToolbar(e.clientY < 80);
  };

  if (!pdfBytes) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950 text-white text-3xl font-medium">
        No PDF loaded — go back to Home
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col bg-zinc-950 overflow-hidden relative"
      onMouseMove={handleMouseMove}
    >
      {/* Fixed Auto-Hide Toolbar */}
      <div
        className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ${
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
          onZoomIn={() => handleZoom(0.2)}
          onZoomOut={() => handleZoom(-0.2)}
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
          onBack={handleBack}
        />
      </div>

      {/* PDF Viewer Area */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-6 pt-24 bg-zinc-900">
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
