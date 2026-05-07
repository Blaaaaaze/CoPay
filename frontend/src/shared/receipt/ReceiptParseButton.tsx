import { useRef, useState } from "react";
import { apiUpload } from "../api/client";
import { useI18n } from "../i18n/I18nContext";
import { Button } from "../../ui/atoms/Button";
import { FileInput } from "../../ui/atoms/FileInput";

export type ReceiptParsedItem = { name: string; qty: number; price: number };

export type ReceiptParseResult = {
  items?: ReceiptParsedItem[];
  total?: number | null;
  note?: string;
  ocrPreview?: string | null;
};

type Props = {
  label: string;
  disabled?: boolean;
  className?: string;
  onParsed: (items: ReceiptParsedItem[], total: number | null | undefined, meta: ReceiptParseResult) => void;
  onError?: (message: string) => void;
};

export function ReceiptParseButton({ label, disabled, className, onParsed, onError }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || disabled || loading) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await apiUpload<ReceiptParseResult>("/api/receipts/parse", fd);
      const items = r.items ?? [];
      onParsed(items, r.total ?? undefined, r);
    } catch (ex) {
      onError?.(ex instanceof Error ? ex.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <FileInput
        ref={inputRef}
        accept="image/*"
        hidden
        onChange={(e) => void onFile(e)}
      />
      <Button
        type="button"
        variant="ghost"
        className={className}
        disabled={disabled || loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? t("common.loading") : label}
      </Button>
    </>
  );
}
