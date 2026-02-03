import { rgbToHex, getContrastColor } from '../utils/colorUtils';
import './ColorPalette.css';

export function ColorPalette({ 
  palette, 
  selectedColor, 
  onColorSelect, 
  colorProgress,
  activeColors 
}) {
  if (!palette || palette.length === 0) return null;

  return (
    <div className="color-palette">
      <h3 className="palette-title">Colors</h3>
      <div className="palette-grid">
        {palette.map((color, idx) => {
          const progress = colorProgress.get(idx) || { total: 0, colored: 0 };
          const isActive = activeColors.includes(idx);
          const isSelected = selectedColor === idx;
          const isComplete = progress.total > 0 && progress.colored === progress.total;
          const percentage = progress.total > 0 
            ? Math.round((progress.colored / progress.total) * 100) 
            : 0;

          if (isComplete) return null; // Hide completed colors

          return (
            <button
              key={idx}
              className={`color-swatch ${isSelected ? 'selected' : ''} ${!isActive ? 'inactive' : ''}`}
              style={{
                '--swatch-color': rgbToHex(color),
                '--text-color': getContrastColor(color),
                '--progress': `${percentage}%`
              }}
              onClick={() => onColorSelect(idx)}
              title={`${progress.colored}/${progress.total}`}
            >
              <div className="swatch-inner">
                <span className="swatch-number">{idx + 1}</span>
              </div>
              <div className="progress-ring">
                <svg viewBox="0 0 36 36">
                  <path
                    className="progress-bg"
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="progress-fill"
                    strokeDasharray={`${percentage}, 100`}
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>
              <span className="swatch-count">{progress.total - progress.colored}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ColorPalette;
