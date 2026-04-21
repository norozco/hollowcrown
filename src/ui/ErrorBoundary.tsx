import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

/**
 * Top-level React error boundary — catches render crashes so the
 * game doesn't white-screen. Shows a P5-styled recovery screen
 * with a reset option + full error details (copy to clipboard).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    console.error('Game crashed:', error, info);
    this.setState({ errorInfo: info.componentStack ?? '' });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: '' });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleCopyError = () => {
    const text = `${this.state.error?.stack ?? this.state.error?.message ?? 'Unknown error'}\n\n${this.state.errorInfo}`;
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  handleClearSave = () => {
    if (!confirm('Clear all saves and reload? This cannot be undone.')) return;
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('hc_')) localStorage.removeItem(key);
      }
    } catch { /* noop */ }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={crashStyles.root}>
        <div style={crashStyles.stripe} />
        <div style={crashStyles.panel}>
          <h1 style={crashStyles.title}>THE WORLD BROKE</h1>
          <p style={crashStyles.subtitle}>An unhandled error has brought everything to a halt.</p>

          <div style={crashStyles.errorBox}>
            <div style={crashStyles.errorLabel}>ERROR</div>
            <pre style={crashStyles.errorText}>
              {this.state.error?.message ?? 'Unknown error'}
            </pre>
          </div>

          <div style={crashStyles.buttonRow}>
            <button style={crashStyles.btnPrimary} onClick={this.handleReload}>
              Reload Game
            </button>
            <button style={crashStyles.btnSecondary} onClick={this.handleReset}>
              Try to Recover
            </button>
          </div>

          <div style={crashStyles.buttonRow}>
            <button style={crashStyles.btnGhost} onClick={this.handleCopyError}>
              Copy Error
            </button>
            <button style={crashStyles.btnDanger} onClick={this.handleClearSave}>
              Clear Saves &amp; Reload
            </button>
          </div>

          <p style={crashStyles.footer}>
            "The cairn remembers names. Not errors."
          </p>
        </div>
      </div>
    );
  }
}

const crashStyles: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    background:
      'radial-gradient(ellipse at 20% 30%, rgba(200, 30, 30, 0.28) 0%, transparent 55%), linear-gradient(135deg, #0a0606 0%, #1a0a0a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    padding: '2rem',
    overflow: 'auto',
  },
  stripe: {
    position: 'absolute',
    top: '15%',
    left: '-20%',
    right: '-20%',
    height: '220px',
    background: '#000',
    transform: 'rotate(-3deg)',
    boxShadow: '0 4px 0 rgba(200,30,30,0.4)',
    pointerEvents: 'none',
  },
  panel: {
    position: 'relative',
    background: '#fff',
    border: '4px solid #000',
    boxShadow: '12px 12px 0 #000',
    padding: '2rem',
    maxWidth: '640px',
    width: '100%',
    color: '#0a0a0a',
    transform: 'rotate(-0.5deg)',
    zIndex: 1,
  },
  title: {
    margin: '0 0 0.4rem',
    fontFamily: "Impact, 'Arial Black', sans-serif",
    fontSize: '2.6rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#fff',
    transform: 'rotate(-2deg) skewX(-4deg)',
    textShadow: '3px 3px 0 #c81e1e, 6px 6px 0 #000',
  },
  subtitle: {
    margin: '1rem 0 1.5rem',
    color: '#555',
    fontStyle: 'italic',
    fontSize: '0.95rem',
  },
  errorBox: {
    background: '#f7f7f4',
    border: '3px solid #000',
    padding: '0.75rem 1rem',
    marginBottom: '1.5rem',
  },
  errorLabel: {
    fontFamily: 'Impact, sans-serif',
    fontSize: '0.75rem',
    color: '#c81e1e',
    letterSpacing: '0.15em',
    marginBottom: '0.3rem',
  },
  errorText: {
    fontFamily: "'Courier New', monospace",
    fontSize: '0.85rem',
    color: '#0a0a0a',
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  buttonRow: {
    display: 'flex',
    gap: '0.6rem',
    marginBottom: '0.75rem',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    flex: 1,
    background: '#fff',
    color: '#000',
    border: '3px solid #000',
    padding: '0.6rem 1.2rem',
    fontFamily: 'Impact, sans-serif',
    fontSize: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    cursor: 'pointer',
    transform: 'skewX(-8deg)',
    boxShadow: '5px 5px 0 #c81e1e',
  },
  btnSecondary: {
    flex: 1,
    background: '#ffd43a',
    color: '#000',
    border: '3px solid #000',
    padding: '0.6rem 1.2rem',
    fontFamily: 'Impact, sans-serif',
    fontSize: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    cursor: 'pointer',
    transform: 'skewX(-8deg)',
    boxShadow: '5px 5px 0 #000',
  },
  btnGhost: {
    flex: 1,
    background: '#000',
    color: '#fff',
    border: '3px solid #000',
    padding: '0.45rem 1rem',
    fontFamily: 'Impact, sans-serif',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    cursor: 'pointer',
    transform: 'skewX(-8deg)',
    boxShadow: '4px 4px 0 #c81e1e',
  },
  btnDanger: {
    flex: 1,
    background: '#c81e1e',
    color: '#fff',
    border: '3px solid #000',
    padding: '0.45rem 1rem',
    fontFamily: 'Impact, sans-serif',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    cursor: 'pointer',
    transform: 'skewX(-8deg)',
    boxShadow: '4px 4px 0 #000',
  },
  footer: {
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic',
    color: '#888',
    fontSize: '0.85rem',
    marginTop: '1.5rem',
    marginBottom: 0,
    textAlign: 'center',
  },
};
