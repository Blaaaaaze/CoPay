import styles from "./UserSearchSelectCard.module.css";
import { Checkbox } from "../atoms/Checkbox";

type Props = {
  checked: boolean;
  disabled?: boolean;
  name: string;
  onToggle: () => void;
};

export function UserSearchSelectCard({ checked, disabled, name, onToggle }: Props) {
  return (
    <label className={`${styles.card} ${disabled ? styles.disabled : ""}`}>
      <Checkbox
        className={styles.checkbox}
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
      />
      <div className={styles.name}>{name}</div>
    </label>
  );
}

