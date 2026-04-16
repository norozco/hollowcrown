import type { Expression } from '../../engine/dialogue';

/**
 * Speaker portrait. If `portraitUrl` is provided, renders the real
 * anime-style PNG; otherwise falls back to the colored-circle
 * placeholder with the speaker's first initial. Mixed mode is fine —
 * NPCs with real art and NPCs without can share the same dialogue.
 */
interface Props {
  name: string;
  bgColor: string;
  fgColor: string;
  expression?: Expression;
  size?: 'small' | 'large';
  active?: boolean;
  /** When true, adds a glow + pulsing ring — use for the character
   *  currently speaking so their portrait has presence. */
  speaking?: boolean;
  /** Resolved bundle URL for a real portrait PNG. When present, the
   *  component renders the image instead of the placeholder circle. */
  portraitUrl?: string | null;
}

/**
 * Placeholder stage-direction words shown under the portrait. They read
 * like screenplay direction until real anime art supplies actual facial
 * expressions.
 */
const EXPRESSION_LABEL: Record<Expression, string> = {
  neutral: '',
  happy: 'smiles',
  sad: 'quiet',
  angry: 'angered',
  shocked: 'startled',
  thoughtful: 'watches you',
};

export function SpeakerPortrait({
  name,
  bgColor,
  fgColor,
  expression = 'neutral',
  size = 'large',
  active = true,
  speaking = false,
  portraitUrl = null,
}: Props) {
  const initial = name.charAt(0).toUpperCase();
  const label = EXPRESSION_LABEL[expression];
  const hasRealArt = !!portraitUrl;
  const classes = [
    'dlg-portrait',
    `dlg-portrait--${size}`,
    active ? '' : 'is-dim',
    speaking ? 'is-speaking' : '',
    hasRealArt ? 'dlg-portrait--art' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <figure className={classes} aria-label={`${name}, ${expression}`}>
      {hasRealArt ? (
        <div className="dlg-portrait__frame" style={{ borderColor: fgColor }}>
          <img
            src={portraitUrl!}
            alt={`${name}, ${expression}`}
            className="dlg-portrait__img"
          />
        </div>
      ) : (
        <div
          className="dlg-portrait__circle"
          style={{ background: bgColor, color: fgColor }}
        >
          <span className="dlg-portrait__initial">{initial}</span>
        </div>
      )}
      <figcaption className="dlg-portrait__name">{name}</figcaption>
      {/* Real art conveys expression visually; no word-label needed. */}
      {!hasRealArt && expression !== 'neutral' && (
        <span className="dlg-portrait__expression" aria-hidden="true">
          {label}
        </span>
      )}
    </figure>
  );
}
