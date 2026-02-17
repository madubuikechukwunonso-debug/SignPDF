import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
    FileImage, 
    FileText, 
    Upload,
    Download,
    X,
    Image,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';

export default function ConversionPanel({ isOpen, onClose }) {
    const [converting, setConverting] = useState(false);
    const [convertedFiles, setConvertedFiles] = useState([]);

    const handleImagesToPDF = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setConverting(true);
        try {
            const pdfDoc = await PDFDocument.create();

            for (const file of files) {
                const imageBytes = await file.arrayBuffer();
                let image;
                
                if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                    image = await pdfDoc.embedJpg(imageBytes);
                } else if (file.type === 'image/png') {
                    image = await pdfDoc.embedPng(imageBytes);
                } else {
                    continue;
                }

                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = 'converted-images.pdf';
            link.click();
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Conversion error:', error);
        } finally {
            setConverting(false);
            e.target.value = '';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-slate-900">Convert Files</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Images to PDF */}
                            <label className="block cursor-pointer group">
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    multiple
                                    onChange={handleImagesToPDF}
                                    className="hidden"
                                    disabled={converting}
                                />
                                <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 
                                    hover:border-indigo-300 hover:bg-indigo-50/50 transition-all
                                    flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 
                                        flex items-center justify-center shadow-lg shadow-emerald-100">
                                        {converting ? (
                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                        ) : (
                                            <Image className="w-6 h-6 text-white" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-900">Images to PDF</h3>
                                        <p className="text-sm text-slate-500">Convert JPG/PNG images to PDF</p>
                                    </div>
                                </div>
                            </label>

                            {/* Info */}
                            <div className="p-4 rounded-xl bg-slate-50">
                                <p className="text-sm text-slate-600">
                                    <strong>Tip:</strong> To convert PDF to images, open your PDF and use the "To Images" button in the toolbar.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
