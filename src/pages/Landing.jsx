import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="brand">
          <div className="logo-icon">CF</div>
          <h2>CodeFusion</h2>
        </div>
        <div className="nav-links">
          <button onClick={() => navigate('/login')} className="nav-btn">Login</button>
          <button onClick={() => navigate('/signup')} className="nav-btn primary">Join Now</button>
        </div>
      </nav>

      <main className="hero-section">
        <div className="hero-content">
          <div className="badge">Next-Gen Collaboration</div>
          <h1>Code Together. <br /><span>Build Faster.</span></h1>
          <p>
            Experience the ultimate real-time collaborative code editor. 
            Write, execute, and debug code with your team in a seamless, high-performance workspace.
          </p>
          <div className="hero-actions">
            <button onClick={() => navigate('/signup')} className="cta-btn main">Get Started for Free</button>
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="code-preview-card">
            <div className="card-header">
              <div className="dots"><span></span><span></span><span></span></div>
              <div className="filename">main.js</div>
            </div>
            <pre className="code-snippet">
              <code>{`function codeFusion() {
  const status = 'Connected';
  return \`Team is ready and \${status}...\`;
}

// Real-time sync enabled
codeFusion();`}</code>
            </pre>
          </div>
          <div className="floating-badge b1">✨ Real-time Sync</div>
          <div className="floating-badge b2">🤖 AI Powered</div>
          <div className="floating-badge b3">📊 Live Analytics</div>
        </div>
      </main>

      <section className="features-grid">
        <div className="feature-card">
          <div className="f-icon">🚀</div>
          <h3>Multi-Language</h3>
          <p>Support for Python, JS, SQL, and HTML/CSS out of the box.</p>
        </div>
        <div className="feature-card">
          <div className="f-icon">🔒</div>
          <h3>Secure Access</h3>
          <p>Role-based permissions and private room controls.</p>
        </div>
        <div className="feature-card">
          <div className="f-icon">🎨</div>
          <h3>Live Preview</h3>
          <p>Instantly see your HTML/CSS designs come to life.</p>
        </div>
      </section>

      <footer className="landing-footer">
        <p>&copy; 2026 CodeFusion. Built for modern developers.</p>
      </footer>

      <style>{`
        .landing-page {
          min-height: 100vh;
          background: #050505;
          color: white;
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
        }

        .landing-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 30px 8%;
          position: sticky;
          top: 0;
          background: rgba(5, 5, 5, 0.8);
          backdrop-filter: blur(10px);
          z-index: 100;
        }

        .brand { display: flex; align-items: center; gap: 12px; }
        .logo-icon {
          width: 35px; height: 35px; background: linear-gradient(135deg, #7c4dff, #00e5ff);
          border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold;
        }
        .brand h2 { font-size: 1.5rem; margin: 0; letter-spacing: -1px; }

        .nav-links { display: flex; gap: 20px; }
        .nav-btn { background: none; border: none; color: #888; cursor: pointer; font-weight: 500; transition: 0.3s; }
        .nav-btn:hover { color: white; }
        .nav-btn.primary { background: white; color: black; padding: 10px 20px; border-radius: 25px; }

        .hero-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          padding: 80px 8%;
          align-items: center;
          gap: 50px;
        }

        .hero-content .badge {
          background: rgba(124, 77, 255, 0.1);
          color: #7c4dff;
          padding: 6px 15px;
          border-radius: 20px;
          display: inline-block;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 20px;
          border: 1px solid rgba(124, 77, 255, 0.2);
        }

        .hero-content h1 { font-size: 4rem; margin: 0; line-height: 1.1; font-weight: 800; }
        .hero-content h1 span {
          background: linear-gradient(90deg, #7c4dff, #00e5ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-content p { color: #888; font-size: 1.2rem; margin: 25px 0 40px; max-width: 500px; line-height: 1.6; }

        .hero-actions { display: flex; gap: 20px; }
        .cta-btn {
          padding: 16px 32px; border-radius: 30px; font-weight: 600; cursor: pointer; transition: 0.3s;
        }
        .cta-btn.main { background: #7c4dff; border: none; color: white; box-shadow: 0 10px 20px rgba(124, 77, 255, 0.3); }
        .cta-btn.outline { background: none; border: 1px solid #333; color: white; }
        .cta-btn:hover { transform: translateY(-3px); filter: brightness(1.1); }

        .hero-stats { display: flex; gap: 40px; margin-top: 60px; border-top: 1px solid #222; padding-top: 40px; }
        .stat { color: #555; font-size: 0.9rem; }
        .stat strong { color: white; display: block; font-size: 1.2rem; }

        .hero-visual { position: relative; }
        .code-preview-card {
          background: #111;
          border: 1px solid #222;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
          transform: perspective(1000px) rotateY(-5deg) rotateX(5deg);
        }
        .card-header { display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #222; padding-bottom: 15px; margin-bottom: 15px; }
        .dots { display: flex; gap: 6px; }
        .dots span { width: 8px; height: 8px; border-radius: 50%; background: #333; }
        .filename { color: #555; font-size: 0.8rem; font-family: monospace; }
        .code-snippet { color: #7c4dff; font-family: monospace; font-size: 0.9rem; line-height: 1.5; }

        .floating-badge {
          position: absolute; background: rgba(255,255,255,0.05); backdrop-filter: blur(5px);
          padding: 10px 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
          font-size: 0.85rem; font-weight: 500; animation: float 6s infinite ease-in-out;
        }
        .b1 { top: -20px; right: 0; }
        .b2 { bottom: 20px; left: -30px; animation-delay: 1s; }
        .b3 { top: 40%; right: -40px; animation-delay: 2s; }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        .features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; padding: 100px 8%;
        }
        .feature-card {
          background: rgba(255,255,255,0.02); border: 1px solid #111; padding: 40px; border-radius: 20px; transition: 0.3s;
        }
        .feature-card:hover { background: rgba(255,255,255,0.04); border-color: #222; }
        .f-icon { font-size: 2.5rem; margin-bottom: 20px; }
        .feature-card h3 { margin-bottom: 10px; }
        .feature-card p { color: #666; font-size: 0.95rem; line-height: 1.5; }

        .landing-footer { border-top: 1px solid #111; padding: 40px; text-align: center; color: #444; font-size: 0.9rem; }

        @media (max-width: 900px) {
          .hero-section { grid-template-columns: 1fr; text-align: center; }
          .hero-content h1 { font-size: 3rem; }
          .hero-actions { justify-content: center; }
          .hero-stats { justify-content: center; }
          .hero-visual { display: none; }
          .features-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default Landing;
