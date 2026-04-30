import { create } from 'zustand';

/**
 * Day/night cycle. Time advances based on zone transitions, not real time.
 * Each phase applies a color tint overlay to outdoor scenes.
 */
export type TimePhase = 'dawn' | 'day' | 'dusk' | 'night';

/** Dynamic weather state. Advances on the same trigger as `phase` (zone
 *  transition). Snow only spawns in cold scenes (see SNOW_ZONE_REGEX). */
export type Weather = 'clear' | 'rain' | 'storm' | 'fog' | 'snow';

interface TimeState {
  phase: TimePhase;
  transitionsSincePhase: number;
  /** Current weather. Persisted across reload. */
  weather: Weather;
  /** Advance time — called on every zone transition. */
  tick: () => void;
  /** Jump directly to a specific phase (used when loading saves or resetting). */
  setPhase: (phase: TimePhase) => void;
  /** Set weather directly (cheats / save restore). */
  setWeather: (w: Weather) => void;
  /** Roll one weather transition. Pass the destination scene key so we
   *  can gate snow to cold zones. */
  advanceWeather: (destinationSceneKey?: string) => void;
  reset: () => void;
}

const PHASE_ORDER: TimePhase[] = ['day', 'dusk', 'night', 'dawn'];
const TRANSITIONS_PER_PHASE = 5;

const PHASE_MESSAGES: Record<TimePhase, string> = {
  dawn: 'The sky turns grey. Dawn is coming.',
  day: 'The sun is up. The road is safer.',
  dusk: 'Light fades. Something shifts.',
  night: 'Night has fallen. The dark is not empty.',
};

/**
 * Weather transition table. Each row is the current weather; columns
 * are weights for the next state. Picked via cumulative-probability
 * rolling. Snow-eligible zones substitute their own table (SNOW_TABLE).
 *
 * Tuned so:
 *   - Most days are clear; rain is the most common "wet" state.
 *   - Storm is the dramatic state; can persist or de-escalate to rain.
 *   - Fog is rarer and tends to clear quickly.
 */
const WEATHER_TABLE: Record<Weather, Array<[Weather, number]>> = {
  clear: [['clear', 0.60], ['rain', 0.25], ['fog', 0.15]],
  rain:  [['rain', 0.35], ['storm', 0.30], ['clear', 0.25], ['fog', 0.10]],
  storm: [['storm', 0.30], ['rain', 0.45], ['clear', 0.25]],
  fog:   [['fog', 0.40], ['clear', 0.45], ['rain', 0.15]],
  snow:  [['snow', 0.55], ['clear', 0.30], ['fog', 0.15]],
};

/** Cold-zone regex — these scenes substitute snow for rain on a roll. */
const SNOW_ZONE_REGEX = /frosthollow|frozen/i;

/** Weather log lines — Souls register, no exclamations. */
const WEATHER_MESSAGES: Record<Weather, string> = {
  clear: 'The sky clears.',
  rain:  'Rain begins to fall.',
  storm: 'The wind rises. Thunder, far off.',
  fog:   'Fog gathers low to the ground.',
  snow:  'Snow drifts down through the cold.',
};

function rollWeather(current: Weather, allowSnow: boolean): Weather {
  let table = WEATHER_TABLE[current] ?? WEATHER_TABLE.clear;
  // In cold zones, swap rain for snow on the outgoing distribution so
  // the cold biomes feel cold without breaking the underlying rules.
  if (allowSnow) {
    table = table.map<[Weather, number]>(([w, p]) => [w === 'rain' ? 'snow' : w, p]);
  } else {
    // Outside cold zones, snow can only de-escalate to clear — no fresh
    // snow rolls. (Defensive — snow only entered via snow-eligible
    // transitions in the first place.)
    table = table.map<[Weather, number]>(([w, p]) => [w === 'snow' ? 'clear' : w, p]);
  }
  const r = Math.random();
  let acc = 0;
  for (const [w, p] of table) {
    acc += p;
    if (r < acc) return w;
  }
  return table[table.length - 1][0];
}

export const useTimeStore = create<TimeState>((set, get) => ({
  phase: 'day',
  transitionsSincePhase: 0,
  weather: 'clear',

  tick: () => {
    const next = get().transitionsSincePhase + 1;
    if (next >= TRANSITIONS_PER_PHASE) {
      const currentIdx = PHASE_ORDER.indexOf(get().phase);
      const nextPhase = PHASE_ORDER[(currentIdx + 1) % PHASE_ORDER.length];
      set({ phase: nextPhase, transitionsSincePhase: 0 });
      window.dispatchEvent(new CustomEvent('gameMessage', {
        detail: PHASE_MESSAGES[nextPhase],
      }));
    } else {
      set({ transitionsSincePhase: next });
    }
  },

  setPhase: (phase) => set({ phase, transitionsSincePhase: 0 }),
  setWeather: (w) => set({ weather: w }),
  advanceWeather: (destinationSceneKey) => {
    const cur = get().weather;
    const allowSnow = !!destinationSceneKey && SNOW_ZONE_REGEX.test(destinationSceneKey);
    const next = rollWeather(cur, allowSnow);
    if (next !== cur) {
      set({ weather: next });
      window.dispatchEvent(new CustomEvent('gameMessage', {
        detail: WEATHER_MESSAGES[next],
      }));
    }
  },
  reset: () => set({ phase: 'day', transitionsSincePhase: 0, weather: 'clear' }),
}));

/** Get tint color + alpha for a phase. Returns null for 'day' (no tint). */
export function getPhaseTint(phase: TimePhase): { color: number; alpha: number } | null {
  switch (phase) {
    case 'dawn': return { color: 0xffa060, alpha: 0.15 };
    case 'day': return null;
    case 'dusk': return { color: 0xff6040, alpha: 0.2 };
    case 'night': return { color: 0x1a2850, alpha: 0.5 };
  }
}

/** Icon for HUD display. */
export function getPhaseIcon(phase: TimePhase): string {
  switch (phase) {
    case 'dawn': return '🌅';
    case 'day': return '☀';
    case 'dusk': return '🌇';
    case 'night': return '🌙';
  }
}

/** Icon for HUD display — single Unicode glyph per state. Matches the
 *  pattern used by getPhaseIcon (glyph-only, no labels). */
export function getWeatherIcon(weather: Weather): string {
  switch (weather) {
    case 'clear': return '☀';
    case 'rain':  return '🌧';
    case 'storm': return '⛈';
    case 'fog':   return '🌫';
    case 'snow':  return '❄';
  }
}
