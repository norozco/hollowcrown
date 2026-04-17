# Combat System Bug Fixes

## Bug 1 (CRITICAL): Duplicate enemy-turn scheduling causes infinite loop

**File:** `src/state/combatStore.ts` (act method)

**Root cause:** When `playerAct()` returned the same state object (no-op because
phase was wrong), the store still called `set({ state: next })` and then checked
`next.phase === 'enemy_turn'`. If the state was already in `enemy_turn` (due to
a stale closure or rapid key press), this scheduled ANOTHER `setTimeout` for the
enemy, creating duplicate enemy-turn handlers that snowballed into an infinite
loop of state transitions.

**Fix:** Added an identity check `if (next === state) return;` after calling
`playerAct()`. If the engine returns the exact same object reference, it means
the action was a no-op (wrong phase), so we bail out without setting state or
scheduling the enemy turn.

## Bug 2 (CRITICAL): Stale closure in CombatOverlay keyboard handler

**File:** `src/ui/Combat/CombatOverlay.tsx` (useEffect keyboard handler)

**Root cause:** The `useEffect` keyboard handler captured `state` from the React
render cycle. Between the time the state changed (e.g., from `player_turn` to
`enemy_turn`) and React's next render (which would clean up the old handler),
the old handler still referenced the stale `state.phase === 'player_turn'`. A
keypress in this window would call `act('attack')`, which would then trigger Bug
1 above.

**Fix:** Changed the keyboard handler to read `useCombatStore.getState().state`
directly instead of using the captured `state` variable. This ensures the handler
always checks the current phase from the store, not a stale closure value.

## Bug 3 (CRITICAL): _enemyActing flag not checked in setTimeout callback

**File:** `src/state/combatStore.ts` (start and act methods)

**Root cause:** The `setTimeout` callbacks for enemy auto-act only checked
`s.state.phase === 'enemy_turn'` but not `s._enemyActing`. If `finish()` was
called (clearing `_enemyActing` to false) while a setTimeout was still pending,
or if multiple setTimeouts were queued, they could fire sequentially on already-
processed state.

**Fix:** Added `s._enemyActing &&` to the guard condition in both setTimeout
callbacks (in `start` and `act`). This ensures only one enemy-turn handler
actually executes.

## Bug 4 (MODERATE): Failed skill use wastes player's turn

**File:** `src/engine/combat.ts` (playerAct, skill action)

**Root cause:** When a player used the 'skill' action but had no skill available
or insufficient MP, the function logged the failure but then fell through to the
phase-transition code that set `phase = 'enemy_turn'`. This meant a failed skill
attempt still cost the player their turn.

**Fix:** For "no skill available", return the original state reference (treated
as a no-op by the store). For "insufficient MP", return a new state with the log
message but `phase` still set to `player_turn`, so the player can choose another
action.

## Test Coverage Added

**File:** `src/engine/__tests__/combat.test.ts`

- 10 simulated complete fights across all race/class combos vs all monsters
- Every fight must reach victory, defeat, or fled within 100 turns
- HP values validated: never NaN, never negative, never exceeds max
- Guard tests: playerAct no-op on wrong phase, enemyAct no-op on wrong phase
- Insufficient MP does not waste turn
- Flee action eventually resolves
- Defend action sets flag correctly
- Turn counter increments correctly
