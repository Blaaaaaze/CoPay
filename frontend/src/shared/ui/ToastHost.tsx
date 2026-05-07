import { useEffect, useState } from "react";
import { onToast } from "./toast";
import styles from "./ToastHost.module.css";

export function ToastHost() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    return onToast((m) => {
      setMsg(m);
      window.clearTimeout((window as any).__copayToastTimer);
      (window as any).__copayToastTimer = window.setTimeout(() => setMsg(""), 1800);
    });
  }, []);

  if (!msg) return null;

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      {msg}
    </div>
  );
}

