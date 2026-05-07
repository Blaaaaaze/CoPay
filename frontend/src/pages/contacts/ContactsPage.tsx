import { useI18n } from "../../shared/i18n/I18nContext";
import { PageHero } from "../../ui/templates/PageHero";
import styles from "../FormPage.module.css";
import pageStyles from "./ContactsPage.module.css";

export function ContactsPage() {
  const { t } = useI18n();
  return (
    <PageHero>
      <h1 className="page-title">{t("contacts.title")}</h1>
      <p className={`section-text ${pageStyles.textMax}`}>
        {t("contacts.text")}
      </p>
      <p className={`${styles.cardTitle} ${pageStyles.emailTitle}`}>
        <a href="mailto:CoPayfeedback@gmail.com">CoPayfeedback@gmail.com</a>
      </p>
      <p className={styles.subtle}>{t("contacts.reply")}</p>
    </PageHero>
  );
}
