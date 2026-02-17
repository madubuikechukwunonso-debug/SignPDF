import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Undo, Redo, ArrowLeft, Save, PenTool, Highlighter, Eraser } from 'lucide-react';

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#eab308', '#8b5cf6'];

export default function EditToolbar({
    canUndo, canRedo, onUndo, onRedo, onSave,
    currentPage, totalPages, onPageChange, onBack,
    currentTool, onToolChange, color, onColorChange, brushSize, onBrushSizeChange
}) {
    return (
        <div className="bg-white border-b p-4 flex items-center justify-between gap-6 flex-wrap shadow">
            <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
                <ArrowLeft size={20} /> Back
            </Button>

            {/* Tools */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                {[
                    { tool: 'draw', icon: PenTool, label: 'Draw' },
                    { tool: 'highlight', icon: Highlighter, label: 'Highlight' },
                    { tool: 'eraser', icon: Eraser, label: 'Erase' }
                ].map(({ tool, icon: Icon }) => (
                    <Button
                        key={tool}
                        variant={currentTool === tool ? "default" : "ghost"}
                        size="sm"
                        onClick={() => onToolChange(tool)}
                    >
                        <Icon size={18} />
                    </Button>
                ))}
            </div>

            {/* Colors */}
            <div className="flex gap-2">
                {COLORS.map(c => (
                    <button
                        key={c}
                        onClick={() => onColorChange(c)}
                        className={`w-9 h-9 rounded-full border-4 transition-all ${color === c ? 'border-indigo-600 scale-110' : 'border-gray-200'}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>

            {/* Brush size */}
            <div className="flex items-center gap-3 w-56">
                <span className="text-sm text-gray-500">Size</span>
                <Slider
                    value={[brushSize]}
                    onValueChange={v => onBrushSizeChange(v[0])}
                    min={1} max={30} step={1}
                />
                <span className="font-mono w-8">{brushSize}</span>
            </div>

            {/* Undo / Redo */}
            <div className="flex gap-2">
                <Button variant="outline" onClick={onUndo} disabled={!canUndo}>
                    <Undo size={18} /> Undo
                </Button>
                <Button variant="outline" onClick={onRedo} disabled={!canRedo}>
                    <Redo size={18} /> Redo
                </Button>
            </div>

            {/* Page nav */}
            <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>←</Button>
                <span className="font-mono text-lg font-semibold">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>→</Button>
            </div>

            <Button onClick={onSave} className="bg-green-600 hover:bg-green-700 px-8">
                <Save className="mr-2" /> Save PDF
            </Button>
        </div>
    );
}
