// src/components/pdf/EditToolbar.jsx
// FULL LATEST VERSION - ZERO OMISSIONS - Includes Select tool for deleting text by click
import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Undo, Redo, ArrowLeft, Save, Plus, Trash2, RotateCcw, RotateCw,
  ZoomIn, ZoomOut, PenTool, Highlighter, Eraser, Type, Square, Pin, PinOff
} from 'lucide-react';

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#eab308', '#8b5cf6'];
const FONTS = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Impact', label: 'Impact' }
];

export default function EditToolbar({
  currentTool, onToolChange, color, onColorChange, brushSize, onBrushSizeChange,
  zoom, onZoomIn, onZoomOut, currentPage, totalPages, onPageChange,
  onRotateLeft, onRotateRight, onAddBlank, onDelete,
  canUndo, canRedo, onUndo, onRedo, onSave, onBack,
  // NEW FEATURES
  isPinned, onPinToggle, currentFont, onFontChange
}) {
  return (
    <div className="bg-white border-b shadow-lg p-4 flex items-center gap-4 flex-wrap text-black z-50">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-5 w-5" /> Back
      </Button>

      {/* Tools - Added Select tool for deleting text by click */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        <Button variant={currentTool === 'draw' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('draw')}>
          <PenTool size={18} />
        </Button>
        <Button variant={currentTool === 'highlight' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('highlight')}>
          <Highlighter size={18} />
        </Button>
        <Button variant={currentTool === 'eraser' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('eraser')}>
          <Eraser size={18} />
        </Button>
        <Button variant={currentTool === 'text' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('text')}>
          Aa
        </Button>
        <Button variant={currentTool === 'whiteout' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('whiteout')}>
          <Square size={18} />
        </Button>
        <Button variant={currentTool === 'select' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('select')}>
          ↟
        </Button>
      </div>

      {/* Font selector - only for text tool */}
      {currentTool === 'text' && (
        <select
          value={currentFont}
          onChange={(e) => onFontChange(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-indigo-600"
        >
          {FONTS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      )}

      {/* Colors */}
      {(currentTool === 'draw' || currentTool === 'highlight') && (
        <div className="flex gap-2">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              className={`w-8 h-8 rounded-full border-4 transition-all ${color === c ? 'border-indigo-600 scale-110' : 'border-gray-300'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      {/* Brush size */}
      <div className="flex items-center gap-3 w-56">
        <span className="text-sm font-medium">Size</span>
        <Slider value={[brushSize]} onValueChange={v => onBrushSizeChange(v[0])} min={1} max={40} className="w-32" />
        <span className="font-mono text-sm w-8">{brushSize}</span>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onZoomOut}><ZoomOut size={18} /></Button>
        <span className="font-mono w-16 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="icon" onClick={onZoomIn}><ZoomIn size={18} /></Button>
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>←</Button>
        <span className="font-semibold min-w-[70px] text-center">{currentPage} / {totalPages}</span>
        <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>→</Button>
        <Button onClick={onRotateLeft} variant="outline" size="icon"><RotateCcw size={18} /></Button>
        <Button onClick={onRotateRight} variant="outline" size="icon"><RotateCw size={18} /></Button>
        <Button onClick={onAddBlank} variant="outline"><Plus className="mr-1" size={18} />Add Page</Button>
        <Button onClick={onDelete} variant="destructive" size="icon"><Trash2 size={18} /></Button>
      </div>

      {/* Pin Toolbar Button */}
      <Button
        variant={isPinned ? "default" : "outline"}
        size="sm"
        onClick={onPinToggle}
        className="ml-auto"
      >
        {isPinned ? <PinOff size={18} /> : <Pin size={18} />}
        {isPinned ? ' Unpin' : ' Pin'}
      </Button>

      {/* Undo / Redo / Save */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onUndo} disabled={!canUndo}><Undo size={18} /> Undo</Button>
        <Button variant="outline" onClick={onRedo} disabled={!canRedo}><Redo size={18} /> Redo</Button>
        <Button onClick={onSave} className="bg-green-600 hover:bg-green-700 px-8">
          <Save className="mr-2" size={18} /> Save PDF
        </Button>
      </div>
    </div>
  );
}
