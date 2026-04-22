/**
 * Hollowcrown audio engine — procedural SFX + layered ambient music.
 * Uses Web Audio API. No external assets required.
 *
 * Volumes are read from `window.__volumeMaster / Music / Sfx` (set by
 * OptionsMenu from localStorage). Everything goes through these gains
 * so the volume sliders work live.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;

// Track currently playing music so we can crossfade
let currentMusicNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
let currentMusicTrack: string | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(ctx.destination);
  } catch {
    return null;
  }
  return ctx;
}

function applyVolumes(): void {
  if (!masterGain || !musicGain || !sfxGain) return;
  const master = window.__volumeMaster ?? 0.7;
  const music = window.__volumeMusic ?? 0.7;
  const sfx = window.__volumeSfx ?? 0.8;
  masterGain.gain.value = master;
  musicGain.gain.value = music;
  sfxGain.gain.value = sfx;
}

/** Resume audio context after a user gesture (browsers require this). */
export function unlockAudio(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  applyVolumes();
}

// ────────────────────────────────────────────────────────────────
// SFX — one-shot procedural sounds
// ────────────────────────────────────────────────────────────────

interface SfxConfig {
  /** Starting frequency in Hz. */
  freq: number;
  /** Ending frequency for pitch sweeps. Defaults to freq. */
  endFreq?: number;
  /** Wave type. */
  type?: OscillatorType;
  /** Duration in seconds. */
  duration: number;
  /** Peak volume (0-1, before master). */
  volume?: number;
  /** Optional noise overlay level (0-1). */
  noise?: number;
  /** Small delay before playing in seconds. */
  delay?: number;
}

function playSfx(cfg: SfxConfig): void {
  const c = getCtx();
  if (!c || !sfxGain) return;
  applyVolumes();

  const t = c.currentTime + (cfg.delay ?? 0);
  const dur = cfg.duration;
  const vol = cfg.volume ?? 0.3;

  // Tone
  const osc = c.createOscillator();
  osc.type = cfg.type ?? 'sine';
  osc.frequency.setValueAtTime(cfg.freq, t);
  if (cfg.endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, cfg.endFreq), t + dur);
  }

  const gain = c.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

  osc.connect(gain).connect(sfxGain);
  osc.start(t);
  osc.stop(t + dur + 0.05);

  // Noise overlay
  if (cfg.noise && cfg.noise > 0) {
    const bufferSize = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * cfg.noise;
    }
    const noiseSource = c.createBufferSource();
    noiseSource.buffer = buffer;
    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(vol * 0.5, t + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noiseSource.connect(noiseGain).connect(sfxGain);
    noiseSource.start(t);
    noiseSource.stop(t + dur + 0.05);
  }
}

