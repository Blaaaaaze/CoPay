import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";

function Home() {
  const [health, setHealth] = useState<string>("…");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: unknown) => setHealth(JSON.stringify(d)))
      .catch(() => setHealth("ошибка запроса"));
  }, []);

  return (
    <main style={{ padding: "1.5rem", maxWidth: "40rem" }}>
      <h1 style={{ marginTop: 0 }}>CoPay</h1>
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
