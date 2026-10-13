/**
 * Scratchpad Component.
 * Interactive HTML5 drawing canvas with touch/mouse support, stroke undo history,
 * tool controls, question prompts, and snapshot export.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Question } from '../types';

interface ScratchpadProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  onSubmit: (imageBase64: string) => void;
  onExit: () => void;
  isSubmitting?: boolean;
}

type Tool = 'pen' | 'eraser';

const ERASER_WIDTH = 32;
const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='none' stroke='%23e5b078' stroke-width='2' stroke-dasharray='4 3'/%3E%3C/svg%3E") 16 16, cell`;

interface StrokePoint {
  x: number;
  y: number;
}

interface Stroke {
  tool: Tool;
  color: string;
  width: number;
  points: StrokePoint[];
}

export const Scratchpad: React.FC<ScratchpadProps> = ({
  question,
  questionIndex,
  totalQuestions,
  onSubmit,
  onExit,
  isSubmitting = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Tool state
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [strokeColor, setStrokeColor] = useState<string>('#12131a');
  const [strokeWidth, setStrokeWidth] = useState<number>(3.5);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStrokeRef = useRef<StrokePoint[]>([]);

  // Setup high-DPI canvas dimensions
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      redrawCanvas(strokes);
    }
  }, [strokes]);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Reset scratchpad state when advancing to a new question
  useEffect(() => {
    setStrokes([]);
    currentStrokeRef.current = [];
    setShowHint(false);
    clearCanvas();
  }, [question.id]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const redrawCanvas = (strokeList: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokeList) {
      if (stroke.points.length === 0) continue;

      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.width;

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  // Coordinate normalization for mouse and touch
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): StrokePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    setIsDrawing(true);
    const point = getCoordinates(e);
    currentStrokeRef.current = [point];

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const currentWidth = currentTool === 'eraser' ? ERASER_WIDTH : strokeWidth;
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = currentWidth;
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
    }
    ctx.moveTo(point.x, point.y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const point = getCoordinates(e);
    currentStrokeRef.current.push(point);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentStrokeRef.current.length > 0) {
      const newStroke: Stroke = {
        tool: currentTool,
        color: strokeColor,
        width: currentTool === 'eraser' ? ERASER_WIDTH : strokeWidth,
        points: [...currentStrokeRef.current],
      };
      const updated = [...strokes, newStroke];
      setStrokes(updated);
      currentStrokeRef.current = [];
    }
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const updated = strokes.slice(0, -1);
    setStrokes(updated);
    redrawCanvas(updated);
  };

  const handleClearAll = () => {
    setStrokes([]);
    currentStrokeRef.current = [];
    clearCanvas();
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create an export canvas with solid white background so dark theme transparency doesn't hide strokes
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');

    if (exportCtx) {
      exportCtx.fillStyle = '#ffffff';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      exportCtx.drawImage(canvas, 0, 0);
    }

    const imageBase64 = exportCanvas.toDataURL('image/png');
    onSubmit(imageBase64);
  };

  const isLastQuestion = questionIndex === totalQuestions - 1;

  return (
    <div className="scratchpad-container">
      {/* Question Prompt Header */}
      <div className="prompt-bar">
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {question.topic}
          </span>
          <div className="prompt-text" style={{ marginTop: 4 }}>
            {question.prompt}
          </div>
          {showHint && question.hint && (
            <div style={{ marginTop: 10, fontSize: '0.95rem', color: 'var(--warning)', background: 'var(--warning-soft)', border: '1px solid rgba(251, 191, 36, 0.25)', padding: '8px 14px', borderRadius: 10 }}>
              💡 Hint: {question.hint}
            </div>
          )}
        </div>

        <div className="prompt-meta">
          {question.hint && (
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              onClick={() => setShowHint(!showHint)}
            >
              {showHint ? 'Hide Hint' : '💡 Hint'}
            </button>
          )}
          <div className="counter-badge">
            Question {questionIndex + 1} of {totalQuestions}
          </div>
        </div>
      </div>

      {/* Drawing Canvas Area */}
      <div className="canvas-wrapper canvas-grid" ref={containerRef}>
        {/* Floating Toolbar */}
        <div className="canvas-toolbar">
          <button
            className={`tool-btn ${currentTool === 'pen' ? 'active' : ''}`}
            onClick={() => setCurrentTool('pen')}
          >
            ✏️ Pen
          </button>
          <button
            className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
            onClick={() => setCurrentTool('eraser')}
          >
            🧹 Eraser
          </button>

          <div className="tool-divider" />

          {/* Color Palette */}
          {['#12131a', '#2563eb', '#059669', '#e11d48'].map((color) => (
            <div
              key={color}
              className={`color-dot ${strokeColor === color && currentTool === 'pen' ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => {
                setStrokeColor(color);
                setCurrentTool('pen');
              }}
              title={color}
            />
          ))}

          <div className="tool-divider" />

          {/* Pen Size */}
          {[2, 4, 8].map((size) => (
            <button
              key={size}
              className={`tool-btn ${strokeWidth === size && currentTool === 'pen' ? 'active' : ''}`}
              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              onClick={() => {
                setStrokeWidth(size);
                setCurrentTool('pen');
              }}
              title={`Pen size: ${size === 2 ? 'Fine' : size === 4 ? 'Medium' : 'Bold'}`}
            >
              {size === 2 ? 'Fine' : size === 4 ? 'Med' : 'Bold'}
            </button>
          ))}

          <div className="tool-divider" />

          <button className="tool-btn" onClick={handleUndo} title="Undo stroke">
            ↩ Undo
          </button>
          <button className="tool-btn" onClick={handleClearAll} title="Clear scratchpad">
            🗑️ Clear
          </button>
        </div>

        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', touchAction: 'none', cursor: currentTool === 'eraser' ? ERASER_CURSOR : 'crosshair' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Footer Navigation */}
      <div className="scratchpad-footer">
        <button className="btn btn-secondary" onClick={onExit}>
          ← Exit to Topics
        </button>

        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            'Submitting...'
          ) : isLastQuestion ? (
            'Finish & Grade Assignment ➔'
          ) : (
            'Next Question ➔'
          )}
        </button>
      </div>
    </div>
  );
};

