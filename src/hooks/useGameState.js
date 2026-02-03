import { useState, useCallback, useEffect } from 'react';
import { saveGame, loadGame, generateGameId, saveImageData } from '../utils/storage';

/**
 * Hook for managing game state (coloring progress, selection, etc.)
 */
export function useGameState(processedData) {
  const [gameId, setGameId] = useState(null);
  const [coloredRegions, setColoredRegions] = useState(new Set());
  const [selectedColor, setSelectedColor] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  // Calculate progress per color
  const getColorProgress = useCallback(() => {
    if (!processedData) return new Map();
    
    const { regionColors, palette } = processedData;
    const progress = new Map();
    
    // Initialize counts
    palette.forEach((_, idx) => {
      progress.set(idx, { total: 0, colored: 0 });
    });
    
    // Count regions per color
    regionColors.forEach((colorIdx, regionId) => {
      const p = progress.get(colorIdx);
      p.total++;
      if (coloredRegions.has(regionId)) {
        p.colored++;
      }
    });
    
    return progress;
  }, [processedData, coloredRegions]);

  // Get list of colors that still have uncolored regions
  const getActiveColors = useCallback(() => {
    const progress = getColorProgress();
    const active = [];
    
    progress.forEach((p, colorIdx) => {
      if (p.colored < p.total) {
        active.push(colorIdx);
      }
    });
    
    return active;
  }, [getColorProgress]);

  // Get regions that match selected color
  const getHighlightedRegions = useCallback(() => {
    if (selectedColor === null || !processedData) return new Set();
    
    const highlighted = new Set();
    processedData.regionColors.forEach((colorIdx, regionId) => {
      if (colorIdx === selectedColor && !coloredRegions.has(regionId)) {
        highlighted.add(regionId);
      }
    });
    
    return highlighted;
  }, [selectedColor, processedData, coloredRegions]);

  // Color a region
  const colorRegion = useCallback((regionId) => {
    if (!processedData) return false;
    
    const regionColorIdx = processedData.regionColors.get(regionId);
    
    // Only color if correct color is selected
    if (regionColorIdx !== selectedColor) {
      return false;
    }
    
    // Already colored
    if (coloredRegions.has(regionId)) {
      return false;
    }
    
    setColoredRegions(prev => {
      const next = new Set(prev);
      next.add(regionId);
      return next;
    });
    
    return true;
  }, [processedData, selectedColor, coloredRegions]);

  // Check completion
  useEffect(() => {
    if (!processedData) return;
    
    const complete = coloredRegions.size === processedData.numRegions;
    setIsComplete(complete);
  }, [coloredRegions, processedData]);

  // Auto-save on changes
  useEffect(() => {
    if (!gameId || !processedData) return;
    
    const state = {
      coloredRegions: Array.from(coloredRegions),
      totalRegions: processedData.numRegions,
      palette: processedData.palette,
      thumbnail: processedData.originalImage?.substring(0, 100) // Store partial for listing
    };
    
    saveGame(gameId, state);
  }, [gameId, coloredRegions, processedData]);

  // Initialize new game
  const startNewGame = useCallback((data) => {
    const id = generateGameId();
    setGameId(id);
    setColoredRegions(new Set());
    setSelectedColor(null);
    setIsComplete(false);
    
    // Save image data
    if (data.originalImage) {
      saveImageData(id, data.originalImage);
    }
    
    return id;
  }, []);

  // Load existing game
  const loadExistingGame = useCallback((id) => {
    const saved = loadGame(id);
    if (saved) {
      setGameId(id);
      setColoredRegions(new Set(saved.coloredRegions || []));
      setSelectedColor(null);
      setIsComplete(false);
      return saved;
    }
    return null;
  }, []);

  // Reset current game
  const resetGame = useCallback(() => {
    setColoredRegions(new Set());
    setSelectedColor(null);
    setIsComplete(false);
  }, []);

  // Undo last action (simple: just remove the last colored region)
  const [history, setHistory] = useState([]);
  
  const colorRegionWithHistory = useCallback((regionId) => {
    const result = colorRegion(regionId);
    if (result) {
      setHistory(prev => [...prev, regionId]);
    }
    return result;
  }, [colorRegion]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    
    const lastRegion = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setColoredRegions(prev => {
      const next = new Set(prev);
      next.delete(lastRegion);
      return next;
    });
  }, [history]);

  return {
    gameId,
    coloredRegions,
    selectedColor,
    setSelectedColor,
    isComplete,
    getColorProgress,
    getActiveColors,
    getHighlightedRegions,
    colorRegion: colorRegionWithHistory,
    startNewGame,
    loadExistingGame,
    resetGame,
    undo,
    canUndo: history.length > 0
  };
}

export default useGameState;
