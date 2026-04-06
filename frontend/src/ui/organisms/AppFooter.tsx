import styles from "./AppFooter.module.css";

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <p className={styles.email}>
          <a href="mailto:CoPayfeedback@gmail.com">CoPayfeedback@gmail.com</a>
        </p>
      </div>
    </footer>
  );
}
