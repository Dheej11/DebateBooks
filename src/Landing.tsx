import { useNavigate } from 'react-router-dom'
import './Landing.css'

const features = [
  {
    icon: '✂️',
    title: 'Card Cutting',
    description:
      'Paste evidence and instantly format it with keyboard shortcuts — bold, underline, highlight, and tag text in seconds. Built for the speed of a debate round.',
  },
  {
    icon: '📁',
    title: 'Organized File System',
    description:
      'Create nested folders, drag and drop files, and keep your entire case library organized exactly the way you think about it.',
  },
  {
    icon: '📄',
    title: 'Speech Documents',
    description:
      'Build your speech as you research. Send cards directly to a speech doc with one shortcut, then split-screen your evidence and your speech side by side.',
  },
  {
    icon: '⌨️',
    title: 'Fully Customizable Shortcuts',
    description:
      'Every formatting action has a configurable keyboard shortcut. Set up the bindings you already know from Verbatim, or build your own system.',
  },
  {
    icon: '🎨',
    title: 'Debate-Native Formatting',
    description:
      'Tags, blocks, pockets, and cards — formatted in one keystroke. Condense text, apply heading hierarchies, and switch between invisibility mode during a round.',
  },
  {
    icon: '💾',
    title: 'Stored Locally',
    description:
      'Your files live in your browser — no account, no subscription, no cloud required. Export any file as PDF or JSON whenever you need it.',
  },
]

const shortcuts = [
  { keys: ['Cmd', 'B'], label: 'Bold' },
  { keys: ['Cmd', 'U'], label: 'Underline' },
  { keys: ['Cmd', '⇧', 'H'], label: 'Highlight' },
  { keys: ['Cmd', '⇧', 'V'], label: 'Paste as default text' },
  { keys: ['Cmd', '⇧', 'C'], label: 'Condense' },
  { keys: ['Cmd', '⇧', 'S'], label: 'Send to speech' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <img src="/debate-files-logo.jpeg" alt="DebateFiles" className="landing-nav-logo" />
          <span>DebateFiles</span>
        </div>
        <button className="landing-nav-cta" onClick={() => navigate('/app')}>
          Open App
        </button>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-badge">Built for competitive debate</div>
          <h1 className="landing-hero-title">
            Cut cards.<br />
            Build speeches.<br />
            <span className="landing-hero-accent">Win rounds.</span>
          </h1>
          <p className="landing-hero-sub">
            DebateFiles is a purpose-built document editor for competitive debaters.
            Organize your evidence, format cards with keyboard shortcuts, and build
            speech docs — all in one place.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-cta-primary" onClick={() => navigate('/app')}>
              Start Debating →
            </button>
            <a className="landing-cta-secondary" href="#features">
              See Features
            </a>
          </div>
        </div>
        <div className="landing-hero-preview">
          <div className="landing-preview-window">
            <div className="landing-preview-bar">
              <span /><span /><span />
            </div>
            <div className="landing-preview-toolbar">
              <div className="landing-preview-pill">Text Color</div>
              <div className="landing-preview-pill">Bold</div>
              <div className="landing-preview-pill">Underline</div>
              <div className="landing-preview-pill landing-preview-pill-highlight">Highlight</div>
              <div className="landing-preview-pill">Tag</div>
            </div>
            <div className="landing-preview-body">
              <div className="landing-preview-h1">Climate Advantage</div>
              <div className="landing-preview-h2">Uniqueness</div>
              <div className="landing-preview-tag">Emissions at record high – action is urgent</div>
              <div className="landing-preview-card">
                <span className="landing-preview-bold landing-preview-ul">IPCC, 2024</span>
                {' '}
                <span className="landing-preview-hl">
                  Global surface temperature has increased faster since 1970 than in any
                  other 50-year period over at least the last 2000 years.
                </span>
                {' '}
                Concentrations of carbon dioxide are at levels not seen in over 2 million years.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features" id="features">
        <div className="landing-section-header">
          <h2>Everything a debater needs</h2>
          <p>Designed around the actual workflow of cutting, organizing, and delivering evidence.</p>
        </div>
        <div className="landing-features-grid">
          {features.map((f) => (
            <div key={f.title} className="landing-feature-card">
              <div className="landing-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Shortcuts */}
      <section className="landing-shortcuts-section">
        <div className="landing-section-header">
          <h2>Speed built in</h2>
          <p>Every action has a keyboard shortcut — fully customizable in settings.</p>
        </div>
        <div className="landing-shortcuts-grid">
          {shortcuts.map((s) => (
            <div key={s.label} className="landing-shortcut-row">
              <div className="landing-shortcut-keys">
                {s.keys.map((k, i) => (
                  <span key={i} className="landing-key">{k}</span>
                ))}
              </div>
              <span className="landing-shortcut-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="landing-cta-section">
        <h2>Ready to cut your first card?</h2>
        <p>No account. No install. Open the app and start in seconds.</p>
        <button className="landing-cta-primary landing-cta-large" onClick={() => navigate('/app')}>
          Open DebateFiles →
        </button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-nav-brand">
          <img src="/debate-files-logo.jpeg" alt="DebateFiles" className="landing-nav-logo" />
          <span>DebateFiles</span>
        </div>
        <p>Built for debaters, by debaters.</p>
      </footer>
    </div>
  )
}
