"use client";

import { useEffect, useMemo, useState } from "react";

export default function AdminPage() {
  const [q, setQ] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/tickets?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d?.error || "Failed");
      setTickets(d.tickets || []);
    } catch {
      setErr("Nu pot incarca biletele.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c = { PAID: 0, PENDING: 0, FAILED: 0 };
    for (const t of tickets) c[t.paymentState] = (c[t.paymentState] || 0) + 1;
    return c;
  }, [tickets]);

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>Admin</h1>
          <div style={{ color: "rgba(0,0,0,.65)", marginTop: 4 }}>
            Tickets: <b>{tickets.length}</b> | Paid: <b>{counts.PAID}</b> |
            Pending: <b>{counts.PENDING}</b> | Failed: <b>{counts.FAILED}</b>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/api/admin/tickets.csv" style={styles.csvBtn}>
            Download CSV
          </a>
          <button onClick={logout} style={styles.outBtn}>
            Logout
          </button>
        </div>
      </div>

      <div style={styles.controls}>
        <input
          style={styles.input}
          placeholder="Search dupa nume/prenume participant..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={load} style={styles.btn} disabled={loading}>
          {loading ? "Loading..." : "Search"}
        </button>
      </div>

      {err ? <div style={styles.err}>{err}</div> : null}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Participant</th>
              <th style={styles.th}>Workshop</th>
              <th style={styles.th}>Cumparat de</th>
              <th style={styles.th}>Order</th>
              <th style={styles.th}>Detalii</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={`${t.orderId}-${t.ticketIndex}`}>
                <td style={styles.td}>
                  <span style={badgeStyle(t.paymentState)}>
                    {t.paymentState}
                  </span>
                </td>
                <td style={styles.td}>
                  <b>
                    {(t.attendeeFirstName || "-") +
                      " " +
                      (t.attendeeLastName || "")}
                  </b>
                  <div style={{ color: "rgba(0,0,0,.55)", fontSize: 12 }}>
                    Ticket #{t.ticketIndex}
                  </div>
                </td>
                <td style={styles.td}>{t.attendeeWorkshop || "-"}</td>
                <td style={styles.td}>{t.purchasedBy || "-"}</td>
                <td style={styles.td}>
                  #{t.orderNumber}{" "}
                  <div style={{ color: "rgba(0,0,0,.55)", fontSize: 12 }}>
                    {t.orderStatus}
                  </div>
                </td>
                <td style={styles.td}>
                  {t.attendeeHasFullDetails ? (
                    <div style={{ fontSize: 12, lineHeight: 1.35 }}>
                      <div>
                        <b>Judet:</b> {t.attendeeDetails?.county || "-"}
                      </div>
                      <div>
                        <b>Biserica:</b> {t.attendeeDetails?.church || "-"}
                      </div>
                      <div>
                        <b>Departament:</b>{" "}
                        {t.attendeeDetails?.department || "-"}
                      </div>
                      <div>
                        <b>Varsta:</b> {t.attendeeDetails?.ageRange || "-"}
                      </div>
                      <div>
                        <b>Sursa:</b> {t.attendeeDetails?.heardFrom || "-"}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "rgba(0,0,0,.65)" }}>
                      Fara detalii (bilet cumparat de{" "}
                      {t.purchasedBy || "altcineva"})
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && tickets.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={6}>
                  No results
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function badgeStyle(state) {
  const base = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid rgba(0,0,0,.10)",
  };
  if (state === "PAID") return { ...base, background: "rgba(34,197,94,.12)" };
  if (state === "PENDING")
    return { ...base, background: "rgba(234,179,8,.14)" };
  return { ...base, background: "rgba(239,68,68,.12)" };
}

const styles = {
  wrap: { padding: 20, maxWidth: 1200, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  controls: { display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  input: {
    minWidth: 320,
    flex: 1,
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    padding: "10px 12px",
    outline: "none",
  },
  btn: {
    border: "none",
    borderRadius: 12,
    padding: "10px 14px",
    cursor: "pointer",
    background: "#276678",
    color: "#fff",
    fontWeight: 800,
  },
  outBtn: {
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    padding: "8px 12px",
    cursor: "pointer",
    background: "#fff",
  },
  csvBtn: {
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    padding: "8px 12px",
    cursor: "pointer",
    background: "#fff",
    textDecoration: "none",
    color: "#000",
  },
  err: {
    background: "rgba(239,68,68,.08)",
    border: "1px solid rgba(239,68,68,.25)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  tableWrap: {
    overflow: "auto",
    border: "1px solid rgba(0,0,0,.08)",
    borderRadius: 16,
    background: "#fff",
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 980 },
  th: {
    textAlign: "left",
    fontSize: 12,
    letterSpacing: ".04em",
    textTransform: "uppercase",
    color: "rgba(0,0,0,.65)",
    padding: 12,
    borderBottom: "1px solid rgba(0,0,0,.08)",
  },
  td: {
    padding: 12,
    borderBottom: "1px solid rgba(0,0,0,.08)",
    verticalAlign: "top",
  },
};
