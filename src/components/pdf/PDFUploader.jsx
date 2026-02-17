import React, { useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PDFUploader({ onFileSelect, isLoading }) {
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            onFileSelect(file);
        }
    }, [onFileSelect]);

    const handleChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onFileSelect(file);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh]"
        >
            <label
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="relative cursor-pointer group"
            >
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleChange}
                    className="hidden"
                    disabled={isLoading}
                />
                <div className="w-80 h-80 md:w-96 md:h-96 rounded-3xl border-2 border-dashed border-slate-300 
                    bg-gradient-to-br from-slate-50 to-white
                    flex flex-col items-center justify-center gap-6
                    transition-all duration-300 ease-out
                    group-hover:border-indigo-400 group-hover:bg-indigo-50/30
                    group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-indigo-100">
                    
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 
                        flex items-center justify-center shadow-lg shadow-indigo-200
                        group-hover:scale-110 transition-transform duration-300">
                        {isLoading ? (
                            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Upload className="w-9 h-9 text-white" />
                        )}
                    </div>
                    
                    <div className="text-center px-8">
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">
                            {isLoading ? 'Processing...' : 'Drop your PDF here'}
                        </h3>
                        <p className="text-slate-500 text-sm">
                            or click to browse from your device
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <FileText className="w-4 h-4" />
                        <span>PDF files supported</span>
                    </div>
                </div>
            </label>
        </motion.div>
    );
}
