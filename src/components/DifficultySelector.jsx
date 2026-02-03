import { useState } from 'react';
import './DifficultySelector.css';

const DIFFICULTIES = [
  { id: 'beginner', label: 'Beginner', description: '~150 regions', emoji: '🌱' },
  { id: 'mid', label: 'Medium', description: '~300 regions', emoji: '🌿' },
  { id: 'pro', label: 'Pro', description: '~550 regions', emoji: '🌳' }
];

const PALETTE_SIZES = [5, 8, 10, 12, 15, 20];

export function DifficultySelector({ 
  difficulty, 
  setDifficulty, 
  paletteSize, 
  setPaletteSize,
  disabled 
}) {
  return (
    <div className={`difficulty-selector ${disabled ? 'disabled' : ''}`}>
      <div className="selector-section">
        <label className="section-label">Difficulty Level</label>
        <div className="difficulty-options">
          {DIFFICULTIES.map(d => (
            <button
              key={d.id}
              className={`difficulty-btn ${difficulty === d.id ? 'selected' : ''}`}
              onClick={() => setDifficulty(d.id)}
              disabled={disabled}
            >
              <span className="difficulty-emoji">{d.emoji}</span>
              <span className="difficulty-label">{d.label}</span>
              <span className="difficulty-desc">{d.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="selector-section">
        <label className="section-label">
          Number of Colors: <strong>{paletteSize}</strong>
        </label>
        <input
          type="range"
          min="5"
          max="20"
          value={paletteSize}
          onChange={(e) => setPaletteSize(Number(e.target.value))}
          disabled={disabled}
          className="palette-slider"
        />
        <div className="palette-labels">
          <span>Simple (5)</span>
          <span>Detailed (20)</span>
        </div>
      </div>
    </div>
  );
}

export default DifficultySelector;