/** Pre-built SFX library. */
export const Sfx = {
  /** Menu UI blip. */
  menuClick: () => playSfx({ freq: 880, endFreq: 1200, type: 'square', duration: 0.08, volume: 0.18 }),
  /** Menu hover / cursor move. */
  menuHover: () => playSfx({ freq: 660, type: 'sine', duration: 0.04, volume: 0.08 }),
  /** Dialogue advance tick. */
  dialogueTick: () => playSfx({ freq: 1100, type: 'sine', duration: 0.03, volume: 0.06 }),

  /** Combat: player attack hit. */
  attackHit: () => playSfx({ freq: 180, endFreq: 60, type: 'square', duration: 0.15, volume: 0.28, noise: 0.3 }),
  /** Combat: attack miss / whiff. */
  attackMiss: () => playSfx({ freq: 600, endFreq: 200, type: 'triangle', duration: 0.12, volume: 0.15, noise: 0.1 }),
  /** Combat: critical hit. */
  criticalHit: () => {
    playSfx({ freq: 120, endFreq: 40, type: 'sawtooth', duration: 0.25, volume: 0.4, noise: 0.4 });
    playSfx({ freq: 1200, endFreq: 400, type: 'square', duration: 0.18, volume: 0.2, delay: 0.02 });
  },
  /** Combat: player takes damage. */
  takeDamage: () => playSfx({ freq: 300, endFreq: 100, type: 'sawtooth', duration: 0.22, volume: 0.25, noise: 0.5 }),
  /** Combat: enemy defeated. */
  enemyDefeat: () => {
    playSfx({ freq: 520, endFreq: 80, type: 'sawtooth', duration: 0.5, volume: 0.32 });
    playSfx({ freq: 260, endFreq: 40, type: 'sine', duration: 0.6, volume: 0.2, delay: 0.1 });
  },
  /** Combat: you died. */
  playerDeath: () => {
    playSfx({ freq: 440, endFreq: 60, type: 'sawtooth', duration: 1.2, volume: 0.35 });
    playSfx({ freq: 200, endFreq: 30, type: 'triangle', duration: 1.4, volume: 0.25, delay: 0.05 });
  },
  /** Spell: fire. */
  spellFire: () => playSfx({ freq: 200, endFreq: 800, type: 'sawtooth', duration: 0.4, volume: 0.28, noise: 0.4 }),
  /** Spell: heal. */
  spellHeal: () => {
    playSfx({ freq: 660, endFreq: 1320, type: 'sine', duration: 0.35, volume: 0.2 });
    playSfx({ freq: 880, type: 'sine', duration: 0.3, volume: 0.15, delay: 0.08 });
  },
  /** Item pickup. */
  pickup: () => {
    playSfx({ freq: 880, endFreq: 1760, type: 'square', duration: 0.1, volume: 0.18 });
    playSfx({ freq: 1320, type: 'sine', duration: 0.08, volume: 0.12, delay: 0.05 });
  },
  /** Chest / big pickup. */
  chestOpen: () => {
    playSfx({ freq: 440, endFreq: 1320, type: 'triangle', duration: 0.4, volume: 0.25 });
    playSfx({ freq: 880, endFreq: 1760, type: 'sine', duration: 0.3, volume: 0.18, delay: 0.1 });
    playSfx({ freq: 1760, endFreq: 2640, type: 'square', duration: 0.2, volume: 0.12, delay: 0.2 });
  },
  /** Rare / legendary item found. */
  rareItem: () => {
    for (let i = 0; i < 5; i++) {
      playSfx({ freq: 880 + i * 220, type: 'sine', duration: 0.3, volume: 0.2, delay: i * 0.08 });
    }
  },
  /** Level up fanfare. */
  levelUp: () => {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => playSfx({ freq: f, type: 'square', duration: 0.12, volume: 0.2, delay: i * 0.09 }));
  },
  /** Rank up (bigger fanfare). */
  rankUp: () => {
    const notes = [392, 523, 659, 784, 988, 1319];
    notes.forEach((f, i) => playSfx({ freq: f, type: 'triangle', duration: 0.15, volume: 0.25, delay: i * 0.1 }));
  },
  /** Achievement unlock. */
  achievement: () => {
    playSfx({ freq: 784, type: 'sine', duration: 0.15, volume: 0.22 });
    playSfx({ freq: 988, type: 'sine', duration: 0.2, volume: 0.18, delay: 0.1 });
    playSfx({ freq: 1319, type: 'sine', duration: 0.3, volume: 0.15, delay: 0.2 });
  },
  /** Footstep (quiet, default). */
  footstep: () => playSfx({ freq: 120, type: 'triangle', duration: 0.06, volume: 0.05, noise: 0.15 }),
  /** Footstep — grass: soft rustle, hi-pass-ish noise, low volume. */
  footstepGrass: () => playSfx({ freq: 320, type: 'triangle', duration: 0.04, volume: 0.035, noise: 0.35 }),
  /** Footstep — stone: crisp click. */
  footstepStone: () => playSfx({ freq: 180, endFreq: 90, type: 'square', duration: 0.04, volume: 0.06, noise: 0.1 }),
  /** Footstep — water: low-pass wet splash. */
  footstepWater: () => playSfx({ freq: 90, type: 'sine', duration: 0.06, volume: 0.05, noise: 0.5 }),
  /** Footstep — wood: dull hollow thump. */
  footstepWood: () => playSfx({ freq: 140, endFreq: 80, type: 'triangle', duration: 0.05, volume: 0.07, noise: 0.08 }),
  /** Door / gate unlock. */
  unlock: () => {
    playSfx({ freq: 300, type: 'square', duration: 0.08, volume: 0.2 });
    playSfx({ freq: 180, type: 'triangle', duration: 0.15, volume: 0.25, delay: 0.08 });
  },
  /** Trap triggered (spikes). */
  trap: () => playSfx({ freq: 200, endFreq: 80, type: 'sawtooth', duration: 0.3, volume: 0.3, noise: 0.6 }),
  /** Boss intro stinger. */
  bossIntro: () => {
    playSfx({ freq: 110, type: 'sawtooth', duration: 1.2, volume: 0.4, noise: 0.3 });
    playSfx({ freq: 55, type: 'triangle', duration: 1.5, volume: 0.35, delay: 0.1 });
    playSfx({ freq: 220, endFreq: 880, type: 'square', duration: 0.8, volume: 0.25, delay: 0.4 });
  },
  /** Flee success. */
  flee: () => playSfx({ freq: 660, endFreq: 220, type: 'triangle', duration: 0.2, volume: 0.2 }),
  /** Menu open / close. */
  menuOpen: () => playSfx({ freq: 220, endFreq: 440, type: 'square', duration: 0.08, volume: 0.15 }),
  menuClose: () => playSfx({ freq: 440, endFreq: 220, type: 'square', duration: 0.08, volume: 0.15 }),
  /** Echo Stone sonar pulse — low rumble + rising tone overlay. */
  echoPulse: () => {
    playSfx({ freq: 80, endFreq: 50, type: 'sine', duration: 0.7, volume: 0.22, noise: 0.15 });
    playSfx({ freq: 400, endFreq: 800, type: 'triangle', duration: 0.4, volume: 0.18, delay: 0.02 });
    playSfx({ freq: 1200, endFreq: 600, type: 'sine', duration: 0.35, volume: 0.1, delay: 0.25 });
  },
  /** Echo Stone on cooldown — short negative blip. */
  echoDenied: () => playSfx({ freq: 200, endFreq: 100, type: 'triangle', duration: 0.1, volume: 0.12 }),
  /** Coin / gold sound. */
  coin: () => {
    playSfx({ freq: 1320, type: 'square', duration: 0.05, volume: 0.18 });
    playSfx({ freq: 1760, type: 'square', duration: 0.08, volume: 0.15, delay: 0.04 });
  },
};

