import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Undo, Redo, ArrowLeft, Save, Plus, Trash2, RotateCcw, RotateCw, ZoomIn, ZoomOut, PenTool, Highlighter, Eraser, Type, Square } from 'lucide-react';

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#eab308'];

export default function EditToolbar({
  currentTool, onToolChange, color, onColorChange, brushSize, onBrushSizeChange,
  zoom, onZoomIn, onZoomOut, currentPage, totalPages, onPageChange,
  onRotateLeft, onRotateRight, onAddBlank, onDelete,
  canUndo, canRedo, onUndo, onRedo, onSave, onBack
}) {
  return (
    <div className="bg-white border-b shadow-lg p-4 flex items-center gap-4 flex-wrap text-black z-50">
      <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2" /> Back</Button>

      {/* Tools */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        <Button variant={currentTool === 'draw' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('draw')}><PenTool size={18} /></Button>
        <Button variant={currentTool === 'highlight' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('highlight')}><Highlighter size={18} /></Button>
        <Button variant={currentTool === 'eraser' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('eraser')}><Eraser size={18} /></Button>
        <Button variant={currentTool === 'text' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('text')}>Aa</Button>
        <Button variant={currentTool === 'whiteout' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('whiteout')}><Square size={18} /></Button>
      </div>

      {/* Colors (only for draw/highlight) */}
      {(currentTool === 'draw' || currentTool === 'highlight') && (
        <div className="flex gap-2">
          {COLORS.map(c => (
            <button key={c} onClick={() => onColorChange(c)} className={`w-9 h-9 rounded-full border-4 ${color === c ? 'border-indigo-600' : 'border-gray-300'}`} style={{backgroundColor: c}} />
          ))}
        </div>
      )}

      {/* Brush size */}
      <div className="flex items-center gap-3 w-56">
        <span className="text-sm">Size</span>
        <Slider value={[brushSize]} onValueChange={v => onBrushSizeChange(v[0])} min={1} max={40} />
        <span className="font-mono">{brushSize}</span>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onZoomOut}><ZoomOut /></Button>
        <span className="font-mono w-16 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="icon" onClick={onZoomIn}><ZoomIn /></Button>
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>←</Button>
        <span className="font-semibold">{currentPage} / {totalPages}</span>
        <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>→</Button>
        <Button onClick={onRotateLeft} variant="outline" size="icon"><RotateCcw /></Button>
        <Button onClick={onRotateRight} variant="outline" size="icon"><RotateCw /></Button>
        <Button onClick={onAddBlank} variant="outline"><Plus className="mr-1" /> Add Page</Button>
        <Button onClick={onDelete} variant="destructive" size="icon"><Trash2 /></Button>
      </div>

      {/* Undo / Redo / Save */}
      <div className="flex gap-2 ml-auto">
        <Button variant="outline" onClick={onUndo} disabled={!canUndo}><Undo /> Undo</Button>
        <Button variant="outline" onClick={onRedo} disabled={!canRedo}><Redo /> Redo</Button>
        <Button onClick={onSave} className="bg-green-600 hover:bg-green-700 px-8"><Save className="mr-2" /> Save PDF</Button>
      </div>
    </div>
  );
}
