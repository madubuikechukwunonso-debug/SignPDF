// src/components/pdf/EditToolbar.jsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft, Save, Plus, Trash2, RotateCcw, RotateCw, ZoomIn, ZoomOut,
  Undo, Redo, PenTool, Highlighter, Eraser
} from 'lucide-react';

const COLORS = ['#000000', '#ff0000', '#0000ff', '#00ff00', '#ffff00', '#800080'];

export default function EditToolbar({
  currentTool, onToolChange, color, onColorChange, brushSize, onBrushSizeChange,
  zoom, onZoomIn, onZoomOut,
  currentPage, totalPages, onPageChange,
  onRotateLeft, onRotateRight, onAddBlank, onDelete,
  canUndo, canRedo, onUndo, onRedo, onSave, onBack
}) {
  return (
    <div className="bg-gray-100 border-b shadow-md p-3 flex items-center gap-4 flex-wrap text-black">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="flex gap-1 bg-white p-1 rounded border">
        <Button variant={currentTool === 'draw' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('draw')}>
          <PenTool className="h-4 w-4" />
        </Button>
        <Button variant={currentTool === 'highlight' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('highlight')}>
          <Highlighter className="h-4 w-4" />
        </Button>
        <Button variant={currentTool === 'eraser' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('eraser')}>
          <Eraser className="h-4 w-4" />
        </Button>
        <Button variant={currentTool === 'text' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('text')}>
          Aa
        </Button>
        <Button variant={currentTool === 'select' ? 'default' : 'ghost'} size="sm" onClick={() => onToolChange('select')}>
          Select
        </Button>
      </div>

      <div className="flex gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-blue-600 ring-2 ring-blue-400' : 'border-gray-300'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 min-w-[180px]">
        <span className="text-sm font-medium">Size:</span>
        <Slider
          value={[brushSize]}
          onValueChange={(v) => onBrushSizeChange(v[0])}
          min={2}
          max={40}
          step={1}
          className="w-32"
        />
        <span className="font-mono text-sm">{brushSize}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onZoomOut}><ZoomOut className="h-4 w-4" /></Button>
        <span className="font-mono min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="icon" onClick={onZoomIn}><ZoomIn className="h-4 w-4" /></Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
          ←
        </Button>
        <span className="font-semibold min-w-[80px] text-center">
          {currentPage} / {totalPages}
        </span>
        <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
          →
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={onRotateLeft}><RotateCcw className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" onClick={onRotateRight}><RotateCw className="h-4 w-4" /></Button>
        <Button variant="outline" onClick={onAddBlank}><Plus className="mr-1 h-4 w-4" /> Add Page</Button>
        <Button variant="destructive" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
      </div>

      <div className="flex gap-2 ml-auto">
        <Button variant="outline" onClick={onUndo} disabled={!canUndo}>
          <Undo className="mr-1 h-4 w-4" /> Undo
        </Button>
        <Button variant="outline" onClick={onRedo} disabled={!canRedo}>
          <Redo className="mr-1 h-4 w-4" /> Redo
        </Button>
        <Button className="bg-green-600 hover:bg-green-700" onClick={onSave}>
          <Save className="mr-2 h-4 w-4" /> Save PDF
        </Button>
      </div>
    </div>
  );
}
