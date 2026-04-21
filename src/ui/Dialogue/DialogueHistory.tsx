import { useEffect, useRef } from 'react';
import { useDialogueHistoryStore } from '../../state/dialogueHistoryStore';
import './DialogueHistory.css';

interface Props {
  onClose: () => void;
}

/**
 * Dialogue history log — shows the last ~200 lines of dialogue.
 * Triggered by Tab in-game. P5-styled panel with scrollable log.
 */
export function DialogueHistory({ onClose }: Props) {
  const entries = useDialogueHistoryStore((s) => s.entries);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Auto-scroll to newest at bottom on open
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Tab') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="dlg-hist" onClick={onClose}>
      <div className="dlg-hist__panel" onClick={(e) => e.stopPropagation()}>
        <h2 className="dlg-hist__title">DIALOGUE LOG</h2>
        <div className="dlg-hist__scroll" ref={scrollRef}>
          {entries.length === 0 ? (
            <p className="dlg-hist__empty">No dialogue has been recorded yet.</p>
          ) : (
            <ul className="dlg-hist__list">
              {entries.map((entry, i) => (
                <li key={i} className={`dlg-hist__entry dlg-hist__entry--${entry.speaker === 'Narrator' ? 'narrator' : 'speaker'}`}>
                  <span className="dlg-hist__speaker">{entry.speaker}</span>
                  <span className="dlg-hist__text">{entry.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className="dlg-hist__close" onClick={onClose}>
          Close (Tab)
        </button>
      </div>
    </div>
  );
}
