import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Undo, Redo, ArrowLeft, Save, Plus, Trash2, RotateCw, RotateCcw, ZoomIn, ZoomOut, RotateCcw as ResetZoom } from 'lucide-react';

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#eab308', '#8b5cf6'];

export default function EditToolbar({
    currentTool, onToolChange, color, onColorChange, brushSize, onBrushSizeChange,
    zoom, onZoomChange, currentPage, totalPages, onPageChange,
    onRotate, onAddBlank, onDelete, canUndo, canRedo, onUndo, onRedo, onSave, onBack
}) {
    return (
        <div className="bg-white border-b p-4 flex items-center gap-4 flex-wrap shadow-lg z-50">
            <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-5 h-5 mr-2" /> Back</Button>

            {/* Tools */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                {['draw', 'highlight', 'eraser', 'text', 'select'].map(t => (
                    <Button
                        key={t}
                        variant={currentTool === t ? "default" : "ghost"}
                        size="sm"
                        onClick={() => onToolChange(t)}
                    >
                        {t === 'draw' && '✏️'}
                        {t === 'highlight' && '🖍️'}
                        {t === 'eraser' && '🧼'}
                        {t === 'text' && 'Aa'}
                        {t === 'select' && '↟'}
                    </Button>
                ))}
            </div>

            {/* Colors */}
            <div className="flex gap-2">
                {COLORS.map(c => (
                    <button
                        key={c}
                        onClick={() => onColorChange(c)}
                        className={`w-9 h-9 rounded-full border-4 ${color === c ? 'border-indigo-600 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>

            {/* Brush */}
            <div className="flex items-center gap-3 w-52">
                <span className="text-sm text-gray-500">Size</span>
                <Slider value={[brushSize]} onValueChange={v => onBrushSizeChange(v[0])} min={1} max={40} />
                <span className="font-mono w-8">{brushSize}</span>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => onZoomChange(zoom - 0.2)}><ZoomOut /></Button>
                <span className="font-mono w-16 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="icon" onClick={() => onZoomChange(zoom + 0.2)}><ZoomIn /></Button>
                <Button variant="outline" size="icon" onClick={() => onZoomChange(1.5)}><ResetZoom /></Button>
            </div>

            {/* Page controls */}
            <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>←</Button>
                <span className="font-mono font-semibold">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>→</Button>

                <Button onClick={() => onRotate('left')} variant="outline" size="icon"><RotateCcw /></Button>
                <Button onClick={() => onRotate('right')} variant="outline" size="icon"><RotateCw /></Button>
                <Button onClick={onAddBlank} variant="outline"><Plus className="w-4 h-4 mr-1" /> Blank</Button>
                <Button onClick={onDelete} variant="destructive" size="icon"><Trash2 /></Button>
            </div>

            {/* Undo / Redo / Save */}
            <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={onUndo} disabled={!canUndo}><Undo /> Undo</Button>
                <Button variant="outline" onClick={onRedo} disabled={!canRedo}><Redo /> Redo</Button>
                <Button onClick={onSave} className="bg-green-600 hover:bg-green-700 px-8">
                    <Save className="mr-2" /> Save PDF
                </Button>
            </div>
        </div>
    );
}
