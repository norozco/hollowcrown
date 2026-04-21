/**
 * Gamepad support — maps Xbox/PlayStation buttons to existing keyboard
 * events so the rest of the game doesn't need to know about controllers.
 *
 * Mapping:
 *   Left stick / D-pad → WASD (movement)
 *   A / Cross          → E (interact) / Space (dialogue advance)
 *   B / Circle         → Escape (close menus)
 *   X / Square         → I (inventory)
 *   Y / Triangle       → Q (quest log)
 *   LB / L1            → (reserved)
 *   RB / R1            → M (map)
 *   Start / Options    → Escape (pause)
 *
 * Combat actions (when combat UI is open):
 *   A → 1 (attack)
 *   X → 2 (skill)
 *   B → 3 (defend)
 *   Y → 4 (flee)
 *   RB → 5 (item)
 */

interface PadState {
  buttons: boolean[];
  axes: number[];
}

let lastState: PadState = { buttons: [], axes: [] };
let pollInterval: number | null = null;
let connected = false;

// Button indexes (standard gamepad mapping)
const BTN = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  SELECT: 8, START: 9,
  L3: 10, R3: 11,
  DPAD_UP: 12, DPAD_DOWN: 13, DPAD_LEFT: 14, DPAD_RIGHT: 15,
};

const DEAD_ZONE = 0.35;

function dispatchKey(key: string, down: boolean): void {
  const type = down ? 'keydown' : 'keyup';
  window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
}

let movement = { up: false, down: false, left: false, right: false };

function updateMovement(newState: { up: boolean; down: boolean; left: boolean; right: boolean }): void {
  if (newState.up !== movement.up) dispatchKey('w', newState.up);
  if (newState.down !== movement.down) dispatchKey('s', newState.down);
  if (newState.left !== movement.left) dispatchKey('a', newState.left);
  if (newState.right !== movement.right) dispatchKey('d', newState.right);
  movement = newState;
}

function poll(): void {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  if (!pads) return;

  let pad: Gamepad | null = null;
  for (const p of pads) {
    if (p && p.connected) { pad = p; break; }
  }

  if (!pad) {
    if (connected) {
      connected = false;
      // Release any held movement keys
      updateMovement({ up: false, down: false, left: false, right: false });
    }
    return;
  }

  if (!connected) {
    connected = true;
    window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Controller connected.' }));
  }

  // Movement — left stick OR d-pad
  const lx = pad.axes[0] ?? 0;
  const ly = pad.axes[1] ?? 0;
  const dpadU = pad.buttons[BTN.DPAD_UP]?.pressed ?? false;
  const dpadD = pad.buttons[BTN.DPAD_DOWN]?.pressed ?? false;
  const dpadL = pad.buttons[BTN.DPAD_LEFT]?.pressed ?? false;
  const dpadR = pad.buttons[BTN.DPAD_RIGHT]?.pressed ?? false;

  updateMovement({
    up: ly < -DEAD_ZONE || dpadU,
    down: ly > DEAD_ZONE || dpadD,
    left: lx < -DEAD_ZONE || dpadL,
    right: lx > DEAD_ZONE || dpadR,
  });

  // Buttons — edge-triggered (fire on press, not hold)
  const curButtons = pad.buttons.map((b) => b.pressed);
  const prevButtons = lastState.buttons;

  const pressed = (i: number) => curButtons[i] && !prevButtons[i];

  // Detect if combat UI is active — if so, numbers map combat actions
  const inCombat = (() => {
    try {
      // Avoid circular deps; read from a global that InGameOverlay could set,
      // OR just send both the main key and the combat key (combat handler
      // will pick the right one based on phase).
      return false;
    } catch {
      return false;
    }
  })();
  void inCombat;

  if (pressed(BTN.A)) {
    // Context-sensitive: in combat = attack (1), otherwise interact (E) + dialogue advance (Space)
    dispatchKey('1', true);
    dispatchKey('e', true);
    dispatchKey(' ', true);
    setTimeout(() => {
      dispatchKey('1', false);
      dispatchKey('e', false);
      dispatchKey(' ', false);
    }, 50);
  }
  if (pressed(BTN.B)) {
    dispatchKey('3', true); // combat defend
    dispatchKey('Escape', true);
    setTimeout(() => {
      dispatchKey('3', false);
      dispatchKey('Escape', false);
    }, 50);
  }
  if (pressed(BTN.X)) {
    dispatchKey('2', true); // combat skill
    dispatchKey('i', true); // overworld inventory
    setTimeout(() => {
      dispatchKey('2', false);
      dispatchKey('i', false);
    }, 50);
  }
  if (pressed(BTN.Y)) {
    dispatchKey('4', true); // combat flee
    dispatchKey('q', true); // overworld quests
    setTimeout(() => {
      dispatchKey('4', false);
      dispatchKey('q', false);
    }, 50);
  }
  if (pressed(BTN.RB)) {
    dispatchKey('5', true); // combat item
    dispatchKey('m', true); // overworld map
    setTimeout(() => {
      dispatchKey('5', false);
      dispatchKey('m', false);
    }, 50);
  }
  if (pressed(BTN.START)) {
    dispatchKey('Escape', true);
    setTimeout(() => dispatchKey('Escape', false), 50);
  }

  lastState = { buttons: curButtons, axes: [...pad.axes] };
}

/** Start polling for gamepads. Call once on app start. */
export function initGamepadSupport(): void {
  if (pollInterval !== null) return;
  window.addEventListener('gamepadconnected', (e) => {
    const pad = (e as GamepadEvent).gamepad;
    window.dispatchEvent(new CustomEvent('gameMessage', {
      detail: `Controller connected: ${pad.id.substring(0, 40)}`,
    }));
  });
  pollInterval = window.setInterval(poll, 33); // ~30Hz
}

export function stopGamepadSupport(): void {
  if (pollInterval !== null) {
    window.clearInterval(pollInterval);
    pollInterval = null;
  }
}
