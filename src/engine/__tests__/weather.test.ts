import { describe, it, expect, beforeEach } from 'vitest';
import { useTimeStore, type Weather } from '../../state/timeStore';

const ALL_WEATHERS: readonly Weather[] = ['clear', 'rain', 'storm', 'fog', 'snow'];

describe('weather state', () => {
  beforeEach(() => {
    useTimeStore.getState().reset();
  });

  it('defaults to clear', () => {
    expect(useTimeStore.getState().weather).toBe('clear');
  });

  it('setWeather updates the store', () => {
    useTimeStore.getState().setWeather('storm');
    expect(useTimeStore.getState().weather).toBe('storm');
  });

  it('advanceWeather always produces a valid Weather value', () => {
    // Run many transitions; every step must land on one of the union values.
    for (let i = 0; i < 200; i++) {
      useTimeStore.getState().advanceWeather('GreenhollowScene');
      const w = useTimeStore.getState().weather;
      expect(ALL_WEATHERS).toContain(w);
    }
  });

  it('snow is gated to cold zones', () => {
    // Force a snow state, then advance into a non-cold zone many times.
    // Outgoing transitions out of snow into a non-cold zone must NOT
    // produce snow again (no fresh snow rolls outside cold zones).
    useTimeStore.getState().setWeather('snow');
    let sawSnow = 0;
    for (let i = 0; i < 80; i++) {
      useTimeStore.getState().advanceWeather('GreenhollowScene');
      if (useTimeStore.getState().weather === 'snow') sawSnow++;
      // Re-arm: force snow back so we exercise the outgoing transition
      // each iteration (otherwise we'd land on non-snow and stay there).
      useTimeStore.getState().setWeather('snow');
    }
    // Allow exactly zero snow re-rolls outside cold zones.
    expect(sawSnow).toBe(0);
  });

  it('snow CAN appear in cold zones', () => {
    useTimeStore.getState().setWeather('clear');
    let sawSnow = 0;
    for (let i = 0; i < 200; i++) {
      // Cold-zone destination — rain rolls become snow.
      useTimeStore.getState().setWeather('clear');
      useTimeStore.getState().advanceWeather('FrosthollowScene');
      if (useTimeStore.getState().weather === 'snow') sawSnow++;
    }
    // Statistical: with the 0.25 rain weight on clear, we should see at
    // least a few snow rolls in 200 trials. Tolerant lower bound.
    expect(sawSnow).toBeGreaterThan(5);
  });
});
