import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
    Pencil,
    Highlighter,
    Type,
    Eraser,
    MousePointer,
    Undo2,
    Redo2,
    Download,
    ChevronLeft,
    ChevronRight,
    Palette
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

const COLORS = [
    '#000000', '#EF4444', '#F97316', '#EAB308', 
    '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'
];

export default function EditToolbar({
    currentTool,
    onToolChange,
    color,
    onColorChange,
    brushSize,
    onBrushSizeChange,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onSave,
    currentPage,
    totalPages,
    onPageChange,
    onBack
}) {
    const ToolButton = ({ tool, icon: Icon, label }) => (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={currentTool === tool ? "default" : "ghost"}
                        size="icon"
                        onClick={() => onToolChange(tool)}
                        className={`h-10 w-10 rounded-xl transition-all ${
                            currentTool === tool 
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                : 'hover:bg-slate-100'
                        }`}
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
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    {/* Back Button */}
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="rounded-xl gap-2"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </Button>

                    {/* Tools */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                        <ToolButton tool="select" icon={MousePointer} label="Select" />
                        <ToolButton tool="draw" icon={Pencil} label="Draw" />
                        <ToolButton tool="highlight" icon={Highlighter} label="Highlight" />
                        <ToolButton tool="text" icon={Type} label="Add Text" />
                        <ToolButton tool="eraser" icon={Eraser} label="Eraser" />
                    </div>

                    {/* Color & Size */}
                    <div className="flex items-center gap-3">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 rounded-xl"
                                >
                                    <div 
                                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                        style={{ backgroundColor: color }}
                                    />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3">
                                <div className="grid grid-cols-4 gap-2">
                                    {COLORS.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => onColorChange(c)}
                                            className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                                                color === c ? 'ring-2 ring-offset-2 ring-indigo-500' : ''
                                            }`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <div className="w-24">
                            <Slider
                                value={[brushSize]}
                                onValueChange={([v]) => onBrushSizeChange(v)}
                                min={1}
                                max={20}
                                step={1}
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Undo/Redo */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onUndo}
                                        disabled={!canUndo}
                                        className="h-10 w-10 rounded-xl disabled:opacity-40"
                                    >
                                        <Undo2 className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                    Undo
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onRedo}
                                        disabled={!canRedo}
                                        className="h-10 w-10 rounded-xl disabled:opacity-40"
                                    >
                                        <Redo2 className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                    Redo
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    {/* Page Navigation */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="h-8 w-8 rounded-lg"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-slate-600 min-w-[60px] text-center">
                            {currentPage} / {totalPages}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="h-8 w-8 rounded-lg"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Save */}
                    <Button
                        onClick={onSave}
                        className="rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Download className="h-4 w-4" />
                        Save PDF
                    </Button>
                </div>
            </div>
        </div>
    );
}
