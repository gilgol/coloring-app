import { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { rgbToGrayscale } from '../utils/colorUtils';
import { extractBoundaries } from '../utils/slic';
import './ColoringCanvas.css';

export const ColoringCanvas = forwardRef(function ColoringCanvas({
  processedData,
  coloredRegions,
  highlightedRegions,
  selectedColor,
  showNumbers,
  displayMode,
  onRegionClick
}, ref) {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });

  // Expose canvas ref to parent
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current
  }), []);

  const { width, height, labels, palette, regionColors, regionData } = processedData || {};

  // Render the canvas
  useEffect(() => {
    if (!processedData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;

    // Create output image data
    const outputData = ctx.createImageData(width, height);
    const boundaries = extractBoundaries(labels, width, height);

    for (let i = 0; i < labels.length; i++) {
      const regionId = labels[i];
      const colorIdx = regionColors.get(regionId);
      const color = palette[colorIdx];
      const idx = i * 4;

      if (coloredRegions.has(regionId)) {
        // Region is colored - show actual color
        outputData.data[idx] = color[0];
        outputData.data[idx + 1] = color[1];
        outputData.data[idx + 2] = color[2];
        outputData.data[idx + 3] = 255;
      } else if (highlightedRegions.has(regionId)) {
        // Region is highlighted - show lighter version
        const gray = rgbToGrayscale(color);
        outputData.data[idx] = Math.min(255, gray + 60);
        outputData.data[idx + 1] = Math.min(255, gray + 80);
        outputData.data[idx + 2] = Math.min(255, gray + 100);
        outputData.data[idx + 3] = 255;
      } else if (displayMode === 'extreme') {
        // Extreme mode: all white, no boundaries
        outputData.data[idx] = 255;
        outputData.data[idx + 1] = 255;
        outputData.data[idx + 2] = 255;
        outputData.data[idx + 3] = 255;
      } else if (displayMode === 'outlined') {
        // Outlined mode: white background, boundaries drawn separately below
        outputData.data[idx] = 255;
        outputData.data[idx + 1] = 255;
        outputData.data[idx + 2] = 255;
        outputData.data[idx + 3] = 255;
      } else {
        // Grayout mode (default) - show grayscale
        const gray = rgbToGrayscale(color);
        outputData.data[idx] = gray;
        outputData.data[idx + 1] = gray;
        outputData.data[idx + 2] = gray;
        outputData.data[idx + 3] = 255;
      }

      // Draw boundaries darker (skip for extreme mode)
      if (displayMode !== 'extreme' && boundaries.has(i)) {
        outputData.data[idx] = Math.max(0, outputData.data[idx] - 40);
        outputData.data[idx + 1] = Math.max(0, outputData.data[idx + 1] - 40);
        outputData.data[idx + 2] = Math.max(0, outputData.data[idx + 2] - 40);
      }
    }

    ctx.putImageData(outputData, 0, 0);

    if (showNumbers && regionData) {
      ctx.save();
      const fontSize = Math.max(10, Math.round(Math.min(width, height) * 0.02));
      ctx.font = `600 ${fontSize}px "Trebuchet MS", "DejaVu Sans", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      regionData.forEach((data, regionId) => {
        const pixels = data.pixels;
        if (!pixels || pixels.length === 0) return;

        let sumX = 0;
        let sumY = 0;
        for (let i = 0; i < pixels.length; i++) {
          const idx = pixels[i];
          sumX += idx % width;
          sumY += Math.floor(idx / width);
        }

        const centerX = sumX / pixels.length;
        const centerY = sumY / pixels.length;
        const colorIdx = regionColors.get(regionId);
        const color = palette[colorIdx];
        const gray = rgbToGrayscale(color);
        // In outlined/extreme modes, background is white so use dark text
        const bgIsLight = (displayMode === 'outlined' || displayMode === 'extreme') 
          ? true 
          : gray > 140;
        const textColor = bgIsLight ? 'rgba(20, 20, 20, 0.75)' : 'rgba(245, 245, 245, 0.85)';
        const label = String(colorIdx + 1);

        ctx.lineWidth = Math.max(2, fontSize * 0.15);
        ctx.strokeStyle = bgIsLight ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)';
        ctx.strokeText(label, centerX, centerY);
        ctx.fillStyle = textColor;
        ctx.fillText(label, centerX, centerY);
      });
      ctx.restore();
    }
  }, [processedData, coloredRegions, highlightedRegions, width, height, labels, palette, regionColors, regionData, showNumbers, displayMode]);

  // Handle click to color region
  const handleClick = useCallback((e) => {
    if (!processedData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate click position accounting for scale and offset
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x < 0 || x >= width || y < 0 || y >= height) return;

    const pixelIdx = y * width + x;
    const regionId = labels[pixelIdx];

    onRegionClick(regionId);
  }, [processedData, width, height, labels, onRegionClick]);

  // Zoom handling
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.max(0.5, Math.min(5, s * delta)));
  }, []);

  // Pan handling
  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || e.button === 2 || e.ctrlKey) {
      setIsPanning(true);
      setLastPanPos({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setOffset(o => ({
        x: o.x + (e.clientX - lastPanPos.x),
        y: o.y + (e.clientY - lastPanPos.y)
      }));
      setLastPanPos({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastPanPos]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Reset view
  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  if (!processedData) {
    return <div className="coloring-canvas-empty">No image loaded</div>;
  }

  return (
    <div className="coloring-canvas-container">
      <div className="canvas-controls">
        <button onClick={() => setScale(s => Math.min(5, s * 1.2))}>🔍+</button>
        <button onClick={() => setScale(s => Math.max(0.5, s / 1.2))}>🔍-</button>
        <button onClick={resetView}>⟲</button>
        <span className="zoom-level">{Math.round(scale * 100)}%</span>
      </div>
      <div 
        className="canvas-viewport"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas
          ref={canvasRef}
          className="coloring-canvas"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            cursor: isPanning ? 'grabbing' : (selectedColor !== null ? 'crosshair' : 'default')
          }}
          onClick={handleClick}
        />
      </div>
    </div>
  );
});

export default ColoringCanvas;
