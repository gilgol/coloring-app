import { useState, useCallback, useRef, useEffect } from 'react';
import './App.css';
import ImageUploader from './components/ImageUploader';
import DifficultySelector from './components/DifficultySelector';
import ColorPalette from './components/ColorPalette';
import ColoringCanvas from './components/ColoringCanvas';
import CompletionScreen from './components/CompletionScreen';
import { useImageProcessor } from './hooks/useImageProcessor';
import { useGameState } from './hooks/useGameState';

function App() {
  // Setup state
  const [imageFile, setImageFile] = useState(null);
  const [difficulty, setDifficulty] = useState('beginner');
  const [paletteSize, setPaletteSize] = useState(10);
  const [processedData, setProcessedData] = useState(null);
  const [gamePhase, setGamePhase] = useState('setup'); // 'setup' | 'playing'
  const [showNumbers, setShowNumbers] = useState(true);
  const [hintActive, setHintActive] = useState(false);
  const [highlightMode, setHighlightMode] = useState('persistent'); // 'persistent' | 'timed'
  const [displayMode, setDisplayMode] = useState('grayout'); // 'grayout' | 'outlined' | 'extreme'
  const hintTimeoutRef = useRef(null);
  const canvasComponentRef = useRef(null);

  const { processImage, processing, progress, error } = useImageProcessor();
  const {
    coloredRegions,
    selectedColor,
    setSelectedColor,
    isComplete,
    getColorProgress,
    getActiveColors,
    getHighlightedRegions,
    colorRegion,
    startNewGame,
    resetGame,
    undo,
    canUndo
  } = useGameState(processedData);

  // Handle start game
  const handleStartGame = useCallback(async () => {
    if (!imageFile) return;

    try {
      const data = await processImage(imageFile, difficulty, paletteSize);
      setProcessedData(data);
      startNewGame(data);
      setGamePhase('playing');
    } catch (e) {
      console.error('Failed to process image:', e);
    }
  }, [imageFile, difficulty, paletteSize, processImage, startNewGame]);

  // Handle new game
  const handleNewGame = useCallback(() => {
    setProcessedData(null);
    setImageFile(null);
    setGamePhase('setup');
  }, []);

  // Activate highlight (either persistent or timed based on mode)
  const activateHighlight = useCallback(() => {
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
    setHintActive(true);
    if (highlightMode === 'timed') {
      hintTimeoutRef.current = setTimeout(() => {
        setHintActive(false);
        hintTimeoutRef.current = null;
      }, 2000);
    }
  }, [highlightMode]);

  const triggerHint = useCallback(() => {
    if (selectedColor === null) return;
    activateHighlight();
  }, [selectedColor, activateHighlight]);

  // When a color is selected, auto-activate highlight
  const handleColorSelect = useCallback((colorIdx) => {
    setSelectedColor(colorIdx);
    // Activate highlight for the newly selected color
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
    setHintActive(true);
    if (highlightMode === 'timed') {
      hintTimeoutRef.current = setTimeout(() => {
        setHintActive(false);
        hintTimeoutRef.current = null;
      }, 2000);
    }
  }, [setSelectedColor, highlightMode]);

  // When highlight mode changes, update current highlight state
  useEffect(() => {
    if (selectedColor === null) return;
    if (highlightMode === 'persistent') {
      // Switch to persistent: clear any timer and keep highlight on
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = null;
      }
      setHintActive(true);
    }
    // If switching to timed while highlight is active, start timer
    if (highlightMode === 'timed' && hintActive) {
      hintTimeoutRef.current = setTimeout(() => {
        setHintActive(false);
        hintTimeoutRef.current = null;
      }, 2000);
    }
  }, [highlightMode]);

  useEffect(() => () => {
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }
  }, []);

  // Handle reset current game
  const handleReset = useCallback(() => {
    if (window.confirm('Are you sure you want to reset? All progress will be lost.')) {
      resetGame();
    }
  }, [resetGame]);

  // Handle save as JPEG
  const handleSave = useCallback(() => {
    const canvasComponent = canvasComponentRef.current;
    if (!canvasComponent) return;
    const canvas = canvasComponent.getCanvas();
    if (!canvas) return;

    const dataURL = canvas.toDataURL('image/jpeg', 0.92);
    const link = document.createElement('a');
    link.download = `coloring-${Date.now()}.jpg`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Calculate stats
  const colorProgress = processedData ? getColorProgress() : new Map();
  const activeColors = processedData ? getActiveColors() : [];
  const highlightedRegions = processedData && hintActive ? getHighlightedRegions() : new Set();
  const totalProgress = processedData 
    ? Math.round((coloredRegions.size / processedData.numRegions) * 100)
    : 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎨 Color by Regions</h1>
        {gamePhase === 'playing' && (
          <div className="header-stats">
            <span className="progress-stat">{totalProgress}% Complete</span>
            <button className="header-btn" onClick={undo} disabled={!canUndo}>
              ↩ Undo
            </button>
            <button className="header-btn danger" onClick={handleReset}>
              ⟲ Reset
            </button>
            <button className="header-btn" onClick={handleSave}>
              Save
            </button>
            <button className="header-btn" onClick={handleNewGame}>
              + New
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {gamePhase === 'setup' ? (
          <div className="setup-screen">
            <ImageUploader 
              onImageSelected={setImageFile}
              disabled={processing}
            />
            
            <DifficultySelector
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              paletteSize={paletteSize}
              setPaletteSize={setPaletteSize}
              disabled={processing}
            />

            <button 
              className="start-btn"
              onClick={handleStartGame}
              disabled={!imageFile || processing}
            >
              {processing ? `Processing... ${progress}%` : 'Start Coloring!'}
            </button>

            {error && <p className="error-message">{error}</p>}
          </div>
        ) : (
          <div className="game-screen">
            <div className="game-canvas-area">
              <ColoringCanvas
                ref={canvasComponentRef}
                processedData={processedData}
                coloredRegions={coloredRegions}
                highlightedRegions={highlightedRegions}
                selectedColor={selectedColor}
                showNumbers={showNumbers}
                displayMode={displayMode}
                onRegionClick={colorRegion}
              />
            </div>
            
            <aside className="game-sidebar">
              <div className="sidebar-instruction">
                {selectedColor === null 
                  ? 'Select a color to start'
                  : 'Tap highlighted regions to fill them'
                }
              </div>
              <div className="sidebar-controls">
                <button
                  className={`sidebar-btn toggle ${showNumbers ? 'active' : ''}`}
                  onClick={() => setShowNumbers(v => !v)}
                >
                  {showNumbers ? '123 Hide' : '123 Show'}
                </button>
                <button
                  className="sidebar-btn"
                  onClick={triggerHint}
                  disabled={selectedColor === null}
                >
                  Hint
                </button>
              </div>
              <div className="sidebar-controls">
                <button
                  className={`sidebar-btn toggle-mode ${highlightMode === 'persistent' ? 'persistent' : 'timed'}`}
                  onClick={() => setHighlightMode(m => m === 'persistent' ? 'timed' : 'persistent')}
                  title={highlightMode === 'persistent' 
                    ? 'Highlight stays on while color is selected' 
                    : 'Highlight fades after 2 seconds'}
                >
                  {highlightMode === 'persistent' ? 'Highlight: Always' : 'Highlight: Timed'}
                </button>
              </div>
              <div className="sidebar-controls">
                <label className="display-mode-label">Display:</label>
                <select
                  className="display-mode-select"
                  value={displayMode}
                  onChange={(e) => setDisplayMode(e.target.value)}
                >
                  <option value="grayout">Grayout</option>
                  <option value="outlined">Outlined</option>
                  <option value="extreme">Extreme</option>
                </select>
              </div>
              <ColorPalette
                palette={processedData?.palette}
                selectedColor={selectedColor}
                onColorSelect={handleColorSelect}
                colorProgress={colorProgress}
                activeColors={activeColors}
              />
            </aside>
          </div>
        )}
      </main>

      {isComplete && (
        <CompletionScreen
          originalImage={processedData?.originalImage}
          onNewGame={handleNewGame}
        />
      )}
    </div>
  );
}

export default App;
