import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../shared/api/client";
import { useI18n } from "../../shared/i18n/I18nContext";
import { copyToClipboard } from "../../shared/lib/copyToClipboard";
import { formatMoney } from "../../shared/lib/currency";
import { showToast } from "../../shared/ui/toast";
import styles from "../FormPage.module.css";

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
      <div className="container page-hero">
        <p className="err">{err}</p>
        <Link to="/calculator">{t("adhoc.newCalc")}</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container page-hero">
        <p className={styles.subtle}>{t("common.loading")}</p>
      </div>
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
    <div className="container page-hero">
      <h1 className="page-title">{t("adhoc.resultTitle")}</h1>
      <p className="section-text">{summary}</p>

      <div className="calc-layout">
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
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            }}
          >
            {perPerson.map((p) => (
              <div
                key={p.name}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "0.75rem 1rem",
                  background: "var(--page-bg)",
                }}
              >
                <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.05rem" }}>{p.name}</h3>
                <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>
                  {t("adhoc.share")}: {formatMoney(p.total, cur)}
                </p>
                <p className={styles.subtle} style={{ margin: 0, fontSize: "0.85rem" }}>
                  {t("adhoc.items")}:
                </p>
                <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.1rem", fontSize: "0.9rem" }}>
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

          <h3 className={styles.cardTitle} style={{ marginTop: "1.25rem", fontSize: "1rem" }}>
            {t("adhoc.myTransfers")}
          </h3>
          <p className={styles.subtle}>{t("adhoc.nameHint")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "0.75rem" }}>
            <input
              className="fw-base-input"
              style={{ flex: "1 1 180px", marginBottom: 0 }}
              value={viewerName}
              onChange={(e) => setViewerName(e.target.value)}
              placeholder={t("adhoc.yourName")}
              list="adhoc-names"
            />
            <datalist id="adhoc-names">
              {data.participants.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <button type="button" className="btn-ghost" onClick={applyViewer} disabled={loadingViewer}>
              {t("common.show")}
            </button>
          </div>
          {data.viewer && (data.viewer.payTo.length > 0 || data.viewer.receiveFrom.length > 0) && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
              <p className={styles.subtle} style={{ marginTop: 0 }}>
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

        <div className="card calc-span-2" style={{ marginTop: 0 }}>
          <h2 className={styles.cardTitle}>{t("adhoc.linkTitle")}</h2>
          <p className={styles.subtle}>{t("adhoc.linkHint")}</p>
          <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
          <button
            type="button"
            className="btn-ghost"
            onClick={async () => {
              setErr("");
              const ok = await copyToClipboard(shareUrl);
              if (ok) showToast(t("common.copied"));
              else setErr(t("common.error"));
            }}
          >
            {t("common.copy")}
          </button>
        </div>
      </div>

      {err && data && <p className="err">{err}</p>}

      <p style={{ marginTop: "1.5rem" }}>
        <Link to="/calculator">{t("adhoc.newCalc")}</Link>
      </p>
    </div>
  );
}
