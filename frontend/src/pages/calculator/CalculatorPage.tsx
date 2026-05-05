import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { api } from "../../shared/api/client";
import { ReceiptParseButton } from "../../shared/receipt/ReceiptParseButton";
import { useI18n } from "../../shared/i18n/I18nContext";
import { formatMoney } from "../../shared/lib/currency";
import { mergeProductLinesWithParticipants } from "../../shared/lib/mergeDuplicateLines";
import { ReceiptUploadModal } from "./ReceiptUploadModal";
import formStyles from "../FormPage.module.css";
import styles from "./CalculatorPage.module.css";

type Participant = { id: number; name: string };

type ProductLine = { name: string; price: number; currency: string };

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

type WizardStep = "participants" | "purchases" | "mapping";

type LineEditDraft = { name: string; price: string; currency: string };

export function CalculatorPage() {
  const { t } = useI18n();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [draftName, setDraftName] = useState("");
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [lineParticipants, setLineParticipants] = useState<string[][]>([]);
  const [currency, setCurrency] = useState("RUB");
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [err, setErr] = useState("");
  const [duplicateNameErr, setDuplicateNameErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("participants");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editingProductIdx, setEditingProductIdx] = useState<number | null>(null);
  const [editLineDraft, setEditLineDraft] = useState<LineEditDraft>({
    name: "",
    price: "",
    currency: "RUB",
  });
  const [resultDetail, setResultDetail] = useState<AdhocDetail | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [introOpen, setIntroOpen] = useState(true);
  const resultWrapRef = useRef<HTMLDivElement>(null);
  const personEditInputRef = useRef<HTMLInputElement>(null);
  const productEditNameRef = useRef<HTMLInputElement>(null);

  const namedList = participants.map((p) => p.name.trim()).filter(Boolean);

  const linesRef = useRef({ productLines, lineParticipants });
  linesRef.current = { productLines, lineParticipants };

  useEffect(() => {
    if (editingId == null) return;
    const timer = window.setTimeout(() => {
      personEditInputRef.current?.focus();
      personEditInputRef.current?.select();
    }, 0);
    return () => clearTimeout(timer);
  }, [editingId]);

  useEffect(() => {
    if (editingProductIdx == null) return;
    const timer = window.setTimeout(() => {
      productEditNameRef.current?.focus();
      productEditNameRef.current?.select();
    }, 0);
    return () => clearTimeout(timer);
  }, [editingProductIdx]);

  function addParticipant() {
    const n = draftName.trim();
    if (!n) return;
    if (namedList.some((x) => x.toLowerCase() === n.toLowerCase())) {
      setDuplicateNameErr(t("calc.duplicateName"));
      return;
    }
    setDuplicateNameErr("");
    setErr("");
    setParticipants((prev) => [...prev, { id: Date.now() + Math.random(), name: n }]);
    setDraftName("");
  }

  function removeParticipant(id: number) {
    const p = participants.find((x) => x.id === id);
    const name = p?.name.trim();
    setParticipants((prev) => prev.filter((x) => x.id !== id));
    if (name) {
      setLineParticipants((prev) => prev.map((row) => row.filter((x) => x !== name)));
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
      setDuplicateNameErr(t("calc.duplicateName"));
      return;
    }
    setDuplicateNameErr("");
    setErr("");
    setParticipants((prev) =>
      prev.map((x) => (x.id === editingId ? { ...x, name: next } : x))
    );
    if (oldName && oldName !== next) {
      setLineParticipants((prev) =>
        prev.map((row) => row.map((x) => (x === oldName ? next : x)))
      );
    }
    setEditingId(null);
  }

  function addProductLine(e: React.FormEvent) {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice) return;
    const price = parseFloat(prodPrice.replace(",", "."));
    if (!price || price <= 0) return;
    const curRaw = currency.toUpperCase().slice(0, 8);
    const curNorm =
      curRaw === "USD" || curRaw === "EUR" || curRaw === "RUB" ? curRaw : "RUB";
    const newLine = { name: prodName.trim(), price, currency: curNorm };
    const { productLines: pl, lineParticipants: lp } = linesRef.current;
    const merged = mergeProductLinesWithParticipants([...pl, newLine], [...lp, []]);
    setProductLines(merged.productLines);
    setLineParticipants(merged.lineParticipants);
    setEditingProductIdx(null);
    setProdName("");
    setProdPrice("");
    setErr("");
  }

  function removeProductLine(i: number) {
    setProductLines((prev) => prev.filter((_, j) => j !== i));
    setLineParticipants((prev) => prev.filter((_, j) => j !== i));
    setEditingProductIdx((cur) => {
      if (cur === null) return null;
      if (cur === i) return null;
      if (cur > i) return cur - 1;
      return cur;
    });
  }

  function startEditProduct(i: number) {
    const p = productLines[i];
    setEditingProductIdx(i);
    setEditLineDraft({
      name: p.name,
      price: String(p.price),
      currency: p.currency || "RUB",
    });
  }

  function saveEditProduct() {
    if (editingProductIdx == null) return;
    const name = editLineDraft.name.trim();
    const price = parseFloat(editLineDraft.price.replace(",", "."));
    const cur = editLineDraft.currency.toUpperCase().slice(0, 8);
    const c = cur === "USD" || cur === "EUR" || cur === "RUB" ? cur : "RUB";
    if (!name || !price || price <= 0) return;
    const idx = editingProductIdx;
    setProductLines((prev) =>
      prev.map((x, j) => (j === idx ? { name, price, currency: c } : x))
    );
    setEditingProductIdx(null);
  }

  function cancelEditProduct() {
    setEditingProductIdx(null);
  }

  function goToPurchases() {
    setErr("");
    if (namedList.length === 0) {
      setErr(t("calc.needParticipants"));
      return;
    }
    setWizardStep("purchases");
  }

  function goToMapping() {
    setErr("");
    if (productLines.length === 0) {
      setErr(t("calc.needItems"));
      return;
    }
    setLineParticipants((prev) => {
      const next = [...prev];
      while (next.length < productLines.length) next.push([]);
      return next.slice(0, productLines.length);
    });
    setWizardStep("mapping");
  }

  function splitCurrency(): string {
    if (productLines.length === 0) return currency;
    return productLines[0].currency;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const payer = namedList[0];
    if (!payer) {
      setErr(t("calc.needParticipants"));
      return;
    }
    if (productLines.length === 0) {
      setErr(t("calc.needItems"));
      return;
    }
    if (lineParticipants.length !== productLines.length) {
      setErr(t("calc.needMapping"));
      return;
    }
    if (lineParticipants.some((row) => row.length === 0)) {
      setErr(t("calc.needMapping"));
      return;
    }
    const merged = mergeProductLinesWithParticipants(productLines, lineParticipants);
    setLoading(true);
    setResultDetail(null);
    setShareUrl("");
    try {
      const split = await api<SplitResponse>("/api/adhoc/split", {
        method: "POST",
        body: JSON.stringify({
          payer,
          currency: splitCurrency(),
          products: merged.productLines.map((p, i) => ({
            name: p.name,
            price: p.price,
            participants: merged.lineParticipants[i],
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

  const resultCur = resultDetail?.currency || splitCurrency();

  const stepParticipantsCls = `${styles.wizardStep} ${wizardStep === "participants" ? styles.wizardStepActive : ""}`;
  const stepPurchasesCls = `${styles.wizardStep} ${wizardStep === "purchases" ? styles.wizardStepActive : ""}`;
  const stepMappingCls = `${styles.wizardStep} ${wizardStep === "mapping" ? styles.wizardStepActive : ""}`;

  return (
    <div className={`container ${styles.pageCompact}`}>
      <div className={styles.titleRow}>
        <h1 className="page-title">{t("calc.title")}</h1>
      </div>

      <div className="calc-layout">
        <div className={`${styles.wizardShell} calc-span-2`}>
          <div className={styles.wizardViewport}>
            <div
              className={stepParticipantsCls}
              aria-hidden={wizardStep !== "participants"}
              {...(wizardStep !== "participants" ? { inert: true as const } : {})}
            >
              <div className={`fw-panel ${styles.formPanel}`}>
                <div className={styles.sectionHeadingRow}>
                  <h2>
                    {t("calc.participants")}
                    <span className={`${styles.introHintWrap} ${styles.headingHintWrap}`}>
                      <button
                        type="button"
                        className={styles.introHintBtn}
                        aria-label={t("calc.introHintAria")}
                        aria-expanded={introOpen}
                        aria-controls="calc-intro-panel"
                        onClick={() => setIntroOpen((v) => !v)}
                      >
                        i
                      </button>
                    </span>
                  </h2>
                </div>
                <div
                  id="calc-intro-panel"
                  className={styles.introInlinePanel}
                  role="region"
                  aria-label={t("calc.introHintAria")}
                  hidden={!introOpen}
                >
                  {t("calc.intro")}
                </div>
                <p
                  className={`${formStyles.subtle} ${styles.participantsStaticHint}`}
                  style={{ marginTop: 0, fontSize: "0.88rem" }}
                >
                  {t("calc.implicitPayerHint")}
                </p>
                <div className={styles.personAddRow}>
                  <input
                    className="fw-base-input"
                    value={draftName}
                    onChange={(e) => {
                      setDraftName(e.target.value);
                      setDuplicateNameErr("");
                    }}
                    placeholder={t("calc.participantPlaceholder")}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addParticipant())}
                  />
                  <button type="button" className="btn-primary" onClick={addParticipant}>
                    {t("calc.addParticipant")}
                  </button>
                  <button type="button" className="btn-primary" onClick={goToPurchases}>
                    {t("calc.next")}
                  </button>
                </div>
                {duplicateNameErr && (
                  <p
                    className={`err ${styles.inputHintErr} ${styles.participantsStaticHint}`}
                    style={{ margin: "0 0 0.65rem" }}
                  >
                    {duplicateNameErr}
                  </p>
                )}
                <div className={styles.participantsScrollArea}>
                  <ul className={styles.personList}>
                    {participants.map((p) => (
                      <li
                        key={p.id}
                        className={`${styles.personRow} ${editingId === p.id ? styles.personRowEditing : ""}`}
                      >
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
                              onChange={(e) => {
                                setEditDraft(e.target.value);
                                setDuplicateNameErr("");
                              }}
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
                {err && wizardStep === "participants" && (
                  <p className={`err ${styles.participantsStaticHint}`} style={{ margin: "0.75rem 0 0" }}>
                    {err}
                  </p>
                )}
              </div>
            </div>

            <div
              className={stepPurchasesCls}
              aria-hidden={wizardStep !== "purchases"}
              {...(wizardStep !== "purchases" ? { inert: true as const } : {})}
            >
              <div className={`fw-panel ${styles.formPanel}`}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    marginBottom: "0.5rem",
                    flexShrink: 0,
                  }}
                >
                  <h2 style={{ margin: 0 }}>{t("calc.purchasesStepTitle")}</h2>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setErr("");
                      setWizardStep("participants");
                    }}
                  >
                    {t("calc.back")}
                  </button>
                </div>
                <div className={styles.productsBody}>
                  <div className={styles.productsFormBlock}>
                    <form onSubmit={addProductLine}>
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
                      <div className={styles.addProductRow}>
                        <button className="btn-primary" type="submit">
                          {t("common.add")}
                        </button>
                        <ReceiptParseButton
                          label={t("calc.receiptFromFile")}
                          onError={(m) => setErr(m)}
                          onParsed={(items, _tot, meta) => {
                            if (items.length === 0) {
                              setErr(meta.note || "");
                              return;
                            }
                            setErr("");
                            const curRaw = currency.toUpperCase().slice(0, 8);
                            const curNorm =
                              curRaw === "USD" || curRaw === "EUR" || curRaw === "RUB" ? curRaw : "RUB";
                            const { productLines: pl, lineParticipants: lp } = linesRef.current;
                            const appended = [
                              ...pl,
                              ...items.map((it) => ({
                                name: it.name,
                                price: Math.round(it.qty * it.price * 100) / 100,
                                currency: curNorm,
                              })),
                            ];
                            const appendedLp = [
                              ...lp,
                              ...items.map(() => [...namedList]),
                            ];
                            const merged = mergeProductLinesWithParticipants(appended, appendedLp);
                            setProductLines(merged.productLines);
                            setLineParticipants(merged.lineParticipants);
                            setEditingProductIdx(null);
                          }}
                        />
                        <button type="button" className="btn-primary" onClick={goToMapping}>
                          {t("calc.next")}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className={styles.productsListBlock}>
                    <h3>{t("calc.itemsList")}</h3>
                    {productLines.length === 0 ? (
                      <p className={formStyles.subtle}>{t("calc.itemsEmpty")}</p>
                    ) : (
                      <ul className={styles.productList}>
                        {productLines.map((line, index) => (
                          <li key={index} className="fw-product-item">
                            <div className={styles.productLineMain}>
                              {editingProductIdx === index ? (
                                <div className={styles.productLineEditRow}>
                                  <input
                                    ref={productEditNameRef}
                                    className={`fw-base-input ${styles.productLineEditName}`}
                                    value={editLineDraft.name}
                                    onChange={(e) =>
                                      setEditLineDraft((d) => ({ ...d, name: e.target.value }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveEditProduct();
                                      if (e.key === "Escape") cancelEditProduct();
                                    }}
                                  />
                                  <input
                                    className={`fw-base-input ${styles.productLineEditPrice}`}
                                    value={editLineDraft.price}
                                    onChange={(e) =>
                                      setEditLineDraft((d) => ({ ...d, price: e.target.value }))
                                    }
                                    inputMode="decimal"
                                  />
                                  <select
                                    className={`fw-base-input ${styles.currencySelect} ${styles.productLineEditCurrency}`}
                                    value={editLineDraft.currency}
                                    onChange={(e) =>
                                      setEditLineDraft((d) => ({ ...d, currency: e.target.value }))
                                    }
                                  >
                                    <option value="RUB">{t("currency.rub")}</option>
                                    <option value="USD">{t("currency.usd")}</option>
                                    <option value="EUR">{t("currency.eur")}</option>
                                  </select>
                                  <button type="button" className="btn-ghost" onClick={saveEditProduct}>
                                    {t("common.save")}
                                  </button>
                                  <button type="button" className="btn-ghost" onClick={cancelEditProduct}>
                                    {t("common.cancel")}
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span
                                    className={styles.productLineEditable}
                                    onClick={() => startEditProduct(index)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        startEditProduct(index);
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                  >
                                    <strong>{line.name}</strong>
                                  </span>
                                  <span aria-hidden>—</span>
                                  <span
                                    className={styles.productLineEditable}
                                    onClick={() => startEditProduct(index)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        startEditProduct(index);
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                  >
                                    {line.price}
                                  </span>
                                  <span
                                    className={styles.productLineEditable}
                                    onClick={() => startEditProduct(index)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        startEditProduct(index);
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                  >
                                    {line.currency}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="fw-product-actions">
                              <button
                                type="button"
                                className="fw-btn fw-btn-del item-btn"
                                onClick={() => removeProductLine(index)}
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
                </div>
                {err && wizardStep === "purchases" && (
                  <p className="err" style={{ margin: "0.5rem 0 0" }}>
                    {err}
                  </p>
                )}
              </div>
            </div>

            <div
              className={stepMappingCls}
              aria-hidden={wizardStep !== "mapping"}
              {...(wizardStep !== "mapping" ? { inert: true as const } : {})}
            >
              <div className={`fw-panel ${styles.formPanel}`}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    marginBottom: "0.35rem",
                    flexShrink: 0,
                  }}
                >
                  <h2 style={{ margin: 0 }}>{t("calc.mappingStepTitle")}</h2>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setErr("");
                      setWizardStep("purchases");
                    }}
                  >
                    {t("calc.back")}
                  </button>
                </div>
                <p className={formStyles.subtle} style={{ marginTop: 0, fontSize: "0.88rem" }}>
                  {t("calc.mappingHint")}
                </p>
                <div className={styles.mappingViewport}>
                  {productLines.map((line, i) => (
                    <div key={i} className={styles.mappingCard}>
                      <div className={styles.mappingCardTitle}>
                        {line.name} — {line.price} {line.currency}
                      </div>
                      <label className={styles.mappingSelectLabel} htmlFor={`mapping-select-${i}`}>
                        {t("calc.mappingSelectLabel")}
                      </label>
                      <div className={styles.mappingChecks}>
                        {namedList.map((nm) => {
                          const checked = (lineParticipants[i] ?? []).includes(nm);
                          return (
                            <label key={nm} className="fw-check">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setLineParticipants((prev) => {
                                    const out = [...prev];
                                    const row = new Set(out[i] ?? []);
                                    if (row.has(nm)) row.delete(nm);
                                    else row.add(nm);
                                    out[i] = namedList.filter((x) => row.has(x));
                                    return out;
                                  });
                                }}
                              />
                              {nm}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.productsFooter}>
                  <form className={styles.submitForm} onSubmit={onSubmit}>
                    {err && wizardStep === "mapping" && (
                      <p className="err" style={{ margin: 0 }}>
                        {err}
                      </p>
                    )}
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? t("expense.saving") : t("calc.calculate")}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

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
      </div>

      <ReceiptUploadModal open={receiptOpen} onClose={() => setReceiptOpen(false)} currency={currency} />
    </div>
  );
}
