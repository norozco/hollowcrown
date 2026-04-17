import { useState, useEffect } from 'react';
import './OptionsMenu.css';

declare global {
  interface Window { __showFps?: boolean; }
}

interface Props { onClose: () => void; }

export function OptionsMenu({ onClose }: Props) {
  const [showFps, setShowFps] = useState(() => {
    const stored = localStorage.getItem('hc_showFps');
    const val = stored === 'true';
    window.__showFps = val;
    return val;
  });
  const [brightness, setBrightness] = useState(() => {
    const stored = localStorage.getItem('hc_brightness');
    return stored ? parseFloat(stored) : 1.0;
  });
  const [textSpeed, setTextSpeed] = useState(() => {
    return localStorage.getItem('hc_textSpeed') ?? 'normal';
  });

  // Apply stored brightness on mount so it takes effect immediately.
  useEffect(() => {
    const gameContainer = document.getElementById('phaser-container');
    if (gameContainer && brightness !== 1.0) {
      gameContainer.style.filter = `brightness(${brightness})`;
    }
  }, []);

  const handleFpsToggle = (checked: boolean) => {
    window.__showFps = checked;
    setShowFps(checked);
    localStorage.setItem('hc_showFps', String(checked));
  };

  const handleBrightness = (val: number) => {
    setBrightness(val);
    localStorage.setItem('hc_brightness', String(val));
    const gameContainer = document.getElementById('phaser-container');
    if (gameContainer) {
      gameContainer.style.filter = val === 1.0 ? '' : `brightness(${val})`;
    }
  };

  const handleTextSpeed = (val: string) => {
    setTextSpeed(val);
    localStorage.setItem('hc_textSpeed', val);
  };

  return (
    <div className="opts" role="dialog" aria-label="Options">
      <div className="opts__header">
        <h3>Options</h3>
        <button type="button" className="opts__close" onClick={onClose}>&#10005;</button>
      </div>

      <div className="opts__row">
        <span className="opts__label">FPS Counter</span>
        <input
          type="checkbox"
          className="opts__checkbox"
          checked={showFps}
          onChange={(e) => handleFpsToggle(e.target.checked)}
        />
      </div>

      <div className="opts__row">
        <span className="opts__label">Brightness</span>
        <input
          type="range"
          className="opts__slider"
          min="0.5" max="1.5" step="0.05"
          value={brightness}
          onChange={(e) => handleBrightness(parseFloat(e.target.value))}
        />
        <span className="opts__slider-val">{brightness.toFixed(2)}</span>
      </div>

      <div className="opts__row">
        <span className="opts__label">Text Speed</span>
        <select
          className="opts__select"
          value={textSpeed}
          onChange={(e) => handleTextSpeed(e.target.value)}
        >
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
        </select>
      </div>
    </div>
  );
}
