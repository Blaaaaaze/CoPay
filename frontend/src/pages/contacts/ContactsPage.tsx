import { useI18n } from "../../shared/i18n/I18nContext";
import styles from "../FormPage.module.css";

export function ContactsPage() {
  const { t } = useI18n();
  return (
    <div className="container page-hero">
      <h1 className="page-title">{t("contacts.title")}</h1>
      <p className="section-text" style={{ maxWidth: "36rem" }}>
        {t("contacts.text")}
      </p>
      <p className={styles.cardTitle} style={{ marginTop: "1.5rem" }}>
        <a href="mailto:CoPayfeedback@gmail.com">CoPayfeedback@gmail.com</a>
      </p>
      <p className={styles.subtle}>{t("contacts.reply")}</p>
    </div>
  );
}
