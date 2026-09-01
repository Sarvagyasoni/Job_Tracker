import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.container}>
        <p className={styles.copyright}>
          &copy; {new Date().getFullYear()} Job Application Tracker. Built with React + TypeScript.
        </p>
        <div className={styles.links}>
          <button type="button" className={styles.link} disabled>
            GitHub
          </button>
          <button type="button" className={styles.link} disabled>
            Privacy
          </button>
          <button type="button" className={styles.link} disabled>
            Terms
          </button>
        </div>
      </div>
    </footer>
  );
}