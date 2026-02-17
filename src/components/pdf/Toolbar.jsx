import React from 'react';
import { Button } from "@/components/ui/button";
import { 
    Undo2, 
    Redo2, 
    Download, 
    RotateCw, 
    Trash2,
    Plus,
    FileImage,
    FileText,
    Pencil
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";


export default function Toolbar({ 
    canUndo, 
    canRedo, 
    onUndo, 
    onRedo, 
    onDownload,
    onRotate,
    onDeleteSelected,
    onAddPages,
    hasSelection,
    isProcessing,
    onConvertToImages,
    pageCount,
    onEditMode
}) {
    const ToolButton = ({ icon: Icon, label, onClick, disabled, variant = "ghost" }) => (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={variant}
                        size="icon"
                        onClick={onClick}
                        disabled={disabled}
                        className="h-10 w-10 rounded-xl transition-all hover:scale-105 disabled:opacity-40"
                    >
                        <Icon className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    {label}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    return (
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    {/* Left: Undo/Redo */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                        <ToolButton
                            icon={Undo2}
                            label="Undo (Ctrl+Z)"
                            onClick={onUndo}
                            disabled={!canUndo || isProcessing}
                        />
                        <ToolButton
                            icon={Redo2}
                            label="Redo (Ctrl+Y)"
                            onClick={onRedo}
                            disabled={!canRedo || isProcessing}
                        />
                    </div>

                    {/* Center: Page Actions */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => {
                                    if (e.target.files[0]) onAddPages(e.target.files[0]);
                                    e.target.value = '';
                                }}
                                className="hidden"
                                disabled={isProcessing}
                            />
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors">
                                <Plus className="h-5 w-5 text-slate-700" />
                            </div>
                        </label>
                        <ToolButton
                            icon={RotateCw}
                            label="Rotate Selected"
                            onClick={onRotate}
                            disabled={!hasSelection || isProcessing}
                        />
                        <ToolButton
                            icon={Trash2}
                            label="Delete Selected"
                            onClick={onDeleteSelected}
                            disabled={!hasSelection || isProcessing}
                        />
                    </div>

                    {/* Right: Export */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 mr-2">
                            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onEditMode}
                            disabled={isProcessing}
                            className="rounded-xl gap-2"
                        >
                            <Pencil className="h-4 w-4" />
                            <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onConvertToImages}
                            disabled={isProcessing}
                            className="rounded-xl gap-2"
                        >
                            <FileImage className="h-4 w-4" />
                            <span className="hidden sm:inline">To Images</span>
                        </Button>
                        <Button
                            onClick={onDownload}
                            disabled={isProcessing}
                            className="rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Download PDF</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