// ────────────────────────────────────────────────────────────────
// Music — looping atmospheric drones + arpeggios
// ────────────────────────────────────────────────────────────────

interface MusicTrack {
  /** Drone base frequency. */
  drone: number;
  /** Drone wave type. */
  droneType?: OscillatorType;
  /** Melody arpeggio frequencies (Hz), played in loop. */
  arp?: number[];
  /** Arpeggio note duration in seconds. */
  arpDur?: number;
  /** Overall volume scale. */
  vol?: number;
}

const MUSIC_TRACKS: Record<string, MusicTrack> = {
  town: {
    drone: 130.81, // C3
    droneType: 'triangle',
    arp: [261.63, 329.63, 392.00, 523.25], // C major
    arpDur: 0.8,
    vol: 0.12,
  },
  forest: {
    drone: 146.83, // D3
    droneType: 'sine',
    arp: [293.66, 369.99, 440.00, 587.33], // D major
    arpDur: 1.0,
    vol: 0.1,
  },
  dungeon: {
    drone: 110.00, // A2
    droneType: 'sawtooth',
    arp: [220.00, 261.63, 329.63, 415.30], // A minor
    arpDur: 0.9,
    vol: 0.1,
  },
  combat: {
    drone: 87.31, // F2
    droneType: 'sawtooth',
    arp: [174.61, 207.65, 261.63, 349.23], // F minor, urgent
    arpDur: 0.4,
    vol: 0.15,
  },
  boss: {
    drone: 65.41, // C2 — deep
    droneType: 'square',
    arp: [130.81, 155.56, 196.00, 233.08, 196.00, 155.56], // C minor crawl
    arpDur: 0.5,
    vol: 0.18,
  },
  menu: {
    drone: 164.81, // E3
    droneType: 'triangle',
    arp: [329.63, 493.88, 659.25], // E major arpeggio
    arpDur: 1.2,
    vol: 0.1,
  },
  ending: {
    drone: 130.81,
    droneType: 'sine',
    arp: [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25], // slow C major
    arpDur: 1.5,
    vol: 0.15,
  },
};

