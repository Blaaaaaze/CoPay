import styles from "./SelectedChips.module.css";
import { Button } from "../atoms/Button";

export type Chip = { id: string; label: string };

type Props = {
  title: string;
  chips: Chip[];
  loading?: boolean;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  onRemoveChip: (id: string) => void;
};

export function SelectedChips({
  title,
  chips,
  loading,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  onRemoveChip,
}: Props) {
  if (chips.length === 0) return null;
  return (
    <div className={`card ${styles.wrap}`}>
      <div className={styles.title}>{title}:</div>
      <div className={styles.chips}>
        {chips.map((c) => (
          <Button
            key={c.id}
            type="button"
            variant="ghost"
            className={styles.chip}
            onClick={() => onRemoveChip(c.id)}
          >
            {c.label} ×
          </Button>
        ))}
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="primary" disabled={loading} onClick={onPrimary}>
          {primaryLabel}
        </Button>
        <Button type="button" variant="ghost" disabled={loading} onClick={onSecondary}>
          {secondaryLabel}
        </Button>
      </div>
    </div>
  );
}

