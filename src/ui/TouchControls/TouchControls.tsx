import { useState, useRef, useCallback, useEffect } from 'react';
import './TouchControls.css';

function isTouchDevice() {
  // Only show on actual mobile/tablet — not laptops with touchscreens.
  // Check for coarse pointer (finger) as primary input, not just touch capability.
  if (typeof matchMedia !== 'undefined') {
    return matchMedia('(pointer: coarse)').matches && matchMedia('(hover: none)').matches;
  }
  return false;
}

declare global {
  interface Window {
    __touchInput?: { x: number; y: number };
  }
}

const JOYSTICK_RADIUS = 60; // half of the 120px outer circle
const NUB_MAX = 38;          // max nub travel in px

export function TouchControls() {
  const [visible] = useState(isTouchDevice);
  const [nubPos, setNubPos] = useState({ x: 0, y: 0 });
  const joystickRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);

  // Initialise the global so BaseWorldScene never reads undefined.
  useEffect(() => {
    window.__touchInput = { x: 0, y: 0 };
    return () => { window.__touchInput = { x: 0, y: 0 }; };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (touchIdRef.current !== null) return; // already tracking
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    e.preventDefault();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (touchIdRef.current === null) return;
    const el = joystickRef.current;
    if (!el) return;

    let touch: Touch | null = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touch = e.changedTouches[i];
        break;
      }
    }
    if (!touch) return;
    e.preventDefault();

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Normalised -1..1 values (clamped to circle)
    const nx = dist > 0 ? dx / Math.max(dist, JOYSTICK_RADIUS) : 0;
    const ny = dist > 0 ? dy / Math.max(dist, JOYSTICK_RADIUS) : 0;

    // Clamp nub travel to max radius
    const clamp = Math.min(dist / JOYSTICK_RADIUS, 1);
    setNubPos({ x: nx * NUB_MAX * clamp, y: ny * NUB_MAX * clamp });

    window.__touchInput = { x: nx, y: ny };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        break;
      }
    }
    setNubPos({ x: 0, y: 0 });
    window.__touchInput = { x: 0, y: 0 };
  }, []);

  const dispatchKey = (key: string, down: boolean) => {
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key, bubbles: true }));
  };

  if (!visible) return null;

  return (
    <div className="touch" aria-hidden="true">
      {/* Virtual joystick */}
      <div
        className="touch__joystick"
        ref={joystickRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          className="touch__nub"
          style={{ transform: `translate(calc(-50% + ${nubPos.x}px), calc(-50% + ${nubPos.y}px))` }}
        />
      </div>

      {/* Action buttons */}
      <div className="touch__buttons">
        <button
          type="button"
          className="touch__btn"
          onTouchStart={() => dispatchKey('e', true)}
          onTouchEnd={() => dispatchKey('e', false)}
          aria-label="Interact (E)"
        >
          E
        </button>
        <button
          type="button"
          className="touch__btn"
          onTouchStart={() => dispatchKey('i', true)}
          onTouchEnd={() => dispatchKey('i', false)}
          aria-label="Inventory (I)"
        >
          I
        </button>
        <button
          type="button"
          className="touch__btn"
          onTouchStart={() => dispatchKey('q', true)}
          onTouchEnd={() => dispatchKey('q', false)}
          aria-label="Quests (Q)"
        >
          Q
        </button>
      </div>
    </div>
  );
}
