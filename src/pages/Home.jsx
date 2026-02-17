import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { FileStack, Sparkles, ArrowRight, Pencil } from 'lucide-react';
import { createPageUrl } from '@/utils';

import PDFUploader from '@/components/pdf/PDFUploader';
import PageThumbnail from '@/components/pdf/PageThumbnail';
import Toolbar from '@/components/pdf/Toolbar';
import ConversionPanel from '@/components/pdf/ConversionPanel';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

export default function Home() {
    const [pages, setPages] = useState([]);
    const [selectedPages, setSelectedPages] = useState(new Set());
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showConversion, setShowConversion] = useState(false);
    const [pdfBytes, setPdfBytes] = useState(null);
    const fileInputRef = useRef(null);

    // Save state to history
    const saveToHistory = useCallback((newPages) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newPages)));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    // Store PDF for edit page
    const storePdfForEdit = (bytes) => {
        sessionStorage.setItem('editPdfBytes', JSON.stringify(Array.from(bytes)));
    };

    // Load PDF and generate thumbnails
    const loadPDF = async (file) => {
        setIsLoading(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            setPdfBytes(bytes);
            storePdfForEdit(bytes);
            
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const pageCount = pdf.numPages;
            
            const newPages = [];
            for (let i = 1; i <= pageCount; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.5 });
                
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                await page.render({
                    canvasContext: canvas.getContext('2d'),
                    viewport
                }).promise;
                
                newPages.push({
                    id: `page-${i}-${Date.now()}`,
                    pageNumber: i,
                    thumbnail: canvas.toDataURL('image/jpeg', 0.8),
                    rotation: 0
                });
            }
            
            setPages(newPages);
            saveToHistory(newPages);
            setSelectedPages(new Set());
        } catch (error) {
            console.error('Error loading PDF:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Add pages from another PDF
    const addPages = async (file) => {
        setIsProcessing(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const pageCount = pdf.numPages;
            
            const newPages = [...pages];
            for (let i = 1; i <= pageCount; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.5 });
                
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                await page.render({
                    canvasContext: canvas.getContext('2d'),
                    viewport
                }).promise;
                
                newPages.push({
                    id: `page-${i}-${Date.now()}-${Math.random()}`,
                    pageNumber: i,
                    thumbnail: canvas.toDataURL('image/jpeg', 0.8),
                    rotation: 0,
                    sourceBytes: new Uint8Array(arrayBuffer),
                    sourcePageNumber: i
                });
            }
            
            setPages(newPages);
            saveToHistory(newPages);
        } catch (error) {
            console.error('Error adding pages:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle drag end
    const handleDragEnd = (result) => {
        if (!result.destination) return;
        
        const items = Array.from(pages);
        const [reordered] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reordered);
        
        setPages(items);
        saveToHistory(items);
    };

    // Select/deselect page
    const handlePageSelect = (index) => {
        const newSelected = new Set(selectedPages);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedPages(newSelected);
    };

    // Delete page
    const handleDeletePage = (index) => {
        const newPages = pages.filter((_, i) => i !== index);
        setPages(newPages);
        saveToHistory(newPages);
        
        const newSelected = new Set();
        selectedPages.forEach(i => {
            if (i < index) newSelected.add(i);
            else if (i > index) newSelected.add(i - 1);
        });
        setSelectedPages(newSelected);
    };

    // Delete selected pages
    const handleDeleteSelected = () => {
        const newPages = pages.filter((_, i) => !selectedPages.has(i));
        setPages(newPages);
        saveToHistory(newPages);
        setSelectedPages(new Set());
    };

    // Rotate selected pages
    const handleRotate = () => {
        const newPages = pages.map((page, i) => {
            if (selectedPages.has(i)) {
                return { ...page, rotation: (page.rotation + 90) % 360 };
            }
            return page;
        });
        setPages(newPages);
        saveToHistory(newPages);
    };

    // Undo
    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setPages(JSON.parse(JSON.stringify(history[historyIndex - 1])));
            setSelectedPages(new Set());
        }
    };

    // Redo
    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setPages(JSON.parse(JSON.stringify(history[historyIndex + 1])));
            setSelectedPages(new Set());
        }
    };

    // Download PDF
    const handleDownload = async () => {
        setIsProcessing(true);
        try {
            const newPdf = await PDFDocument.create();
            
            // Load original PDF
            const originalPdf = await PDFDocument.load(pdfBytes);
            
            for (const page of pages) {
                let sourcePdf = originalPdf;
                let sourcePageIndex = page.pageNumber - 1;
                
                // If page came from a different PDF
                if (page.sourceBytes) {
                    sourcePdf = await PDFDocument.load(page.sourceBytes);
                    sourcePageIndex = page.sourcePageNumber - 1;
                }
                
                const [copiedPage] = await newPdf.copyPages(sourcePdf, [sourcePageIndex]);
                
                // Apply rotation
                if (page.rotation) {
                    copiedPage.setRotation(degrees(page.rotation));
                }
                
                newPdf.addPage(copiedPage);
            }
            
            const pdfBytesOutput = await newPdf.save();
            const blob = new Blob([pdfBytesOutput], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = 'edited-document.pdf';
            link.click();
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error saving PDF:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Convert to images
    const handleConvertToImages = async () => {
        setIsProcessing(true);
        try {
            const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2 });
                
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                await page.render({
                    canvasContext: canvas.getContext('2d'),
                    viewport
                }).promise;
                
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = `page-${i}.png`;
                link.click();
                
                await new Promise(r => setTimeout(r, 100));
            }
        } catch (error) {
            console.error('Error converting to images:', error);
        } finally {
            setIsProcessing(false);
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 
                                flex items-center justify-center shadow-lg shadow-indigo-200">
                                <FileStack className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">PDF Studio</h1>
                                <p className="text-xs text-slate-500">Edit, rearrange & convert</p>
                            </div>
                        </div>
                        
                        {pages.length === 0 && (
                            <Button
                                variant="outline"
                                onClick={() => setShowConversion(true)}
                                className="rounded-xl gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                Convert Files
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            {pages.length === 0 ? (
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <PDFUploader onFileSelect={loadPDF} isLoading={isLoading} />
                    
                    {/* Features */}
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                        {[
                            { title: 'Rearrange Pages', desc: 'Drag and drop to reorder' },
                            { title: 'Undo & Redo', desc: 'Never lose your changes' },
                            { title: 'Convert Files', desc: 'PDF ↔ Images supported' }
                        ].map((feature, i) => (
                            <div key={i} className="text-center p-4">
                                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                                    <ArrowRight className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h3 className="font-medium text-slate-900">{feature.title}</h3>
                                <p className="text-sm text-slate-500 mt-1">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    <Toolbar
                        canUndo={historyIndex > 0}
                        canRedo={historyIndex < history.length - 1}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        onDownload={handleDownload}
                        onRotate={handleRotate}
                        onDeleteSelected={handleDeleteSelected}
                        onAddPages={addPages}
                        hasSelection={selectedPages.size > 0}
                        isProcessing={isProcessing}
                        onConvertToImages={handleConvertToImages}
                        pageCount={pages.length}
                        onEditMode={() => window.location.href = createPageUrl('EditPDF')}
                    />
                    
                    <div className="max-w-7xl mx-auto px-4 py-8">
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="pages" direction="horizontal">
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                                    >
                                        <AnimatePresence>
                                            {pages.map((page, index) => (
                                                <Draggable 
                                                    key={page.id} 
                                                    draggableId={page.id} 
                                                    index={index}
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                                transform: provided.draggableProps.style?.transform
                                                                    ? `${provided.draggableProps.style.transform} rotate(${page.rotation}deg)`
                                                                    : `rotate(${page.rotation}deg)`
                                                            }}
                                                        >
                                                            <PageThumbnail
                                                                page={page}
                                                                index={index}
                                                                isSelected={selectedPages.has(index)}
                                                                onSelect={handlePageSelect}
                                                                onDelete={handleDeletePage}
                                                                dragHandleProps={provided.dragHandleProps}
                                                                isDragging={snapshot.isDragging}
                                                            />
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                        </AnimatePresence>
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>
                </>
            )}

            {/* Conversion Panel */}
            <ConversionPanel 
                isOpen={showConversion} 
                onClose={() => setShowConversion(false)} 
            />
        </div>
    );
}
