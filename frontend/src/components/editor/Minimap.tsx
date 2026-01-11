'use client';

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface MinimapProps {
  code: string;
  visibleStartLine: number;
  visibleEndLine: number;
  currentLine?: number;
  totalLines: number;
  onClick: (line: number) => void;
  className?: string;
}

export function Minimap({
  code,
  visibleStartLine,
  visibleEndLine,
  currentLine,
  totalLines,
  onClick,
  className,
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  // Update height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setHeight(containerRef.current.clientHeight);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Draw minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lines = code.split('\n');
    const lineHeight = Math.max(1, Math.min(3, height / totalLines));
    const charWidth = 1;
    
    // Clear canvas
    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw lines
    lines.forEach((line, i) => {
      const y = i * lineHeight;
      if (y > height) return;

      // Draw visible area highlight
      if (i >= visibleStartLine - 1 && i <= visibleEndLine - 1) {
        ctx.fillStyle = 'rgba(128, 128, 128, 0.2)';
        ctx.fillRect(0, y, canvas.width, lineHeight);
      }

      // Draw current line highlight
      if (i === (currentLine || 1) - 1) {
        ctx.fillStyle = 'rgba(147, 51, 234, 0.5)';
        ctx.fillRect(0, y, canvas.width, lineHeight);
      }

      // Draw line content as simplified blocks
      const trimmed = line.trimStart();
      const indent = line.length - trimmed.length;
      
      if (trimmed.length > 0) {
        // Color based on content
        if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
          ctx.fillStyle = 'rgba(100, 150, 100, 0.6)'; // Comments
        } else if (trimmed.startsWith('import') || trimmed.startsWith('export') || trimmed.startsWith('from')) {
          ctx.fillStyle = 'rgba(150, 100, 200, 0.6)'; // Imports
        } else if (trimmed.startsWith('function') || trimmed.startsWith('const') || trimmed.startsWith('class')) {
          ctx.fillStyle = 'rgba(100, 150, 255, 0.7)'; // Declarations
        } else {
          ctx.fillStyle = 'rgba(180, 180, 180, 0.5)'; // Regular code
        }

        const blockWidth = Math.min(trimmed.length * charWidth, canvas.width - indent * 2);
        ctx.fillRect(indent * 2, y, blockWidth, Math.max(lineHeight - 0.5, 1));
      }
    });
  }, [code, height, visibleStartLine, visibleEndLine, currentLine, totalLines]);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const lineHeight = height / totalLines;
    const clickedLine = Math.floor(y / lineHeight) + 1;
    
    onClick(Math.min(Math.max(1, clickedLine), totalLines));
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        'w-16 bg-muted/20 border-l cursor-pointer overflow-hidden',
        className
      )}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        width={60}
        height={height}
        className="w-full h-full"
      />
    </div>
  );
}

export default Minimap;
