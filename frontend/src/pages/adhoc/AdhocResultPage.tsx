import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../shared/api/client";
import { useI18n } from "../../shared/i18n/I18nContext";
import { copyToClipboard } from "../../shared/lib/copyToClipboard";
import { formatMoney } from "../../shared/lib/currency";
import { showToast } from "../../shared/ui/toast";
import { Button } from "../../ui/atoms/Button";
import { TextInput } from "../../ui/atoms/TextInput";
import { PageHero } from "../../ui/templates/PageHero";
import { CalcLayout } from "../../ui/templates/CalcLayout";
import styles from "../FormPage.module.css";
import pageStyles from "./AdhocResultPage.module.css";

type LineItem = { name: string; price: number; participants: string[] };

type ViewerBlock = {
  payTo: { toName: string; amount: number }[];
  receiveFrom: { fromName: string; amount: number }[];
};

type AdhocData = {
  payer: string;
  amount: number;
  participants: string[];
  transfers: { from: string; to: string; amount: number }[];
  lineItems?: LineItem[];
  currency?: string;
  viewer?: ViewerBlock;
};

export function AdhocResultPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [data, setData] = useState<AdhocData | null>(null);
  const [err, setErr] = useState("");
  const [viewerName, setViewerName] = useState("");
  const [loadingViewer, setLoadingViewer] = useState(false);

  const load = useCallback(
    async (name?: string) => {
      if (!id) return;
      const q = name?.trim() ? `?viewerName=${encodeURIComponent(name.trim())}` : "";
      return api<AdhocData>(`/api/adhoc/${id}${q}`);
    },
    [id]
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await load();
        if (!cancelled) setData(r);
      } catch (ex) {
        if (!cancelled) {
          setErr(ex instanceof Error ? ex.message : "Error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, load]);

  async function applyViewer() {
    if (!viewerName.trim() || !id) return;
    setLoadingViewer(true);
    setErr("");
    try {
      const r = await load(viewerName);
      if (r) setData(r);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    } finally {
      setLoadingViewer(false);
    }
  }

  if (err && !data) {
    return (
      <PageHero>
        <p className="err">{err}</p>
        <Link to="/calculator">{t("adhoc.newCalc")}</Link>
      </PageHero>
    );
  }

  if (!data) {
    return (
      <PageHero>
        <p className={styles.subtle}>{t("common.loading")}</p>
      </PageHero>
    );
  }

  const cur = data.currency || "RUB";
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/r/${id}` : "";

  const perPerson = data.participants.map((name) => {
    const items = (data.lineItems || []).filter((li) =>
      li.participants.some((p) => p === name)
    );
    const total = items.reduce((s, li) => {
      const n = li.participants.length || 1;
      return s + li.price / n;
    }, 0);
    return { name, items, total };
  });

  const summary = t("adhoc.paidSummary", {
    payer: data.payer,
    amount: formatMoney(data.amount, cur),
    list: data.participants.join(", "),
  });

  return (
    <PageHero>
      <h1 className="page-title">{t("adhoc.resultTitle")}</h1>
      <p className="section-text">{summary}</p>

      <CalcLayout>
        {(data.lineItems?.length ?? 0) > 0 && (
          <section className="fw-panel calc-span-2">
            <h2 className={styles.cardTitle}>{t("adhoc.lineItems")}</h2>
            <ul className={styles.expList}>
              {data.lineItems!.map((li, i) => (
                <li key={i}>
                  <strong>{li.name}</strong> — {formatMoney(li.price, cur)}
                  <div className={styles.subtle}>{li.participants.join(", ")}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="fw-panel calc-span-2">
          <h2 className={styles.cardTitle}>{t("adhoc.perPersonTitle")}</h2>
          <div className={pageStyles.perPersonGrid}>
            {perPerson.map((p) => (
              <div key={p.name} className={pageStyles.perPersonCard}>
                <h3 className={pageStyles.perPersonName}>{p.name}</h3>
                <p className={pageStyles.perPersonTotal}>
                  {t("adhoc.share")}: {formatMoney(p.total, cur)}
                </p>
                <p className={`${styles.subtle} ${pageStyles.perPersonItemsLabel}`}>
                  {t("adhoc.items")}:
                </p>
                <ul className={pageStyles.perPersonItemsList}>
                  {p.items.length === 0 ? (
                    <li>—</li>
                  ) : (
                    p.items.map((li, idx) => {
                      const n = li.participants.length || 1;
                      return (
                        <li key={idx}>
                          {li.name} — {formatMoney(li.price / n, cur)}
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="fw-panel calc-span-2">
          <h2 className={styles.cardTitle}>{t("adhoc.transfers")}</h2>
          {data.transfers.length === 0 ? (
            <p className={styles.subtle}>{t("adhoc.noTransfers")}</p>
          ) : (
            <ul className={styles.expList}>
              {data.transfers.map((tr, i) => (
                <li key={i}>
                  <strong>{tr.from}</strong> → <strong>{tr.to}</strong>:{" "}
                  {formatMoney(tr.amount, cur)}
                </li>
              ))}
            </ul>
          )}

          <h3 className={`${styles.cardTitle} ${pageStyles.myTransfersTitle}`}>
            {t("adhoc.myTransfers")}
          </h3>
          <p className={styles.subtle}>{t("adhoc.nameHint")}</p>
          <div className={pageStyles.viewerToolbar}>
            <TextInput
              variant="fw"
              value={viewerName}
              onChange={(e) => setViewerName(e.target.value)}
              placeholder={t("adhoc.yourName")}
              list="adhoc-names"
              className={pageStyles.viewerNameInput}
            />
            <datalist id="adhoc-names">
              {data.participants.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <Button type="button" variant="ghost" onClick={applyViewer} disabled={loadingViewer}>
              {t("common.show")}
            </Button>
          </div>
          {data.viewer && (data.viewer.payTo.length > 0 || data.viewer.receiveFrom.length > 0) && (
            <div className={pageStyles.viewerBlock}>
              <p className={`${styles.subtle} ${pageStyles.subtleNoTop}`}>
                {t("adhoc.youSend")}
              </p>
              <ul>
                {data.viewer.payTo.length === 0 ? (
                  <li className={styles.subtle}>—</li>
                ) : (
                  data.viewer.payTo.map((x, i) => (
                    <li key={i}>
                      <strong>{x.toName}</strong>: {formatMoney(x.amount, cur)}
                    </li>
                  ))
                )}
              </ul>
              <p className={styles.subtle}>{t("adhoc.youGet")}</p>
              <ul>
                {data.viewer.receiveFrom.length === 0 ? (
                  <li className={styles.subtle}>—</li>
                ) : (
                  data.viewer.receiveFrom.map((x, i) => (
                    <li key={i}>
                      <strong>{x.fromName}</strong>: {formatMoney(x.amount, cur)}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </section>

        <div className={`card calc-span-2 ${pageStyles.linkCard}`}>
          <h2 className={styles.cardTitle}>{t("adhoc.linkTitle")}</h2>
          <p className={styles.subtle}>{t("adhoc.linkHint")}</p>
          <TextInput readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              setErr("");
              const ok = await copyToClipboard(shareUrl);
              if (ok) showToast(t("common.copied"));
              else setErr(t("common.error"));
            }}
          >
            {t("common.copy")}
          </Button>
        </div>
      </CalcLayout>

      {err && data && <p className="err">{err}</p>}

      <p className={pageStyles.footerLinkRow}>
        <Link to="/calculator">{t("adhoc.newCalc")}</Link>
      </p>
    </PageHero>
  );
}
