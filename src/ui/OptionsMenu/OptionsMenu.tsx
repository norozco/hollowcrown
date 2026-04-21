import { useState, useEffect } from 'react';
import './OptionsMenu.css';

declare global {
  interface Window {
    __showFps?: boolean;
    __shakeIntensity?: number;
    __volumeMaster?: number;
    __volumeMusic?: number;
    __volumeSfx?: number;
  }
}

interface Props { onClose: () => void; }

// localStorage helpers with defaults.
const readNum = (key: string, dflt: number): number => {
  const s = localStorage.getItem(key);
  if (s == null) return dflt;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : dflt;
};
const readBool = (key: string, dflt: boolean): boolean => {
  const s = localStorage.getItem(key);
  if (s == null) return dflt;
  return s === 'true';
};

/**
 * Apply any user options that should be live on app start (not just while
 * the options menu is open). Call this once from the app entry point.
 */
export function applyStoredOptions(): void {
  window.__volumeMaster = readNum('hc_volume_master', 70) / 100;
  window.__volumeMusic = readNum('hc_volume_music', 70) / 100;
  window.__volumeSfx = readNum('hc_volume_sfx', 80) / 100;
  window.__shakeIntensity = readNum('hc_shake', 100) / 100;
  window.__showFps = readBool('hc_showFps', false);
  const brightness = readNum('hc_brightness', 1.0);
  const el = document.getElementById('phaser-container');
  if (el && brightness !== 1.0) el.style.filter = `brightness(${brightness})`;
}

export function OptionsMenu({ onClose }: Props) {
  const [volMaster, setVolMaster] = useState(() => readNum('hc_volume_master', 70));
  const [volMusic, setVolMusic] = useState(() => readNum('hc_volume_music', 70));
  const [volSfx, setVolSfx] = useState(() => readNum('hc_volume_sfx', 80));
  const [shake, setShake] = useState(() => readNum('hc_shake', 100));
  const [textSpeed, setTextSpeed] = useState(() => localStorage.getItem('hc_textSpeed') ?? 'normal');
  const [brightness, setBrightness] = useState(() => readNum('hc_brightness', 1.0));
  const [autosaveCombat, setAutosaveCombat] = useState(() => readBool('hc_autosave_combat', true));
  const [autosaveZone, setAutosaveZone] = useState(() => readBool('hc_autosave_zone', true));
  const [showFps, setShowFps] = useState(() => readBool('hc_showFps', false));

  // Sync globals on mount.
  useEffect(() => {
    window.__volumeMaster = volMaster / 100;
    window.__volumeMusic = volMusic / 100;
    window.__volumeSfx = volSfx / 100;
    window.__shakeIntensity = shake / 100;
    window.__showFps = showFps;
    const el = document.getElementById('phaser-container');
    if (el) el.style.filter = brightness === 1.0 ? '' : `brightness(${brightness})`;
    // Run only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setVol = (key: string, setter: (n: number) => void, globalKey: 'master' | 'music' | 'sfx') =>
    (val: number) => {
      setter(val);
      localStorage.setItem(key, String(val));
      if (globalKey === 'master') window.__volumeMaster = val / 100;
      else if (globalKey === 'music') window.__volumeMusic = val / 100;
      else window.__volumeSfx = val / 100;
    };

  const handleShake = (val: number) => {
    setShake(val);
    localStorage.setItem('hc_shake', String(val));
    window.__shakeIntensity = val / 100;
  };

  const handleTextSpeed = (val: string) => {
    setTextSpeed(val);
    localStorage.setItem('hc_textSpeed', val);
  };

  const handleBrightness = (val: number) => {
    setBrightness(val);
    localStorage.setItem('hc_brightness', String(val));
    const el = document.getElementById('phaser-container');
    if (el) el.style.filter = val === 1.0 ? '' : `brightness(${val})`;
  };

  const handleToggle = (key: string, setter: (b: boolean) => void) => (val: boolean) => {
    setter(val);
    localStorage.setItem(key, String(val));
    if (key === 'hc_showFps') window.__showFps = val;
  };

  return (
    <div className="opts-backdrop" role="dialog" aria-label="Options">
      <div className="opts">
        <div className="opts__header">
          <h3>Options</h3>
          <button type="button" className="opts__close" onClick={onClose} aria-label="Close">&#10005;</button>
        </div>

        <div className="opts__section">
          <div className="opts__section-title">Audio</div>
          <Slider label="Master Volume" value={volMaster} min={0} max={100} step={1}
            onChange={setVol('hc_volume_master', setVolMaster, 'master')} suffix="%" />
          <Slider label="Music Volume" value={volMusic} min={0} max={100} step={1}
            onChange={setVol('hc_volume_music', setVolMusic, 'music')} suffix="%" />
          <Slider label="SFX Volume" value={volSfx} min={0} max={100} step={1}
            onChange={setVol('hc_volume_sfx', setVolSfx, 'sfx')} suffix="%" />
        </div>

        <div className="opts__section">
          <div className="opts__section-title">Gameplay</div>
          <Slider label="Screen Shake" value={shake} min={0} max={100} step={1}
            onChange={handleShake} suffix="%" />
          <div className="opts__row">
            <span className="opts__label">Text Speed</span>
            <select
              className="opts__select"
              value={textSpeed}
              onChange={(e) => handleTextSpeed(e.target.value)}
            >
              <option value="slow">Slow</option>
              <option value="normal">Medium</option>
              <option value="fast">Fast</option>
            </select>
          </div>
          <Toggle label="Combat Autosave" value={autosaveCombat}
            onChange={handleToggle('hc_autosave_combat', setAutosaveCombat)} />
          <Toggle label="Zone Autosave" value={autosaveZone}
            onChange={handleToggle('hc_autosave_zone', setAutosaveZone)} />
        </div>

        <div className="opts__section">
          <div className="opts__section-title">Display</div>
          <Slider label="Brightness" value={brightness} min={0.5} max={1.5} step={0.05}
            onChange={handleBrightness} format={(v) => v.toFixed(2)} />
          <Toggle label="FPS Counter" value={showFps}
            onChange={handleToggle('hc_showFps', setShowFps)} />
        </div>

        <button type="button" className="opts__close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
  format?: (v: number) => string;
}

function Slider({ label, value, min, max, step, onChange, suffix, format }: SliderProps) {
  const display = format ? format(value) : `${Math.round(value)}${suffix ?? ''}`;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="opts__row">
      <span className="opts__label">{label}</span>
      <div className="opts__slider-wrap">
        <div className="opts__slider-track">
          <div className="opts__slider-fill" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range"
          className="opts__slider"
          min={min} max={max} step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
      <span className="opts__slider-val">{display}</span>
    </div>
  );
}

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <div className="opts__row">
      <span className="opts__label">{label}</span>
      <button
        type="button"
        className={`opts__toggle${value ? ' is-on' : ''}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
      >
        <span className="opts__toggle-knob" />
        <span className="opts__toggle-text">{value ? 'ON' : 'OFF'}</span>
      </button>
    </div>
  );
}
