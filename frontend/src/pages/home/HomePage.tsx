import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../shared/i18n/I18nContext";
import { HeroCarousel } from "../../ui/organisms/HeroCarousel";
import styles from "./HomePage.module.css";

const IMG_CALC =
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80";
const IMG_ROOMS =
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80";

export function HomePage() {
  const { t } = useI18n();

  const receiptSlides = useMemo(
    () => [
      {
        src: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=80",
        caption: t("home.slide1"),
      },
      {
        src: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",
        caption: t("home.slide2"),
      },
      {
        src: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=1200&q=80",
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
