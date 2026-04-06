import { useRef, useState } from "react";
import { api } from "../../shared/api/client";
import { useI18n } from "../../shared/i18n/I18nContext";
import { Modal } from "../../ui/molecules/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ReceiptUploadModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setFile(null);
    setNote(null);
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
    try {
      const r = await api<{ note?: string }>("/api/receipts/mock-parse", {
        method: "POST",
        body: JSON.stringify({ fileName: file.name }),
      });
      setNote(r.note || "");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("calc.receiptModalTitle")}>
      <p className="section-text" style={{ fontSize: "0.95rem", marginTop: 0 }}>
        {t("calc.receiptModalDesc")}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          setNote(null);
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
      <button type="button" className="btn-primary" onClick={uploadToServer} disabled={loading}>
        {loading ? t("common.loading") : t("calc.receiptUploadBtn")}
      </button>
      {note && (
        <p className="ok" style={{ marginTop: "1rem" }}>
          {note}
        </p>
      )}
    </Modal>
  );
}
