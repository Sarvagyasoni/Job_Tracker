import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.container}>
        <p className={styles.copyright}>
          &copy; {new Date().getFullYear()} Job Application Tracker. Built with React + TypeScript.
        </p>
        <div className={styles.links}>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.link}>
            GitHub
          </a>
          <a href="#privacy" className={styles.link}>
            Privacy
          </a>
          <a href="#terms" className={styles.link}>
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}