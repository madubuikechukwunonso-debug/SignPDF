import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Undo, Redo, ArrowLeft, Save, Plus, Trash2, RotateCw, RotateCcw, ZoomIn, ZoomOut, RotateCcw as ResetZoom, PenTool, Highlighter, Eraser } from 'lucide-react';

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#eab308', '#8b5cf6'];

export default function EditToolbar({
    currentTool, onToolChange, color, onColorChange, brushSize, onBrushSizeChange,
    zoom, onZoomChange, currentPage, totalPages, onPageChange,
    onRotate, onAddBlank, onDelete, canUndo, canRedo, onUndo, onRedo, onSave, onBack
}) {
    return (
        <div className="bg-white border-b shadow-lg p-4 flex items-center gap-4 flex-wrap z-50 text-black">
            <Button variant="ghost" onClick={onBack} className="text-black hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </Button>

            {/* Tools */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                {[
                    { tool: 'draw', icon: PenTool },
                    { tool: 'highlight', icon: Highlighter },
                    { tool: 'eraser', icon: Eraser },
                    { tool: 'text', label: 'Aa' },
                    { tool: 'select', label: '↟' }
                ].map(({ tool, icon: Icon, label }) => (
                    <Button
                        key={tool}
                        variant={currentTool === tool ? "default" : "ghost"}
                        size="sm"
                        onClick={() => onToolChange(tool)}
                        className="text-black"
                    >
                        {Icon ? <Icon size={18} /> : label}
                    </Button>
                ))}
            </div>

            {/* Colors */}
            <div className="flex gap-2">
                {COLORS.map(c => (
                    <button
                        key={c}
                        onClick={() => onColorChange(c)}
                        className={`w-9 h-9 rounded-full border-4 transition-all ${color === c ? 'border-indigo-600 scale-110' : 'border-gray-300'}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>

            {/* Brush size */}
            <div className="flex items-center gap-3 w-52">
                <span className="text-sm text-gray-500 font-medium">Size</span>
                <Slider value={[brushSize]} onValueChange={v => onBrushSizeChange(v[0])} min={1} max={40} className="w-32" />
                <span className="font-mono text-black">{brushSize}</span>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => onZoomChange(-0.2)} className="text-black"><ZoomOut /></Button>
                <span className="font-mono w-16 text-center text-black">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="icon" onClick={() => onZoomChange(0.2)} className="text-black"><ZoomIn /></Button>
                <Button variant="outline" size="icon" onClick={() => onZoomChange(1.5)} className="text-black"><ResetZoom /></Button>
            </div>

            {/* Page controls */}
            <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="text-black">←</Button>
                <span className="font-mono font-semibold text-black">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="text-black">→</Button>

                <Button onClick={() => onRotate('left')} variant="outline" size="icon" className="text-black"><RotateCcw /></Button>
                <Button onClick={() => onRotate('right')} variant="outline" size="icon" className="text-black"><RotateCw /></Button>
                <Button onClick={onAddBlank} variant="outline" className="text-black"><Plus className="w-4 h-4 mr-1" /> Blank</Button>
                <Button onClick={onDelete} variant="destructive" size="icon"><Trash2 /></Button>
            </div>

            {/* Undo/Redo/Save */}
            <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={onUndo} disabled={!canUndo} className="text-black"><Undo className="mr-1" /> Undo</Button>
                <Button variant="outline" onClick={onRedo} disabled={!canRedo} className="text-black"><Redo className="mr-1" /> Redo</Button>
                <Button onClick={onSave} className="bg-green-600 hover:bg-green-700 px-8 text-white">
                    <Save className="mr-2" /> Save PDF
                </Button>
            </div>
        </div>
    );
}
