import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button, Input } from '../components/common';
import styles from './AuthPage.module.css';

// Inspire images for card background - pick one randomly on each page load
const inspireImages = [
  '/assets/inspire/0829f54242b353544b18def0aae33230.jpg',
  '/assets/inspire/0dffeab5ae00d4a43e7e491ae58c19e8.jpg',
  '/assets/inspire/14c4348e2b9426f7b95a92a916dc1a6d.jpg',
  '/assets/inspire/15745472bfe17567e03d4326ab2921ac.jpg',
  '/assets/inspire/1bf5b0a2c4128788c72d2e931689d5f1.jpg',
  '/assets/inspire/2b35ae68d54e7321bda82c793a6cc355.jpg',
  '/assets/inspire/2eaf3128cd6128616361e9fa97b596d9.jpg',
  '/assets/inspire/31ad2172b85d99d5c1197aa88c17bb75.jpg',
  '/assets/inspire/3bc1a88906cebb50a676e0e8f14612bc.jpg',
  '/assets/inspire/40d2a06a90a0ba8ccd7f41d3fe99cfa1.jpg',
  '/assets/inspire/415b83f402ebccc19cf766b09e468729.jpg',
  '/assets/inspire/4ef4a451d365d70205460d6124c07784.jpg',
  '/assets/inspire/5b6ac339fe71079de1f5a0161507f61e.jpg',
  '/assets/inspire/6ad00ed67cb54a42622397f40f5b3c0a.jpg',
  '/assets/inspire/7967f47702c1e43de4f5038c710b79cb.jpg',
  '/assets/inspire/79ffae8cded520c77df207e4991ab7a2.jpg',
  '/assets/inspire/7cad1793c24b5a0e71ef3dfcb85609b3.jpg',
  '/assets/inspire/800090afe39b39363ea464b0ffc0b4c1.jpg',
  '/assets/inspire/97f4ebedf4ed05aae7d1030c71a07e6f.jpg',
  '/assets/inspire/a5a2ac690b29ff419ea1fa3c5c7a27b8.jpg',
  '/assets/inspire/aea496d63ae1ec6612052c90d1afd9ae.jpg',
  '/assets/inspire/b4232e2201fd89b6974301250bc928ba.jpg',
  '/assets/inspire/cb90f22e0fd821026ff64433cbb3f1aa.jpg',
  '/assets/inspire/cea4308dd5a4a5b7dd2c15fa36b7b6dd.jpg',
  '/assets/inspire/db9de33620e44d5900a9db6e300402bd.jpg',
  '/assets/inspire/defffba38c050550b9e610d1b050d74c.jpg',
  '/assets/inspire/e882b2d178d1493a8471d445adf2641c.jpg',
  '/assets/inspire/ec83db574f787099cde78bca45ea65f5.jpg',
  '/assets/inspire/fc7d5901d207efc5060138ef369f0a36.jpg',
  '/assets/inspire/ff9ef0bc10ad4cc175890427811456ba.jpg',
];

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInspireLoaded, setIsInspireLoaded] = useState(false);

  // Pick random inspire image once per mount (stable across re-renders)
  const currentInspireIndex = useMemo(
    () => Math.floor(Math.random() * inspireImages.length),
    []
  );

  const particles = useMemo(
    () => Array.from({ length: 15 }, () => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 40}s`,
      duration: `${25 + Math.random() * 20}s`,
    })),
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Full-page LIVE WALLPAPER background - using the video from background folder */}
      <div className={styles.pageBg} aria-hidden="true">
        <video
          className={styles.pageBgVideo}
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/assets/background/job_search_live_wallpaper.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for text readability over video */}
        <div className={styles.pageOverlay} />
      </div>

      {/* Floating particles */}
      <div className={styles.particles} aria-hidden="true">
        {particles.map((p, i) => (
          <div
            key={i}
            className={styles.particle}
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      {/* Register Card */}
      <div className={styles.container}>
        <div className={styles.card}>
          {/* Inspire image as card background - NEW random image on each page load */}
          <div className={styles.cardBgWrapper} aria-hidden="true">
            <img
              src={inspireImages[currentInspireIndex]}
              alt=""
              className={`${styles.cardBgImage} ${isInspireLoaded ? styles.visible : ''}`}
              onLoad={() => setIsInspireLoaded(true)}
            />
            <div className={styles.cardBgOverlay} />
          </div>

          {/* Card content */}
          <div className={styles.cardInner}>
            <div className={styles.header}>
              <h1 className={styles.appName}>Job Tracker</h1>
              <p className={styles.subtitle}>Create your account to start tracking</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              {error && (
                <div className={styles.error} role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <div className={styles.field}>
                <Input
                  name="email"
                  type="email"
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className={styles.field}>
                <Input
                  name="password"
                  type="password"
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  showPasswordToggle
                  helperText="At least 8 characters"
                />
              </div>

              <div className={styles.field}>
                <Input
                  name="confirmPassword"
                  type="password"
                  label="Confirm Password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  showPasswordToggle
                />
              </div>

              <Button type="submit" variant="primary" className={styles.submitButton} isLoading={isLoading}>
                Create Account
              </Button>
            </form>

            <p className={styles.footer}>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}