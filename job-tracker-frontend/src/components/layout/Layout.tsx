import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { ScrollToTop } from './ScrollToTop';
import styles from './Layout.module.css';

export function Layout() {
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
          poster="/assets/background/d3eb7776aeb707542e0f3cf0d45aa198.jpg"
        >
          <source src="/assets/background/job_search_live_wallpaper.mp4" type="video/mp4" />
        </video>
        <div className={styles.pageOverlay} />
      </div>

      {/* Floating particles */}
      <div className={styles.particles} aria-hidden="true">
        {[...Array(15)].map((_, i) => (
          <div key={i} className={styles.particle} style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 40}s`,
            animationDuration: `${25 + Math.random() * 20}s`,
          }} />
        ))}
      </div>

      <Header />
      <main id="main-content" className={styles.main} role="main">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}