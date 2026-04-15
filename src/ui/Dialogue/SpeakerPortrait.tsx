import type { Expression } from '../../engine/dialogue';

/**
 * Placeholder portrait. Real anime-style art arrives when the asset
 * pipeline is ready. For now: a colored circle with the speaker's
 * first initial, plus a small expression label.
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
}: Props) {
  const initial = name.charAt(0).toUpperCase();
  const label = EXPRESSION_LABEL[expression];
  const classes = [
    'dlg-portrait',
    `dlg-portrait--${size}`,
    active ? '' : 'is-dim',
    speaking ? 'is-speaking' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <figure
      className={classes}
      aria-label={`${name}, ${expression}`}
    >
      <div
        className="dlg-portrait__circle"
        style={{ background: bgColor, color: fgColor }}
      >
        <span className="dlg-portrait__initial">{initial}</span>
      </div>
      <figcaption className="dlg-portrait__name">{name}</figcaption>
      {expression !== 'neutral' && (
        <span className="dlg-portrait__expression" aria-hidden="true">
          {label}
        </span>
      )}
    </figure>
  );
}
