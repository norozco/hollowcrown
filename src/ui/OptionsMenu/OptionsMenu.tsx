import { useState, useEffect } from 'react';
import './OptionsMenu.css';
import './accessibility.css';

declare global {
  interface Window {
    __showFps?: boolean;
    __shakeIntensity?: number;
    __volumeMaster?: number;
    __volumeMusic?: number;
    __volumeSfx?: number;
    __reduceMotion?: boolean;
  }
}

interface Props { onClose: () => void; }

type ColorblindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

const COLORBLIND_FILTERS: Record<ColorblindMode, string> = {
  none: '',
  deuteranopia: 'sepia(0.4) hue-rotate(-20deg) saturate(1.2)',
  protanopia: 'sepia(0.3) hue-rotate(20deg) saturate(0.8)',
  tritanopia: 'sepia(0.2) hue-rotate(180deg) saturate(1.2)',
};

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
const readStr = (key: string, dflt: string): string => {
  const s = localStorage.getItem(key);
  return s == null ? dflt : s;
};

/** Combine brightness and colorblind filter into a single CSS filter string. */
function buildPhaserFilter(brightness: number, cbMode: ColorblindMode): string {
  const parts: string[] = [];
  if (brightness !== 1.0) parts.push(`brightness(${brightness})`);
  const cbFilter = COLORBLIND_FILTERS[cbMode];
  if (cbFilter) parts.push(cbFilter);
  return parts.join(' ');
}

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
  const cbMode = (readStr('hc_colorblind', 'none') as ColorblindMode);
  const el = document.getElementById('phaser-container');
  if (el) {
    const f = buildPhaserFilter(brightness, cbMode);
    el.style.filter = f;
  }

  // Text scale: 80-150 stored as integer percent.
  const textScale = readNum('hc_text_scale', 100) / 100;
  document.documentElement.style.setProperty('--text-scale', String(textScale));

  // Reduce motion
  const reduceMotion = readBool('hc_reduce_motion', false);
  window.__reduceMotion = reduceMotion;
  document.body.classList.toggle('reduce-motion', reduceMotion);

  // High contrast
  const highContrast = readBool('hc_high_contrast', false);
  document.body.classList.toggle('high-contrast', highContrast);
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

  // Accessibility state
  const [textScale, setTextScale] = useState(() => readNum('hc_text_scale', 100));
  const [reduceMotion, setReduceMotion] = useState(() => readBool('hc_reduce_motion', false));
  const [colorblind, setColorblind] = useState<ColorblindMode>(() => (readStr('hc_colorblind', 'none') as ColorblindMode));
  const [highContrast, setHighContrast] = useState(() => readBool('hc_high_contrast', false));

  // Sync globals on mount.
  useEffect(() => {
    window.__volumeMaster = volMaster / 100;
    window.__volumeMusic = volMusic / 100;
    window.__volumeSfx = volSfx / 100;
    window.__shakeIntensity = shake / 100;
    window.__showFps = showFps;
    const el = document.getElementById('phaser-container');
    if (el) el.style.filter = buildPhaserFilter(brightness, colorblind);
    document.documentElement.style.setProperty('--text-scale', String(textScale / 100));
    window.__reduceMotion = reduceMotion;
    document.body.classList.toggle('reduce-motion', reduceMotion);
    document.body.classList.toggle('high-contrast', highContrast);
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

  const applyPhaserFilter = (b: number, cb: ColorblindMode) => {
    const el = document.getElementById('phaser-container');
    if (el) el.style.filter = buildPhaserFilter(b, cb);
  };

  const handleBrightness = (val: number) => {
    setBrightness(val);
    localStorage.setItem('hc_brightness', String(val));
    applyPhaserFilter(val, colorblind);
  };

  const handleToggle = (key: string, setter: (b: boolean) => void) => (val: boolean) => {
    setter(val);
    localStorage.setItem(key, String(val));
    if (key === 'hc_showFps') window.__showFps = val;
  };

  const handleTextScale = (val: number) => {
    setTextScale(val);
    localStorage.setItem('hc_text_scale', String(val));
    document.documentElement.style.setProperty('--text-scale', String(val / 100));
  };

  const handleReduceMotion = (val: boolean) => {
    setReduceMotion(val);
    localStorage.setItem('hc_reduce_motion', String(val));
    window.__reduceMotion = val;
    document.body.classList.toggle('reduce-motion', val);
  };

  const handleColorblind = (val: ColorblindMode) => {
    setColorblind(val);
    localStorage.setItem('hc_colorblind', val);
    applyPhaserFilter(brightness, val);
  };

  const handleHighContrast = (val: boolean) => {
    setHighContrast(val);
    localStorage.setItem('hc_high_contrast', String(val));
    document.body.classList.toggle('high-contrast', val);
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

        <div className="opts__section">
          <div className="opts__section-title">Accessibility</div>
          <Slider label="Text Size" value={textScale} min={80} max={150} step={5}
            onChange={handleTextScale} suffix="%" />
          <Toggle label="Reduce Motion" value={reduceMotion}
            onChange={handleReduceMotion} />
          <div className="opts__row">
            <span className="opts__label">Colorblind Mode</span>
            <select
              className="opts__select"
              value={colorblind}
              onChange={(e) => handleColorblind(e.target.value as ColorblindMode)}
            >
              <option value="none">None</option>
              <option value="deuteranopia">Deuteranopia</option>
              <option value="protanopia">Protanopia</option>
              <option value="tritanopia">Tritanopia</option>
            </select>
          </div>
          <Toggle label="High Contrast UI" value={highContrast}
            onChange={handleHighContrast} />
        </div>

        <div className="opts__section">
          <div className="opts__section-title">Controls</div>
          <div className="opts__controls-table">
            <span className="opts__controls-key">WASD / Arrows</span>
            <span className="opts__controls-desc">Move</span>
            <span className="opts__controls-key">E</span>
            <span className="opts__controls-desc">Interact / Attack</span>
            <span className="opts__controls-key">I</span>
            <span className="opts__controls-desc">Inventory</span>
            <span className="opts__controls-key">Q</span>
            <span className="opts__controls-desc">Quests</span>
            <span className="opts__controls-key">M</span>
            <span className="opts__controls-desc">Dungeon Map</span>
            <span className="opts__controls-key">Space / Enter</span>
            <span className="opts__controls-desc">Advance dialogue</span>
            <span className="opts__controls-key">Escape</span>
            <span className="opts__controls-desc">Pause / Close menu</span>
            <span className="opts__controls-key">1 - 5</span>
            <span className="opts__controls-desc">Combat actions</span>
            <span className="opts__controls-key">Gamepad</span>
            <span className="opts__controls-desc">Auto-detected</span>
          </div>
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
