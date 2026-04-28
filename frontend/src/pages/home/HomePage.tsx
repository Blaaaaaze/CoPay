import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../shared/i18n/I18nContext";
import { HeroCarousel } from "../../ui/organisms/HeroCarousel";
import styles from "./HomePage.module.css";

const IMG_CALC = "/home-photos/calc.jpg";
const IMG_ROOMS = "/home-photos/rooms.jpg";

export function HomePage() {
  const { t } = useI18n();

  const receiptSlides = useMemo(
    () => [
      {
        src: "/home-photos/ocr-1.jpg",
        caption: t("home.slide1"),
      },
      {
        src: "/home-photos/ocr-2.jpg",
        caption: t("home.slide2"),
      },
      {
        src: "/home-photos/ocr-3.jpg",
        caption: t("home.slide3"),
      },
    ],
    [t]
  );

  return (
    <>
      <section className="section-pad">
        <div className="container two-col">
          <div>
            <h2 className="section-title">{t("home.calc.title")}</h2>
            <p className="section-text">{t("home.calc.text")}</p>
            <Link to="/calculator" className="link-cta">
              {t("home.go")}
            </Link>
          </div>
          <div className="rounded-media">
            <img src={IMG_CALC} alt="" width={560} height={380} />
          </div>
        </div>
      </section>

      <section className={`section-pad home-section-alt`}>
        <div className="container two-col reverse">
          <div className="rounded-media">
            <img src={IMG_ROOMS} alt="" width={560} height={380} />
          </div>
          <div>
            <h2 className="section-title">{t("home.rooms.title")}</h2>
            <p className="section-text">{t("home.rooms.text")}</p>
            <Link to="/rooms" className="link-cta">
              {t("home.go")}
            </Link>
          </div>
        </div>
      </section>

      <section className={`section-pad ${styles.centerTitle}`}>
        <div className="container">
          <h2 className="section-title">{t("home.ocr.title")}</h2>
          <p className="section-text">{t("home.ocr.text")}</p>
          <HeroCarousel slides={receiptSlides} autoMs={6500} />
        </div>
      </section>
    </>
  );
}
