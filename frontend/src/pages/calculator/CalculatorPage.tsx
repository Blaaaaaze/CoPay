import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import html2canvas from "html2canvas";
import { api } from "../../shared/api/client";
import { useI18n } from "../../shared/i18n/I18nContext";
import { formatMoney } from "../../shared/lib/currency";
import { ReceiptUploadModal } from "./ReceiptUploadModal";
import formStyles from "../FormPage.module.css";
import styles from "./CalculatorPage.module.css";

/** Сколько строк списка показывать без вертикальной прокрутки (см. scrollableViewport в CSS). */
const CALC_LIST_MAX_VISIBLE_ROWS = 5;

type Participant = { id: number; name: string };

type ProductRow = {
  name: string;
  price: number;
  participants: string[];
  dividedPrice: number;
};

type SplitResponse = {
  id: string;
  balances: Record<string, number>;
  transfers: { from: string; to: string; amount: number }[];
  currency?: string;
};

type AdhocDetail = {
  payer: string;
  amount: number;
  participants: string[];
  transfers: { from: string; to: string; amount: number }[];
  lineItems?: { name: string; price: number; participants: string[] }[];
  currency?: string;
};

export function CalculatorPage() {
  const { t } = useI18n();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [draftName, setDraftName] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [currency, setCurrency] = useState("RUB");
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [splitAmongAll, setSplitAmongAll] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [resultDetail, setResultDetail] = useState<AdhocDetail | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const resultWrapRef = useRef<HTMLDivElement>(null);
  const personEditInputRef = useRef<HTMLInputElement>(null);

  const namedList = participants.map((p) => p.name.trim()).filter(Boolean);

  useEffect(() => {
    if (!splitAmongAll) return;
    setSelectedNames([...namedList]);
  }, [splitAmongAll, participants]);

  useEffect(() => {
    if (editingId == null) return;
    const t = window.setTimeout(() => {
      personEditInputRef.current?.focus();
      personEditInputRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
  }, [editingId]);

  function addParticipant() {
    const n = draftName.trim();
    if (!n) return;
    if (participants.length >= 10) return;
    if (namedList.some((x) => x.toLowerCase() === n.toLowerCase())) {
      setErr(t("calc.duplicateName"));
      return;
    }
    setErr("");
    setParticipants((prev) => [...prev, { id: Date.now() + Math.random(), name: n }]);
    setDraftName("");
  }

  function removeParticipant(id: number) {
    const p = participants.find((x) => x.id === id);
    const name = p?.name.trim();
    setParticipants((prev) => prev.filter((x) => x.id !== id));
    if (name) {
      setProducts((prev) =>
        prev
          .map((pr) => ({
            ...pr,
            participants: pr.participants.filter((x) => x !== name),
          }))
          .filter((pr) => pr.participants.length > 0)
      );
      setSelectedNames((prev) => prev.filter((x) => x !== name));
    }
    setEditingId(null);
  }

  function startEdit(p: Participant) {
    setEditingId(p.id);
    setEditDraft(p.name);
  }

  function saveEdit() {
    if (editingId == null) return;
    const next = editDraft.trim();
    if (!next) return;
    const prevP = participants.find((x) => x.id === editingId);
    const oldName = prevP?.name.trim() || "";
    const otherNames = participants
      .filter((x) => x.id !== editingId)
      .map((x) => x.name.trim())
      .filter(Boolean);
    if (otherNames.some((x) => x.toLowerCase() === next.toLowerCase())) {
      setErr(t("calc.duplicateName"));
      return;
    }
    setErr("");
    setParticipants((prev) =>
      prev.map((x) => (x.id === editingId ? { ...x, name: next } : x))
    );
    if (oldName && oldName !== next) {
      setProducts((prev) =>
        prev.map((pr) => ({
          ...pr,
          participants: pr.participants.map((x) => (x === oldName ? next : x)),
        }))
      );
      setSelectedNames((prev) => prev.map((x) => (x === oldName ? next : x)));
    }
    setEditingId(null);
  }

  function toggleParticipant(name: string) {
    if (splitAmongAll) return;
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  function addProduct(e: React.FormEvent) {
    e.preventDefault();
    const parts = splitAmongAll ? [...namedList] : [...selectedNames];
    if (!prodName.trim() || !prodPrice || parts.length === 0) return;
    const price = parseFloat(prodPrice.replace(",", "."));
    if (!price || price <= 0) return;
    const dividedPrice = price / parts.length;
    setProducts((prev) => [
      ...prev,
      {
        name: prodName.trim(),
        price,
        participants: parts,
        dividedPrice,
      },
    ]);
    setProdName("");
    setProdPrice("");
    if (!splitAmongAll) setSelectedNames([]);
  }

  function removeProduct(i: number) {
    setProducts((prev) => prev.filter((_, j) => j !== i));
  }

  function editProduct(i: number) {
    const p = products[i];
    setProdName(p.name);
    setProdPrice(String(p.price));
    setSelectedNames([...p.participants]);
    setSplitAmongAll(
      namedList.length > 0 &&
        p.participants.length === namedList.length &&
        namedList.every((n) => p.participants.includes(n))
    );
    removeProduct(i);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const payer = namedList[0];
    if (!payer) {
      setErr(t("calc.needParticipants"));
      return;
    }
    if (products.length === 0) {
      setErr(t("calc.needItems"));
      return;
    }
    setLoading(true);
    setResultDetail(null);
    setShareUrl("");
    try {
      const split = await api<SplitResponse>("/api/adhoc/split", {
        method: "POST",
        body: JSON.stringify({
          payer,
          currency,
          products: products.map((p) => ({
            name: p.name,
            price: p.price,
            participants: p.participants,
          })),
        }),
      });
      const detail = await api<AdhocDetail>(`/api/adhoc/${split.id}`);
      setResultDetail(detail);
      setShareUrl(typeof window !== "undefined" ? `${window.location.origin}/r/${split.id}` : "");
      requestAnimationFrame(() => {
        resultWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function downloadPng() {
    const el = resultWrapRef.current?.querySelector(".calc-result-capture") as HTMLElement | null;
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
        scale: window.devicePixelRatio > 1 ? 2 : 1,
        useCORS: true,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "copay-split.png";
      a.click();
    } catch {
      setErr(t("common.error"));
    }
  }

  const perPerson =
    resultDetail?.participants.map((name) => {
      const items = (resultDetail.lineItems || []).filter((li) =>
        li.participants.some((p) => p === name)
      );
      const total = items.reduce((s, li) => {
        const n = li.participants.length || 1;
        return s + li.price / n;
      }, 0);
      return { name, items, total };
    }) ?? [];

  const resultCur = resultDetail?.currency || currency;

  const listScrollStyle = {
    ["--calc-visible-rows" as string]: CALC_LIST_MAX_VISIBLE_ROWS,
  } as React.CSSProperties;

  return (
    <div className="container page-hero">
      <h1 className="page-title">{t("calc.title")}</h1>

      <div className="calc-layout">
        <p className="section-text calc-span-2" style={{ marginTop: 0 }}>
          {t("calc.intro")}
        </p>

        <div className={`${styles.toolbar} calc-span-2`}>
          <button type="button" className="btn-ghost" onClick={() => setReceiptOpen(true)}>
            {t("calc.receiptOpenBtn")}
          </button>
        </div>

        <div className="fw-panel">
          <h2>{t("calc.participants")}</h2>
          <p className={formStyles.subtle} style={{ marginTop: 0, fontSize: "0.88rem" }}>
            {t("calc.implicitPayerHint")}
          </p>
          <div className={styles.personAddRow}>
            <input
              className="fw-base-input"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder={t("calc.participantPlaceholder")}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addParticipant())}
            />
            <button
              type="button"
              className="fw-btn fw-btn-add"
              onClick={addParticipant}
              disabled={participants.length >= 10}
            >
              {t("calc.addParticipant")}
            </button>
          </div>
          {participants.length >= 10 && (
            <p className="err" style={{ marginBottom: "0.5rem" }}>
              {t("calc.maxPeople")}
            </p>
          )}
          <ul
            className={`${styles.personList} ${styles.scrollableViewport}`}
            style={listScrollStyle}
          >
            {participants.map((p) => (
              <li key={p.id} className={styles.personRow}>
                <button
                  type="button"
                  className={`fw-btn fw-btn-del item-btn ${styles.personDelBtn}`}
                  onClick={() => removeParticipant(p.id)}
                  aria-label={t("common.delete")}
                >
                  ×
                </button>
                {editingId === p.id ? (
                  <>
                    <input
                      ref={personEditInputRef}
                      className={`fw-base-input ${styles.personEditInput}`}
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button type="button" className="btn-ghost" onClick={saveEdit}>
                      {t("common.save")}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.personNameBtn}
                    onClick={() => startEdit(p)}
                  >
                    {p.name || "—"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="fw-panel">
          <h2>{t("calc.products")}</h2>
          <form onSubmit={addProduct}>
            <div className="fw-input-row">
              <span>{t("calc.itemName")}</span>
              <input
                className="fw-base-input"
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder={t("calc.productPlaceholder")}
              />
            </div>
            <div className="fw-input-row">
              <span>{t("calc.itemPrice")}</span>
              <div className={styles.priceCurrencyRow}>
                <input
                  className="fw-base-input"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
                <select
                  className={`fw-base-input ${styles.currencySelect}`}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="RUB">{t("currency.rub")}</option>
                  <option value="USD">{t("currency.usd")}</option>
                  <option value="EUR">{t("currency.eur")}</option>
                </select>
              </div>
            </div>
            <label className="fw-check" style={{ display: "flex", marginBottom: "0.65rem" }}>
              <input
                type="checkbox"
                checked={splitAmongAll}
                onChange={(e) => setSplitAmongAll(e.target.checked)}
                disabled={namedList.length === 0}
              />
              {t("calc.splitAll")}
            </label>
            {!splitAmongAll && (
              <p className={styles.splitHint}>{t("calc.splitHint")}</p>
            )}
            {!splitAmongAll && (
              <div
                className={`fw-persons-grid ${styles.scrollableViewport} ${styles.personsGridScroll}`}
                style={listScrollStyle}
              >
                {participants.map((person) => {
                  const nm = person.name.trim();
                  if (!nm) return null;
                  return (
                    <label key={person.id} className="fw-check">
                      <input
                        type="checkbox"
                        checked={selectedNames.includes(nm)}
                        onChange={() => toggleParticipant(nm)}
                      />
                      {nm}
                    </label>
                  );
                })}
              </div>
            )}
            <button className="fw-btn fw-btn-add" type="submit" disabled={namedList.length === 0}>
              {t("common.add")}
            </button>
          </form>

          <h3 style={{ marginTop: "1.25rem" }}>{t("calc.itemsList")}</h3>
          {products.length === 0 ? (
            <p className={formStyles.subtle}>{t("calc.itemsEmpty")}</p>
          ) : (
            <ul
              className={`${styles.productList} ${styles.scrollableViewport} ${styles.productListScroll}`}
              style={listScrollStyle}
            >
              {products.map((product, index) => (
                <li key={index} className="fw-product-item">
                  <div>
                    <strong>{product.name}</strong> — {product.price} {currency} · {t("calc.perPerson")}{" "}
                    {product.dividedPrice.toFixed(2)}
                    <div className={formStyles.subtle} style={{ fontSize: "0.85rem" }}>
                      {product.participants.join(", ")}
                    </div>
                  </div>
                  <div className="fw-product-actions">
                    <button
                      type="button"
                      className="fw-btn fw-btn-edit item-btn"
                      onClick={() => editProduct(index)}
                      aria-label={t("common.edit")}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="fw-btn fw-btn-del item-btn"
                      onClick={() => removeProduct(index)}
                      aria-label={t("common.delete")}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form className={`calc-span-2 ${styles.submitForm}`} onSubmit={onSubmit}>
          {err && <p className="err" style={{ margin: 0 }}>{err}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t("expense.saving") : t("calc.calculate")}
          </button>
        </form>

        {resultDetail && (
          <div className="calc-span-2" ref={resultWrapRef}>
            <div className={`${styles.resultCapture} calc-result-capture`}>
              <h2>{t("calc.resultTitle")}</h2>
              <p className="section-text" style={{ marginTop: 0 }}>
                {t("adhoc.paidSummary", {
                  payer: resultDetail.payer,
                  amount: formatMoney(resultDetail.amount, resultCur),
                  list: resultDetail.participants.join(", "),
                })}
              </p>
              <div className={styles.resultGrid}>
                {perPerson.map((p) => (
                  <div key={p.name} className={styles.resultCard}>
                    <h3>{p.name}</h3>
                    <p style={{ margin: "0 0 0.35rem", fontWeight: 600 }}>
                      {t("adhoc.share")}: {formatMoney(p.total, resultCur)}
                    </p>
                    <ul>
                      {p.items.length === 0 ? (
                        <li>—</li>
                      ) : (
                        p.items.map((li, idx) => {
                          const n = li.participants.length || 1;
                          return (
                            <li key={idx}>
                              {li.name} — {formatMoney(li.price / n, resultCur)}
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                ))}
              </div>
              <h3 style={{ fontSize: "1.05rem", margin: "0 0 0.5rem" }}>{t("calc.transfersTitle")}</h3>
              {resultDetail.transfers.length === 0 ? (
                <p className={formStyles.subtle}>{t("adhoc.noTransfers")}</p>
              ) : (
                <ul className={styles.transferList}>
                  {resultDetail.transfers.map((tr, i) => (
                    <li key={i}>
                      <strong>{tr.from}</strong> → <strong>{tr.to}</strong>:{" "}
                      {formatMoney(tr.amount, resultCur)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div style={{ marginTop: "1rem" }}>
              <h3 className={formStyles.cardTitle} style={{ fontSize: "1rem" }}>
                {t("calc.shareLinkLabel")}
              </h3>
              <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => shareUrl && navigator.clipboard.writeText(shareUrl)}
                >
                  {t("common.copy")}
                </button>
                <button type="button" className="fw-btn fw-btn-download" onClick={downloadPng}>
                  {t("calc.downloadPng")}
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="calc-span-2" style={{ marginTop: "0.5rem" }}>
          <Link to="/">{t("calc.homeLink")}</Link>
        </p>
      </div>

      <ReceiptUploadModal open={receiptOpen} onClose={() => setReceiptOpen(false)} />
    </div>
  );
}
