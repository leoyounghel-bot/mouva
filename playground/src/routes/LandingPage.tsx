import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-inner">
          <Link to="/" className="logo">
            <img src="/logo.svg" alt="Mouva" className="logo-image" />
            <span className="logo-text">Mouva</span>
          </Link>
          <div className="nav-right">
            <Link to="/pricing" className="nav-link">Pricing</Link>
            <Link to="/auth" className="nav-btn">Start Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <h1>Design anything.<br />Export everywhere.</h1>
          <p>The visual design platform for documents, presentations, and more.</p>
          <div className="hero-cta">
            <Link to="/ai-designer" className="btn-dark">Start Designing</Link>
            <Link to="/pricing" className="btn-outline">View Pricing</Link>
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="showcase">
        <div className="showcase-inner">
          <div className="showcase-grid">
            <div className="card">
              <img src="/template-invoice.png" alt="Invoice" />
              <span>Invoice</span>
            </div>
            <div className="card">
              <img src="/template-resume.png" alt="Resume" />
              <span>Resume</span>
            </div>
            <div className="card">
              <img src="/template-ppt.png" alt="Presentation" />
              <span>Presentation</span>
            </div>
            <div className="card">
              <img src="/template-postcard.png" alt="Postcard" />
              <span>Postcard</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="features-inner">
          <div className="feature">
            <div className="feature-icon">→</div>
            <h3>Fast</h3>
            <p>Create designs in minutes, not hours</p>
          </div>
          <div className="feature">
            <div className="feature-icon">◇</div>
            <h3>Beautiful</h3>
            <p>Professional designs that make an impact</p>
          </div>
          <div className="feature">
            <div className="feature-icon">◎</div>
            <h3>Anywhere</h3>
            <p>Works on any device, syncs everywhere</p>
          </div>
          <div className="feature">
            <div className="feature-icon">○</div>
            <h3>Simple</h3>
            <p>No learning curve, just start creating</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-inner">
          <h2>Ready to create?</h2>
          <p>Free to start. No credit card required.</p>
          <Link to="/auth" className="btn-dark large">Get Started Free</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-left">
            <Link to="/" className="footer-logo-link">
              <img src="/logo.svg" alt="Mouva" className="footer-logo-image" />
              <span className="footer-logo">Mouva</span>
            </Link>
          </div>
          <div className="footer-right">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <span>© 2025</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
