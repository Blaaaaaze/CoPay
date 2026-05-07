import { useEffect, useState } from "react";
import { onToast } from "./toast";

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
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 18,
        transform: "translateX(-50%)",
        padding: "0.6rem 0.9rem",
        borderRadius: 12,
        background: "rgba(20, 20, 20, 0.92)",
        color: "white",
        fontSize: "0.95rem",
        zIndex: 9999,
        maxWidth: "min(92vw, 520px)",
        boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
      }}
      role="status"
      aria-live="polite"
    >
      {msg}
    </div>
  );
}

