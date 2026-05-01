import { useEffect, useMemo, useState } from 'react';
import { useDialogueStore } from '../../state/dialogueStore';
import { usePlayerStore } from '../../state/playerStore';
import { useQuestStore } from '../../state/questStore';
import { useDialogueMemoryStore } from '../../state/dialogueMemoryStore';
import { currentNode, meetsAllRequirements, type RequirementContext } from '../../engine/dialogue';
import { getCurrentRank } from '../../engine/ranks';
import { getNPC } from '../../engine/npcs';
import { SpeakerPortrait } from './SpeakerPortrait';
import { pickPortraitUrl } from './portraitAssets';
import { useTypewriter } from './useTypewriter';
import { Sfx } from '../../engine/audio';
import { useDialogueHistoryStore } from '../../state/dialogueHistoryStore';
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
  const quests = useQuestStore((s) => s.active);
  const greetingCounts = useDialogueMemoryStore((s) => s.greetingCount);

  /**
   * Snapshot of the player + world data the requirement evaluator reads.
   * Quest predicates already work off `quests`; the rest read from this
   * context. World-flag predicates pull from localStorage so callers can
   * gate dialogue on the same `hc_*` keys cutscenes already write.
   */
  const requirementCtx = useMemo<RequirementContext>(() => {
    const questsCompleted = Object.values(quests).filter((q) => q.turnedIn).length;
    const level = character?.level ?? 1;
    const rank = getCurrentRank(questsCompleted, level).key as
      'F' | 'E' | 'D' | 'C' | 'B' | 'A';
    // Lazy localStorage read — only the keys that any authored dialogue
    // currently checks. Adding a new flag means listing it here too.
    const readFlag = (k: string): boolean => {
      try {
        return typeof localStorage !== 'undefined' && localStorage.getItem(k) === 'true';
      } catch {
        return false;
      }
    };
    const worldFlags: Record<string, boolean> = {
      hc_mira_recovered: readFlag('hc_mira_recovered'),
      hc_mira_asked_why: readFlag('hc_mira_asked_why'),
      hc_mira_help_offered: readFlag('hc_mira_help_offered'),
      hc_mira_recruited: readFlag('hc_mira_recruited'),
      // NPC-quest flags (deserter / cloak / journal / debtor / forge / seal)
      hc_hesta_met: readFlag('hc_hesta_met'),
      hc_hesta_lied_for: readFlag('hc_hesta_lied_for'),
      hc_hesta_reported: readFlag('hc_hesta_reported'),
      hc_orric_daughter_known: readFlag('hc_orric_daughter_known'),
      hc_journal_found: readFlag('hc_journal_found'),
      hc_journal_to_tomas: readFlag('hc_journal_to_tomas'),
      hc_journal_to_vira: readFlag('hc_journal_to_vira'),
      hc_debt_collected: readFlag('hc_debt_collected'),
      hc_debt_forgiven: readFlag('hc_debt_forgiven'),
      hc_vira_marked_kind: readFlag('hc_vira_marked_kind'),
      hc_roa_grave_visited: readFlag('hc_roa_grave_visited'),
      hc_roa_remembered: readFlag('hc_roa_remembered'),
      hc_seal_reinforced: readFlag('hc_seal_reinforced'),
      hc_seal_failed: readFlag('hc_seal_failed'),
      hc_veyrin_dead: readFlag('hc_veyrin_dead'),
    };
    return { level, rank, greetingCounts, worldFlags };
  }, [character?.level, quests, greetingCounts]);

  /**
   * When the player picks a choice we don't immediately navigate to the
   * next node — instead we render the chosen line as the player speaking
   * (portraits swap, player name shown). The actual store.choose() fires
   * only on the *next* advance, giving the choice its own beat.
   */
  const [pendingChoice, setPendingChoice] = useState<number | null>(null);

  const node = dialogue && state ? currentNode(dialogue, state) : null;

  /**
   * Visible choices = original choices filtered by their `requires` against
   * the current quest state. We keep the ORIGINAL index on each so that
   * `store.choose(idx)` still points at the right node in the authored
   * dialogue graph after filtering collapses the visible list.
   */
  const visibleChoices = useMemo(() => {
    if (!node?.choices) return [];
    return node.choices
      .map((choice, idx) => ({ choice, idx }))
      .filter(({ choice }) => meetsAllRequirements(choice.requires, quests, requirementCtx));
  }, [node, quests, requirementCtx]);

  // Are we currently showing the player's staged response line? Computed
  // up here (before the keyboard effect) because the typewriter hook needs
  // it, and the keyboard effect references `tw` — so `tw` has to exist by
  // the time React evaluates that effect's deps array. Use optional
  // chaining so this is safe to run before the early-return below.
  const showingPlayerLine = pendingChoice !== null && !!node?.choices?.[pendingChoice];
  const stagedChoice = showingPlayerLine ? node!.choices![pendingChoice!] : null;
  const activeText = showingPlayerLine ? (stagedChoice?.text ?? '') : (node?.text ?? '');
  const tw = useTypewriter(activeText);

  // Clear the pending player line whenever the dialogue changes or ends.
  useEffect(() => {
    if (!dialogue) setPendingChoice(null);
  }, [dialogue]);

  // Keyboard handlers are always registered while a dialogue is active.
  useEffect(() => {
    if (!node) return;
    // Blur whatever was focused when dialogue opens, so Space doesn't
    // get eaten by a focused button (which would fire its onClick instead
    // of advancing the dialogue). User reported "Space doesn't skip"
    // when their cursor was last on a menu button.
    const focused = document.activeElement as HTMLElement | null;
    if (focused && focused !== document.body && typeof focused.blur === 'function') {
      try { focused.blur(); } catch { /* ignore */ }
    }
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        end();
        return;
      }

      // If we're showing the player's chosen line, Space/Enter commits
      // the choice in ONE press (skip typewriter + commit). User feedback:
      // two-press flow felt clunky.
      if (pendingChoice !== null) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (!tw.done) tw.skip();
          choose(pendingChoice);
          setPendingChoice(null);
        }
        return;
      }

      if (visibleChoices.length > 0 && tw.done) {
        // 1..9 selects by VISIBLE position — translate to the original
        // choice index so we navigate to the right node.
        const n = parseInt(e.key, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= visibleChoices.length) {
          e.preventDefault();
          setPendingChoice(visibleChoices[n - 1].idx);
        }
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        // Single press skips the typewriter AND advances. React batches
        // both state changes so the partial text never visibly flashes.
        if (!tw.done) tw.skip();
        advance();
      }
    };
    // useCapture so we run before any focused-button's default Space-as-click,
    // which was eating dialogue Space presses when focus was lingering on
    // a previously-clicked menu button.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [node, advance, choose, end, pendingChoice, visibleChoices, tw]);

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
  // Real portrait URL — null if this NPC has no art yet (falls back to
  // placeholder circle) or if we're rendering the narrator / player.
  const npcPortraitUrl = npc ? pickPortraitUrl(npc.portraits, node.expression) : null;

  // Play a subtle dialogue tick SFX every few characters
  useEffect(() => {
    if (!tw.done && tw.displayed.length > 0 && tw.displayed.length % 4 === 0) {
      Sfx.dialogueTick();
    }
  }, [tw.displayed, tw.done]);

  // Push to dialogue history when the line finishes typing.
  const pushHistory = useDialogueHistoryStore((s) => s.push);
  useEffect(() => {
    if (tw.done && activeText) {
      const speakerLabel = showingPlayerLine
        ? (character?.name ?? 'You')
        : isNarrator ? 'Narrator' : speakerName;
      pushHistory({ speaker: speakerLabel, text: activeText });
    }
    // Only fire when the line completes (tw.done flips true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tw.done, activeText]);

  const onClickTextBox = () => {
    // Single click both skips the typewriter and advances. React batches
    // the state changes so the partial text never visibly flashes — the
    // line moves forward in one press. Previously this required 2 clicks
    // (skip, then advance) which playtesters found clunky.
    if (!tw.done) tw.skip();
    if (showingPlayerLine) {
      choose(pendingChoice!);
      setPendingChoice(null);
      return;
    }
    // Don't auto-advance when the line has visible choices — the player
    // needs to pick. (If all choices are gated away, fall through.)
    if (visibleChoices.length > 0 && tw.done) return;
    advance();
  };

  // Name tag — the Persona 5 style banner above the speech bubble
  const nameTagName = showingPlayerLine && character
    ? character.name
    : (isNarrator ? '' : speakerName);
  const isPlayerTag = showingPlayerLine;

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
                portraitUrl={npcPortraitUrl}
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
                portraitUrl={npcPortraitUrl}
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
        {nameTagName && !isNarrator && (
          <div
            className={`dlg__name-tag${isPlayerTag ? ' dlg__name-tag--player' : ''}`}
            key={`tag-${nameTagName}-${node.id}-${pendingChoice ?? ''}`}
          >
            <span className="dlg__name-tag-inner">{nameTagName}</span>
          </div>
        )}
        {showingPlayerLine && character ? (
          <>
            <div className="dlg__speaker-line">
              <span className="dlg__speaker-name">{character.name}</span>
            </div>
            <p className="dlg__text">{tw.displayed}{!tw.done && <span className="dlg__caret">▊</span>}</p>
            {tw.done && <p className="dlg__advance-hint">▸ Press Space or click to continue</p>}
          </>
        ) : (
          <>
            {speakerName && (
              <div className="dlg__speaker-line">
                <span className="dlg__speaker-name">{speakerName}</span>
                {speakerTitle && <span className="dlg__speaker-title">{speakerTitle}</span>}
              </div>
            )}
            <p className="dlg__text">{tw.displayed}{!tw.done && <span className="dlg__caret">▊</span>}</p>

            {tw.done && visibleChoices.length > 0 ? (
              <ul className="dlg__choices" aria-label="Response options">
                {visibleChoices.map(({ choice, idx }, pos) => (
                  <li key={idx}>
                    <button
                      type="button"
                      className="dlg__choice"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingChoice(idx);
                      }}
                    >
                      <span className="dlg__choice-num">{pos + 1}</span>
                      <span className="dlg__choice-text">{choice.text}</span>
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
