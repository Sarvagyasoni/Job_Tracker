import { useMemo, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { ScrollToTop } from './ScrollToTop';
import styles from './Layout.module.css';

interface Particle {
  left: string;
  top: string;
  delay: string;
  duration: string;
}

const PARTICLE_COUNT = 15;

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 40}s`,
    duration: `${25 + Math.random() * 20}s`,
  }));
}

export function Layout({ children }: { children?: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const particles = useMemo(generateParticles, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={styles.layout}>
      {/* Live wallpaper background video */}
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

      <Sidebar isOpen={isSidebarOpen} onNavigate={() => setIsSidebarOpen(false)} />
      
      {isSidebarOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <main id="main-content" className={styles.main} role="main">
        {children ?? <Outlet />}
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}