"use client";

import { useEffect, useState } from "react";

export default function GuestPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 680px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/guest/stats", { cache: "no-store" });
        const d = await res.json();
        console.log("d", d);

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
    <div style={styles.wrap(isMobile)}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle(isMobile)}>URME</h1>
        <button onClick={logout} style={styles.outBtn}>
          Logout
        </button>
      </div>

      {loading ? <div style={styles.card}>Loading...</div> : null}
      {err ? <div style={styles.card}>{err}</div> : null}

      {data ? (
        <>
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.label}>Participanti inscrisi</div>
              <div style={styles.value(isMobile)}>{data.registeredParticipants}</div>
            </div>

            <div style={styles.card}>
              <div style={styles.label}>Total bilete</div>
              <div style={styles.value(isMobile)}>{data.totalStock}</div>
            </div>

            <div style={styles.card}>
              <div style={styles.label}>Ramase</div>
              <div style={styles.value(isMobile)}>{data.remaining}</div>
            </div>

          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle(isMobile)}>Inscrieri pe workshop</h2>

            <div style={styles.workshopGrid}>
              {(data.workshops || []).map((workshop) => (
                <div key={workshop.key} style={styles.card}>
                  <div style={styles.label}>{workshop.label}</div>
                  <div style={styles.value(isMobile)}>{workshop.count}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

const styles = {
  wrap: (isMobile) => ({
    padding: isMobile ? 14 : 20,
    maxWidth: 1100,
    margin: "0 auto",
  }),

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
    flexWrap: "wrap",
  },

  pageTitle: (isMobile) => ({
    margin: 0,
    fontSize: isMobile ? 28 : 36,
    lineHeight: 1.1,
  }),

  outBtn: {
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    padding: "8px 12px",
    cursor: "pointer",
    background: "#fff",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },

  workshopGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
  },

  section: {
    marginTop: 18,
  },

  sectionTitle: (isMobile) => ({
    margin: "0 0 12px 0",
    fontSize: isMobile ? 20 : 22,
    fontWeight: 800,
    lineHeight: 1.2,
  }),

  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,.08)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,.05)",
    minWidth: 0,
  },

  label: {
    color: "rgba(0,0,0,.65)",
    fontSize: 13,
    lineHeight: 1.4,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  value: (isMobile) => ({
    fontSize: isMobile ? 24 : 28,
    fontWeight: 800,
    marginTop: 6,
    lineHeight: 1.15,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  }),
};
