import { useEffect, useState } from 'react';
import { useDialogueStore } from '../../state/dialogueStore';
import { usePlayerStore } from '../../state/playerStore';
import { currentNode } from '../../engine/dialogue';
import { getNPC } from '../../engine/npcs';
import { SpeakerPortrait } from './SpeakerPortrait';
import './DialogueScene.css';

/**
 * Full-screen dialogue overlay. Rendered when the dialogue store has an
 * active dialogue. Handles:
 *   - Portrait display (speaker prominent, player as small secondary)
 *   - Text box with speaker name + line
 *   - Choice buttons (1-9 number keys)
 *   - Space/Enter/click to advance auto-advance nodes
 *   - Escape to close (early-exit; later we may lock mandatory dialogues)
 */
export function DialogueScene() {
  const dialogue = useDialogueStore((s) => s.dialogue);
  const state = useDialogueStore((s) => s.state);
  const advance = useDialogueStore((s) => s.advance);
  const choose = useDialogueStore((s) => s.choose);
  const end = useDialogueStore((s) => s.end);
  const character = usePlayerStore((s) => s.character);

  /**
   * When the player picks a choice we don't immediately navigate to the
   * next node — instead we render the chosen line as the player speaking
   * (portraits swap, player name shown). The actual store.choose() fires
   * only on the *next* advance, giving the choice its own beat.
   */
  const [pendingChoice, setPendingChoice] = useState<number | null>(null);

  const node = dialogue && state ? currentNode(dialogue, state) : null;

  // Clear the pending player line whenever the dialogue changes or ends.
  useEffect(() => {
    if (!dialogue) setPendingChoice(null);
  }, [dialogue]);

  // Keyboard handlers are always registered while a dialogue is active.
  useEffect(() => {
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        end();
        return;
      }

      // If we're showing the player's chosen line, Space/Enter commits
      // the choice. Number keys are ignored in this mode.
      if (pendingChoice !== null) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          choose(pendingChoice);
          setPendingChoice(null);
        }
        return;
      }

      if (node.choices && node.choices.length > 0) {
        // 1..9 selects a choice — but stage it as the player's line first.
        const n = parseInt(e.key, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= node.choices.length) {
          e.preventDefault();
          setPendingChoice(n - 1);
        }
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [node, advance, choose, end, pendingChoice]);

  if (!node || !dialogue || !state) return null;

  const isNarrator = node.speaker === 'narrator';
  const isPlayer = node.speaker === 'player';
  const npc = !isNarrator && !isPlayer ? getNPC(node.speaker) : null;

  const speakerName = isNarrator
    ? ''
    : isPlayer
      ? (character?.name ?? 'You')
      : (npc?.name ?? node.speaker);

  const speakerTitle = isNarrator ? '' : isPlayer ? '' : (npc?.title ?? '');
  const portraitBg = isPlayer ? '#2a2030' : (npc?.portraitColor ?? '#3a2818');
  const portraitFg = isPlayer ? '#d4a968' : (npc?.accentColor ?? '#d4a968');

  // Are we currently showing the player's staged response line?
  const showingPlayerLine = pendingChoice !== null && node.choices;
  const stagedChoice = showingPlayerLine ? node.choices![pendingChoice!] : null;

  const onClickTextBox = () => {
    if (showingPlayerLine) {
      choose(pendingChoice!);
      setPendingChoice(null);
      return;
    }
    if (node.choices && node.choices.length > 0) return;
    advance();
  };

  return (
    <div
      className="dlg"
      role="dialog"
      aria-label={`Dialogue with ${speakerName || 'narrator'}`}
    >
      {/* key = who's speaking + which node; changes force remount so the
          CSS pop-in animation replays on every new line. */}
      <div
        className="dlg__portraits"
        key={`${showingPlayerLine ? 'player' : node.speaker}-${node.id}-${pendingChoice ?? 'nc'}`}
      >
        {showingPlayerLine && character ? (
          <>
            <SpeakerPortrait
              name={character.name}
              bgColor="#2a2030"
              fgColor="#d4a968"
              size="large"
              active={true}
              speaking={true}
            />
            {!isNarrator && (
              <SpeakerPortrait
                name={speakerName}
                bgColor={portraitBg}
                fgColor={portraitFg}
                size="small"
                active={false}
              />
            )}
          </>
        ) : (
          <>
            {!isNarrator && (
              <SpeakerPortrait
                name={speakerName}
                bgColor={portraitBg}
                fgColor={portraitFg}
                expression={node.expression}
                size="large"
                active={true}
                speaking={true}
              />
            )}
            {!isPlayer && character && (
              <SpeakerPortrait
                name={character.name}
                bgColor="#2a2030"
                fgColor="#d4a968"
                size="small"
                active={false}
              />
            )}
          </>
        )}
      </div>

      <div
        className={[
          'dlg__textbox',
          isNarrator && !showingPlayerLine ? 'dlg__textbox--narrator' : '',
          showingPlayerLine ? 'dlg__textbox--player-line' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={onClickTextBox}
        role="button"
        tabIndex={0}
        key={`tb-${showingPlayerLine ? 'p' : 'n'}-${node.id}-${pendingChoice ?? ''}`}
      >
        {showingPlayerLine && character ? (
          <>
            <div className="dlg__speaker-line">
              <span className="dlg__speaker-name">{character.name}</span>
            </div>
            <p className="dlg__text">{stagedChoice!.text}</p>
            <p className="dlg__advance-hint">▸ Press Space or click to continue</p>
          </>
        ) : (
          <>
            {speakerName && (
              <div className="dlg__speaker-line">
                <span className="dlg__speaker-name">{speakerName}</span>
                {speakerTitle && <span className="dlg__speaker-title">{speakerTitle}</span>}
              </div>
            )}
            <p className="dlg__text">{node.text}</p>

            {node.choices && node.choices.length > 0 ? (
              <ul className="dlg__choices" aria-label="Response options">
                {node.choices.map((c, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="dlg__choice"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingChoice(i);
                      }}
                    >
                      <span className="dlg__choice-num">{i + 1}</span>
                      <span className="dlg__choice-text">{c.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dlg__advance-hint">▸ Press Space or click to continue</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
