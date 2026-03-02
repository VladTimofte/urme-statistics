"use client";

import { useEffect, useState } from "react";

export default function GuestPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/guest/stats", { cache: "no-store" });
        const d = await res.json();
        if (!res.ok || !d.ok) throw new Error(d?.error || "Failed");
        setData(d);
      } catch {
        setErr("Nu pot incarca datele.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>Guest</h1>
        <button onClick={logout} style={styles.outBtn}>
          Logout
        </button>
      </div>

      {loading ? <div style={styles.card}>Loading...</div> : null}
      {err ? <div style={styles.card}>{err}</div> : null}

      {data ? (
        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Bilete vandute (PAID)</div>
            <div style={styles.value}>{data.paidTickets}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.label}>Total bilete</div>
            <div style={styles.value}>{data.totalStock}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.label}>Ramase</div>
            <div style={styles.value}>{data.remaining}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.label}>Comenzi PAID</div>
            <div style={styles.value}>{data.paidOrders}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  wrap: { padding: 20, maxWidth: 1100, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  outBtn: {
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    padding: "8px 12px",
    cursor: "pointer",
    background: "#fff",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0,1fr))",
    gap: 12,
  },
  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,.08)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,.05)",
  },
  label: { color: "rgba(0,0,0,.65)", fontSize: 13 },
  value: { fontSize: 28, fontWeight: 800, marginTop: 6 },
};
