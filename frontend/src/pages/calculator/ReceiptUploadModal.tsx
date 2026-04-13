import { useRef, useState } from "react";
import { apiUpload } from "../../shared/api/client";
import { formatMoney } from "../../shared/lib/currency";
import { useI18n } from "../../shared/i18n/I18nContext";
import { Modal } from "../../ui/molecules/Modal";

type ParsedItem = { name: string; qty: number; price: number };

type ParseResponse = {
  items?: ParsedItem[];
  total?: number | null;
  note?: string;
  ocrPreview?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  currency?: string;
};

export function ReceiptUploadModal({ open, onClose, currency = "RUB" }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setFile(null);
    setResult(null);
    setErr("");
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function uploadToServer() {
    if (!file) {
      setErr(t("calc.receiptNoFile"));
      return;
    }
    setErr("");
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await apiUpload<ParseResponse>("/api/receipts/parse", fd);
      setResult(r);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  const items = result?.items ?? [];

  return (
    <Modal open={open} onClose={handleClose} title={t("calc.receiptModalTitle")} wide>
      <p className="section-text" style={{ fontSize: "0.95rem", marginTop: 0 }}>
        {t("calc.receiptModalDesc")}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          setResult(null);
          setErr("");
        }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <button type="button" className="btn-ghost" onClick={() => inputRef.current?.click()}>
          {t("calc.receiptChooseFile")}
        </button>
        {file && (
          <span style={{ alignSelf: "center", fontSize: "0.9rem", color: "var(--muted)" }}>
            {file.name}
          </span>
        )}
      </div>
      {err && <p className="err">{err}</p>}
      <button type="button" className="btn-primary" onClick={() => void uploadToServer()} disabled={loading}>
        {loading ? t("common.loading") : t("calc.receiptUploadBtn")}
      </button>

      {result?.note && (
        <p className="ok" style={{ marginTop: "1rem", marginBottom: 0 }}>
          {result.note}
        </p>
      )}

      {result && typeof result.total === "number" && result.total > 0 && (
        <p style={{ marginTop: "0.75rem", fontWeight: 600 }}>
          {t("calc.receiptParsedTotal")}: {formatMoney(result.total, currency)}
        </p>
      )}

      {items.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <strong>{t("calc.receiptParsedLines")}</strong>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem", fontSize: "0.92rem" }}>
            {items.map((it, i) => (
              <li key={i} style={{ marginBottom: "0.35rem" }}>
                {it.qty > 1 ? `${it.qty}× ` : ""}
                {it.name} — {formatMoney(it.price, currency)}
                {it.qty > 1 && (
                  <span style={{ color: "var(--muted)" }}>
                    {" "}
                    ({t("calc.receiptLineSum")}: {formatMoney(it.qty * it.price, currency)})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result?.ocrPreview && (
        <details style={{ marginTop: "1rem", fontSize: "0.82rem", color: "var(--muted)" }}>
          <summary style={{ cursor: "pointer" }}>{t("calc.receiptOcrPreview")}</summary>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              margin: "0.5rem 0 0",
              fontFamily: "inherit",
            }}
          >
            {result.ocrPreview}
          </pre>
        </details>
      )}
    </Modal>
  );
}
