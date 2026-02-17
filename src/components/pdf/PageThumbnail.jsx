import React from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PageThumbnail({ 
    page, 
    index, 
    isSelected, 
    onSelect, 
    onDelete,
    dragHandleProps,
    isDragging 
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className={`
                relative group cursor-pointer
                ${isDragging ? 'z-50' : 'z-0'}
            `}
            onClick={() => onSelect(index)}
        >
            <div className={`
                relative rounded-xl overflow-hidden transition-all duration-200
                ${isSelected 
                    ? 'ring-3 ring-indigo-500 shadow-lg shadow-indigo-100' 
                    : 'ring-1 ring-slate-200 hover:ring-slate-300 hover:shadow-md'}
                ${isDragging ? 'shadow-2xl scale-105' : ''}
            `}>
                {/* Drag Handle */}
                <div 
                    {...dragHandleProps}
                    className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-white/90 backdrop-blur
                        opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing
                        shadow-sm"
                >
                    <GripVertical className="w-4 h-4 text-slate-500" />
                </div>
                
                {/* Delete Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(index);
                    }}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-white/90 backdrop-blur
                        opacity-0 group-hover:opacity-100 transition-all
                        hover:bg-red-50 shadow-sm"
                >
                    <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-500" />
                </button>
                
                {/* Page Image */}
                <div className="aspect-[3/4] bg-white">
                    {page.thumbnail ? (
                        <img 
                            src={page.thumbnail} 
                            alt={`Page ${index + 1}`}
                            className="w-full h-full object-contain"
                            draggable={false}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                            <div className="w-8 h-8 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                        </div>
                    )}
                </div>
                
                {/* Page Number */}
                <div className="absolute bottom-0 inset-x-0 py-2 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-center text-white text-sm font-medium">
                        {index + 1}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
