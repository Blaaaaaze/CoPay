import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import styles from "./App.module.css";

function Home() {
  const [health, setHealth] = useState<string>("…");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: unknown) => setHealth(JSON.stringify(d)))
      .catch(() => setHealth("ошибка запроса"));
  }, []);

  return (
    <main className={styles.home}>
      <h1 className={styles.homeTitle}>CoPay</h1>
      <p>
        Каркас фронтенда. Ответ <code>/api/health</code>: <code>{health}</code>
      </p>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
