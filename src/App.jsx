import { useState, useCallback } from 'react';
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

  // Handle reset current game
  const handleReset = useCallback(() => {
    if (window.confirm('Are you sure you want to reset? All progress will be lost.')) {
      resetGame();
    }
  }, [resetGame]);

  // Calculate stats
  const colorProgress = processedData ? getColorProgress() : new Map();
  const activeColors = processedData ? getActiveColors() : [];
  const highlightedRegions = processedData ? getHighlightedRegions() : new Set();
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
                processedData={processedData}
                coloredRegions={coloredRegions}
                highlightedRegions={highlightedRegions}
                selectedColor={selectedColor}
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
              <ColorPalette
                palette={processedData?.palette}
                selectedColor={selectedColor}
                onColorSelect={setSelectedColor}
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
