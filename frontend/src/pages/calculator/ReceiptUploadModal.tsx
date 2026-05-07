import { useRef, useState } from "react";
import { apiUpload } from "../../shared/api/client";
import { formatMoney } from "../../shared/lib/currency";
import { useI18n } from "../../shared/i18n/I18nContext";
import { Modal } from "../../ui/molecules/Modal";
import { Button } from "../../ui/atoms/Button";
import { FileInput } from "../../ui/atoms/FileInput";
import styles from "./ReceiptUploadModal.module.css";

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
      <p className={`section-text ${styles.desc}`}>
        {t("calc.receiptModalDesc")}
      </p>
      <FileInput
        ref={inputRef}
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          setResult(null);
          setErr("");
        }}
      />
      <div className={styles.toolbar}>
        <Button type="button" variant="ghost" onClick={() => inputRef.current?.click()}>
          {t("calc.receiptChooseFile")}
        </Button>
        {file && (
          <span className={styles.fileName}>{file.name}</span>
        )}
      </div>
      {err && <p className="err">{err}</p>}
      <Button type="button" variant="primary" onClick={() => void uploadToServer()} disabled={loading}>
        {loading ? t("common.loading") : t("calc.receiptUploadBtn")}
      </Button>

      {result?.note && (
        <p className={`ok ${styles.noteOk}`}>
          {result.note}
        </p>
      )}

      {result && typeof result.total === "number" && result.total > 0 && (
        <p className={styles.totalLine}>
          {t("calc.receiptParsedTotal")}: {formatMoney(result.total, currency)}
        </p>
      )}

      {items.length > 0 && (
        <div className={styles.itemsBlock}>
          <strong>{t("calc.receiptParsedLines")}</strong>
          <ul className={styles.itemsList}>
            {items.map((it, i) => (
              <li key={i} className={styles.itemRow}>
                {it.qty > 1 ? `${it.qty}× ` : ""}
                {it.name} — {formatMoney(it.price, currency)}
                {it.qty > 1 && (
                  <span className={styles.itemSumHint}>
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
        <details className={styles.ocrDetails}>
          <summary className={styles.ocrSummary}>{t("calc.receiptOcrPreview")}</summary>
          <pre className={styles.ocrPre}>
            {result.ocrPreview}
          </pre>
        </details>
      )}
    </Modal>
  );
}
