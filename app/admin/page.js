"use client";

import { useEffect, useMemo, useState } from "react";
import {
  WORKSHOP_MAP,
  displayWorkshop,
  displaySource,
} from "../helpers/strings";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function AdminPage() {
  const [q, setQ] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [selectedWorkshop, setSelectedWorkshop] = useState("");
  const [selected, setSelected] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const isModalOpen = !!selected;

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/admin/tickets", {
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

  async function refreshTickets() {
    setQ("");
    setSelectedWorkshop("");
    setSelected(null);
    await load();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  useEffect(() => {
    console.log("selected", selected);
  }, [selected]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const c = { PAID: 0, PENDING: 0, FAILED: 0 };
    for (const t of tickets) {
      c[t.paymentState] = (c[t.paymentState] || 0) + 1;
    }
    return c;
  }, [tickets]);

  const workshopSummary = useMemo(() => {
    const summary = Object.keys(WORKSHOP_MAP).map((key) => ({
      key,
      label: WORKSHOP_MAP[key],
      count: tickets.filter(
        (t) => t.attendeeWorkshop === key && t.paymentState === "PAID",
      ).length,
    }));
    console.log("summary", summary);
    console.log("tickets", tickets);

    return summary;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const normalizedQ = normalizeText(q);

    return tickets.filter((t) => {
      const matchesWorkshop = selectedWorkshop
        ? t.attendeeWorkshop === selectedWorkshop
        : true;

      if (!matchesWorkshop) return false;

      if (!normalizedQ) return true;

      const haystack = [t.attendeeFirstName, t.attendeeLastName, t.purchasedBy]
        .map(normalizeText)
        .join(" ");

      return haystack.includes(normalizedQ);
    });
  }, [tickets, q, selectedWorkshop]);

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>Admin</h1>
          <div style={{ color: "rgba(0,0,0,.65)", marginTop: 4 }}>
            Bilete Cumparate: <b>{counts?.PAID} / 150</b>
            {!!counts?.PENDING && (
              <>
                {" "}
                | Se asteapta plata: <b>{counts.PENDING}</b>
              </>
            )}
            {!!counts?.FAILED && (
              <>
                {" "}
                | Bilete eroare: <b>{counts.FAILED}</b>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/api/admin/tickets.csv" style={styles.csvBtn}>
            Download CSV
          </a>

          <button
            onClick={refreshTickets}
            style={styles.refreshBtn}
            disabled={loading}
            title="Refresh date"
            aria-label="Refresh date"
          >
            {loading ? "..." : "↻"}
          </button>

          <button onClick={logout} style={styles.outBtn}>
            Logout
          </button>
        </div>
      </div>

      <div style={styles.controls}>
        <input
          style={styles.input}
          placeholder="Cautare dupa nume/prenume participant sau cumparat de..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          style={styles.select}
          value={selectedWorkshop}
          onChange={(e) => setSelectedWorkshop(e.target.value)}
        >
          <option value="">Toate workshop-urile</option>
          {Object.entries(WORKSHOP_MAP).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {err ? <div style={styles.err}>{err}</div> : null}

      <div style={styles.workshopSummaryWrap}>
        <div style={styles.workshopSummaryTitle}>
          Workshop-uri (Doar bilete platite)
        </div>
        <div style={styles.workshopSummaryGrid}>
          {workshopSummary.map((item) => (
            <div key={item.key} style={styles.workshopSummaryCard}>
              <div style={styles.workshopSummaryLabel}>{item.label}</div>
              <div style={styles.workshopSummaryCount}>{item.count}</div>
            </div>
          ))}
        </div>
      </div>

      {isMobile ? (
        <div style={{ display: "grid", gap: 10 }}>
          {filteredTickets.map((t) => (
            <button
              key={`${t.orderId}-${t.ticketIndex}`}
              onClick={() => setSelected(t)}
              style={styles.mobileCardBtn}
            >
              <div style={styles.mobileRow}>
                <span style={badgeStyle(t.paymentState)}>{t.paymentState}</span>
                <div style={{ fontWeight: 800 }}>
                  {(t.attendeeFirstName || "-") +
                    " " +
                    (t.attendeeLastName || "")}
                </div>
              </div>

              <div style={styles.mobileMeta}>
                <div>
                  <b>Workshop:</b> {displayWorkshop(t.attendeeWorkshop) || "-"}
                </div>
                {`${t.attendeeFirstName + " " + t.attendeeLastName}` !==
                  t?.purchasedBy && (
                  <div>
                    <b>Cumparat de:</b> {t.purchasedBy || "-"}
                  </div>
                )}
              </div>

              <div
                style={{ marginTop: 8, color: "rgba(0,0,0,.6)", fontSize: 12 }}
              >
                Tap pentru detalii
              </div>
            </button>
          ))}

          {!loading && filteredTickets.length === 0 ? (
            <div style={styles.card}>No results</div>
          ) : null}

          {loading ? <div style={styles.card}>Loading...</div> : null}
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Participant</th>
                <th style={styles.th}>Workshop</th>
                <th style={styles.th}>Bilet Cumparat de</th>
                <th style={styles.th}>Detalii</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((t) => (
                <tr
                  key={`${t.orderId}-${t.ticketIndex}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelected(t)}
                  title="Click pentru detalii"
                >
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
                  </td>
                  <td style={styles.td}>
                    {displayWorkshop(t.attendeeWorkshop) || "-"}
                  </td>
                  <td style={styles.td}>{t.purchasedBy || "-"}</td>
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
                          <b>Varsta:</b> {t.attendeeDetails?.ageRange || "-"}
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

              {!loading && filteredTickets.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={6}>
                    No results
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen ? (
        <TicketModal ticket={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function TicketModal({ ticket, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const attendeeName =
    `${ticket.attendeeFirstName || "-"} ${ticket.attendeeLastName || ""}`.trim();

  return (
    <div style={modalStyles.backdrop} onMouseDown={onClose}>
      <div style={modalStyles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={modalStyles.head}>
          <div>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span style={badgeStyle(ticket.paymentState)}>
                {ticket.paymentState}
              </span>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                {attendeeName}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={modalStyles.closeBtn}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={modalStyles.body}>
          <Section title="Participant">
            <Row
              label="Workshop"
              value={displayWorkshop(ticket.attendeeWorkshop) || "-"}
            />
            <Row label="Cumparat de" value={ticket.purchasedBy || "-"} />
            {ticket.attendeeHasFullDetails && (
              <>
                <Row label="Email (order)" value={ticket.email || "-"} />
                <Row label="Telefon (order)" value={ticket.phone || "-"} />
              </>
            )}
            <Row
              label="Data comanda"
              value={
                new Date(ticket.dateCreated).toLocaleString("ro-RO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }) || "-"
              }
            />
          </Section>

          <Section title="Detalii complete (doar pentru cumparator)">
            {ticket.attendeeHasFullDetails ? (
              <>
                <Row
                  label="Judet"
                  value={ticket.attendeeDetails?.county || "-"}
                />
                <Row
                  label="Biserica"
                  value={ticket.attendeeDetails?.church || "-"}
                />
                <Row
                  label="Departament"
                  value={ticket.attendeeDetails?.department || "-"}
                />
                <Row
                  label="Varsta"
                  value={ticket.attendeeDetails?.ageRange || "-"}
                />
                <Row
                  label="Sursa"
                  value={
                    displaySource(ticket.attendeeDetails?.heardFrom) || "-"
                  }
                />
              </>
            ) : (
              <div style={{ color: "rgba(0,0,0,.7)", lineHeight: 1.45 }}>
                Acest participant este “extra” (bilet cumparat de{" "}
                <b>{ticket.purchasedBy || "altcineva"}</b>), deci nu are
                judet/biserica/etc in comanda.
              </div>
            )}
          </Section>
        </div>

        <div style={modalStyles.footer}>
          <button onClick={onClose} style={modalStyles.primaryBtn}>
            Inchide
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,.08)",
        borderRadius: 16,
        padding: 12,
        background: "#fff",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  const isSmall =
    typeof window !== "undefined" ? window.innerWidth < 520 : false;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isSmall
          ? "1fr"
          : "minmax(120px, 160px) minmax(0, 1fr)",
        gap: 6,
        alignItems: "start",
      }}
    >
      <div
        style={{
          color: "rgba(0,0,0,.65)",
          fontSize: 13,
          lineHeight: 1.4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight: 700,
          lineHeight: 1.45,
          whiteSpace: "normal",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          minWidth: 0,
        }}
      >
        {value}
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
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,.10)",
    whiteSpace: "nowrap",
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
  controls: {
    display: "flex",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  input: {
    minWidth: 260,
    flex: 1,
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    padding: "10px 12px",
    outline: "none",
  },
  select: {
    minWidth: 280,
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    padding: "10px 12px",
    outline: "none",
    background: "#fff",
  },
  btn: {
    border: "none",
    borderRadius: 12,
    padding: "10px 14px",
    cursor: "pointer",
    background: "#276678",
    color: "#fff",
    fontWeight: 900,
  },
  refreshBtn: {
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    width: 42,
    height: 42,
    cursor: "pointer",
    background: "#fff",
    fontSize: 20,
    fontWeight: 900,
    lineHeight: 1,
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
  summaryBar: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    alignItems: "center",
    padding: "10px 12px",
    background: "#fff",
    border: "1px solid rgba(0,0,0,.08)",
    borderRadius: 14,
    marginBottom: 12,
    color: "rgba(0,0,0,.82)",
  },
  workshopSummaryWrap: {
    marginBottom: 14,
    background: "#fff",
    border: "1px solid rgba(0,0,0,.08)",
    borderRadius: 16,
    padding: 14,
  },
  workshopSummaryTitle: {
    fontWeight: 900,
    marginBottom: 12,
  },
  workshopSummaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
  },
  workshopSummaryCard: {
    border: "1px solid rgba(0,0,0,.08)",
    borderRadius: 14,
    padding: 12,
    background: "#f8f9fb",
  },
  workshopSummaryLabel: {
    fontSize: 13,
    color: "rgba(0,0,0,.75)",
    lineHeight: 1.4,
    marginBottom: 8,
  },
  workshopSummaryCount: {
    fontSize: 22,
    fontWeight: 900,
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
  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,.08)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,.05)",
  },
  mobileCardBtn: {
    textAlign: "left",
    background: "#fff",
    border: "1px solid rgba(0,0,0,.08)",
    borderRadius: 16,
    padding: 14,
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(0,0,0,.05)",
  },
  mobileRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  mobileMeta: {
    marginTop: 10,
    display: "grid",
    gap: 6,
    fontSize: 13,
    color: "rgba(0,0,0,.85)",
  },
};

const modalStyles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.45)",
    display: "grid",
    placeItems: "center",
    padding: 14,
    zIndex: 9999,
  },
  modal: {
    width: "100%",
    maxWidth: 720,
    background: "#f8f9fb",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.25)",
    boxShadow: "0 20px 80px rgba(0,0,0,.25)",
    overflow: "hidden",
  },
  head: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    padding: 14,
    background: "#fff",
    borderBottom: "1px solid rgba(0,0,0,.08)",
  },
  closeBtn: {
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    width: 40,
    height: 40,
    cursor: "pointer",
    background: "#fff",
    fontWeight: 900,
  },
  body: {
    padding: 14,
    display: "grid",
    gap: 12,
    maxHeight: "70vh",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch"
  },
  footer: {
    padding: 14,
    display: "flex",
    justifyContent: "flex-end",
    background: "#fff",
    borderTop: "1px solid rgba(0,0,0,.08)",
  },
  primaryBtn: {
    border: "none",
    borderRadius: 12,
    padding: "10px 14px",
    cursor: "pointer",
    background: "#276678",
    color: "#fff",
    fontWeight: 900,
  },
};