function stopMusic(): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  for (const node of currentMusicNodes) {
    try {
      node.gain.gain.cancelScheduledValues(now);
      node.gain.gain.setValueAtTime(node.gain.gain.value, now);
      node.gain.gain.linearRampToValueAtTime(0, now + 0.5);
      node.osc.stop(now + 0.6);
    } catch {
      // Already stopped
    }
  }
  currentMusicNodes = [];
  currentMusicTrack = null;
}

let arpInterval: number | null = null;

/** Play a music track by key. Crossfades from current track. */
export function playMusic(trackKey: string): void {
  const c = getCtx();
  if (!c || !musicGain) return;
  if (currentMusicTrack === trackKey) return; // already playing
  applyVolumes();

  const track = MUSIC_TRACKS[trackKey];
  if (!track) return;

  // Stop old
  stopMusic();
  if (arpInterval !== null) {
    clearInterval(arpInterval);
    arpInterval = null;
  }

  const now = c.currentTime;
  const vol = track.vol ?? 0.12;

  // Drone layer
  const droneOsc = c.createOscillator();
  droneOsc.type = track.droneType ?? 'triangle';
  droneOsc.frequency.value = track.drone;
  const droneGain = c.createGain();
  droneGain.gain.setValueAtTime(0, now);
  droneGain.gain.linearRampToValueAtTime(vol * 0.5, now + 2);
  droneOsc.connect(droneGain).connect(musicGain);
  droneOsc.start(now);
  currentMusicNodes.push({ osc: droneOsc, gain: droneGain });

  // Harmonic layer (fifth above)
  const harmOsc = c.createOscillator();
  harmOsc.type = 'sine';
  harmOsc.frequency.value = track.drone * 1.5;
  const harmGain = c.createGain();
  harmGain.gain.setValueAtTime(0, now);
  harmGain.gain.linearRampToValueAtTime(vol * 0.3, now + 2);
  harmOsc.connect(harmGain).connect(musicGain);
  harmOsc.start(now);
  currentMusicNodes.push({ osc: harmOsc, gain: harmGain });

  // Arpeggio layer — scheduled as repeating setInterval
  if (track.arp && track.arp.length > 0) {
    const arpDur = track.arpDur ?? 0.8;
    let step = 0;
    const playArpNote = () => {
      const cur = getCtx();
      if (!cur || !musicGain) return;
      const note = track.arp![step % track.arp!.length];
      step++;
      const ac = cur.currentTime;
      const noteOsc = cur.createOscillator();
      noteOsc.type = 'sine';
      noteOsc.frequency.value = note;
      const noteGain = cur.createGain();
      noteGain.gain.setValueAtTime(0, ac);
      noteGain.gain.linearRampToValueAtTime(vol * 0.4, ac + 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, ac + arpDur * 0.9);
      noteOsc.connect(noteGain).connect(musicGain);
      noteOsc.start(ac);
      noteOsc.stop(ac + arpDur);
    };

    // Start arp after drone ramps in
    setTimeout(() => {
      playArpNote();
      arpInterval = window.setInterval(playArpNote, arpDur * 1000);
    }, 1500);
  }

  currentMusicTrack = trackKey;
}

export function stopAllMusic(): void {
  stopMusic();
  if (arpInterval !== null) {
    clearInterval(arpInterval);
    arpInterval = null;
  }
}

declare global {
  interface Window {
    __volumeMaster?: number;
    __volumeMusic?: number;
    __volumeSfx?: number;
  }
}
