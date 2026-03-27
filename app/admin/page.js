"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  WORKSHOP_MAP,
  displayWorkshop,
  displaySource,
  AGE_OPTIONS,
  SOURCE_OPTIONS,
  COUNTY_OPTIONS,
  STATUS_OPTIONS,
  ATTENDANCE,
} from "../helpers/strings";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function emptyMainParticipant() {
  return {
    firstName: "",
    lastName: "",
    church: "",
    county: "",
    department: "",
    ageRange: "",
    heardFrom: "",
    workshop: "",
    email: "",
    phone: "",
  };
}

function emptyExtraParticipant() {
  return {
    firstName: "",
    lastName: "",
    workshop: "",
    attendance: "absent",
  };
}

export default function AdminPage() {
  const [q, setQ] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [selectedWorkshop, setSelectedWorkshop] = useState("");
  const [selected, setSelected] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [isWorkShopOpen, setIsWorkShopOpen] = useState(false);
  const [editState, setEditState] = useState({
    open: false,
    loading: false,
    saving: false,
    error: "",
    mode: "create",
    sourceTicket: null,
    orderId: null,
    form: null,
    focusExtraIndex: null,
  });

  const isReadModalOpen = !!selected && !editState.open;
  const isEditModalOpen = editState.open;

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
    setCreateOpen(false);
    setEditState((prev) => ({ ...prev, open: false }));
    await load();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

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
    const c = { PAID: 0, STAFF: 0, PENDING: 0, FAILED: 0 };

    for (const t of tickets) {
      const status = t.orderStatus;

      if (["processing", "completed"].includes(status)) {
        c.PAID++;
      } else if (status === "on-hold") {
        c.STAFF++;
      } else if (status === "pending") {
        c.PENDING++;
      } else if (["failed", "cancelled"].includes(status)) {
        c.FAILED++;
      }
    }

    return c;
  }, [tickets]);

  const workshopSummary = useMemo(() => {
    return Object.keys(WORKSHOP_MAP).map((key) => ({
      key,
      label: WORKSHOP_MAP[key],
      count: tickets.filter(
        (t) =>
          t.attendeeWorkshop === key &&
          (t.orderStatus === "completed" ||
            t.orderStatus === "processing" ||
            t.orderStatus === "on-hold"),
      ).length,
    }));
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

  function openCreateModal() {
    setSelected(null);
    setCreateOpen(true);
  }

  function closeCreateModal() {
    setCreateOpen(false);
  }

  async function openEditModalFromTicket(ticket) {
    setSelected(null);

    if (ticket.editable) {
      setEditState({
        open: true,
        loading: false,
        saving: false,
        error: "",
        mode: "edit",
        sourceTicket: ticket,
        orderId: ticket.orderId,
        form: {
          status: ticket.editable.status || "pending",
          attendance: ticket.editable.attendance || "absent",
          mainParticipant: {
            firstName: ticket.editable.mainParticipant?.firstName || "",
            lastName: ticket.editable.mainParticipant?.lastName || "",
            church: ticket.editable.mainParticipant?.church || "",
            county: ticket.editable.mainParticipant?.county || "",
            department: ticket.editable.mainParticipant?.department || "",
            ageRange: ticket.editable.mainParticipant?.ageRange || "",
            heardFrom: ticket.editable.mainParticipant?.heardFrom || "",
            workshop: ticket.editable.mainParticipant?.workshop || "",
            email: ticket.editable.mainParticipant?.email || "",
            phone: ticket.editable.mainParticipant?.phone || "",
          },
          extraParticipants: Array.isArray(ticket.editable.extraParticipants)
            ? ticket.editable.extraParticipants.map((p) => ({
                firstName: p.firstName || "",
                lastName: p.lastName || "",
                workshop: p.workshop || "",
                attendance: p.attendance || "absent",
              }))
            : [],
        },
        focusExtraIndex: ticket.attendeeHasFullDetails
          ? null
          : ticket.ticketIndex - 2,
      });
      return;
    }

    // Fallback fetch daca editable lipseste din ticket
    setEditState({
      open: true,
      loading: true,
      saving: false,
      error: "",
      mode: "edit",
      sourceTicket: ticket,
      orderId: ticket.orderId,
      form: null,
      focusExtraIndex: ticket.attendeeHasFullDetails
        ? null
        : ticket.ticketIndex - 2,
    });

    try {
      const res = await fetch(`/api/admin/orders/${ticket.orderId}`, {
        cache: "no-store",
      });
      const d = await res.json();

      if (!res.ok || !d.ok) {
        throw new Error(d?.error || "Nu am putut incarca comanda.");
      }

      setEditState((prev) => ({
        ...prev,
        loading: false,
        form: {
          status: d.editable?.status || "pending",
          attendance: d.editable?.attendance || "absent",
          mainParticipant: {
            firstName: d.editable?.mainParticipant?.firstName || "",
            lastName: d.editable?.mainParticipant?.lastName || "",
            church: d.editable?.mainParticipant?.church || "",
            county: d.editable?.mainParticipant?.county || "",
            department: d.editable?.mainParticipant?.department || "",
            ageRange: d.editable?.mainParticipant?.ageRange || "",
            heardFrom: d.editable?.mainParticipant?.heardFrom || "",
            workshop: d.editable?.mainParticipant?.workshop || "",
            email: d.editable?.mainParticipant?.email || "",
            phone: d.editable?.mainParticipant?.phone || "",
          },
          extraParticipants: Array.isArray(d.editable?.extraParticipants)
            ? d.editable.extraParticipants.map((p) => ({
                firstName: p.firstName || "",
                lastName: p.lastName || "",
                workshop: p.workshop || "",
              }))
            : [],
        },
      }));
    } catch (e) {
      setEditState((prev) => ({
        ...prev,
        loading: false,
        error: e?.message || "Nu am putut incarca comanda.",
      }));
    }
  }

  function closeEditModal() {
    setEditState({
      open: false,
      loading: false,
      saving: false,
      error: "",
      mode: "create",
      sourceTicket: null,
      orderId: null,
      form: null,
      focusExtraIndex: null,
    });
  }

  async function handleCreateSubmit(payload) {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const d = await res.json();

      if (!res.ok || !d.ok) {
        throw new Error(
          Array.isArray(d?.details) && d.details.length
            ? d.details.join(" ")
            : d?.error || "Nu am putut crea comanda.",
        );
      }

      closeCreateModal();
      await load();
    } catch (e) {
      throw e;
    }
  }

  async function handleEditSubmit(payload) {
    try {
      setEditState((prev) => ({ ...prev, saving: true, error: "" }));

      const res = await fetch(`/api/admin/orders/${editState.orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const d = await res.json();

      if (!res.ok || !d.ok) {
        throw new Error(
          Array.isArray(d?.details) && d.details.length
            ? d.details.join(" ")
            : d?.error || "Nu am putut salva modificarile.",
        );
      }

      closeEditModal();
      await load();
    } catch (e) {
      setEditState((prev) => ({
        ...prev,
        saving: false,
        error: e?.message || "Nu am putut salva modificarile.",
      }));
    }
  }

  useEffect(() => {
    console.log("filteredTickets", filteredTickets);
  }, [filteredTickets]);

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>URME</h1>
          <div style={{ color: "rgba(0,0,0,.65)", marginTop: 4 }}>
            {!!counts?.PAID && (
              <>
                Bilete Cumparate: <b>{counts?.PAID} / 150</b>
              </>
            )}
            {!!counts?.STAFF && (
              <>
                {" "}
                | Bilete STAFF: <b>{counts.STAFF}</b>
              </>
            )}
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
          <button onClick={openCreateModal} style={styles.primaryHeaderBtn}>
            + Adauga inscriere
          </button>

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
        <div style={{ position: "relative", minWidth: 260, flex: 1 }}>
          <input
            style={{
              ...styles.input,
              minWidth: "100%",
            }}
            placeholder="Cautare dupa nume/prenume participant sau cumparat de..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "rgba(0,0,0)",
                fontSize: 16,
                fontWeight: 600,
                lineHeight: 1,
                padding: 2,
              }}
              aria-label="Sterge cautarea"
            >
              ✕
            </button>
          )}
        </div>

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

      {loading && <div style={styles.loadingBanner}>Se încarcă datele...</div>}
      {err ? <div style={styles.err}>{err}</div> : null}

      <div style={styles.workshopSummaryWrap}>
        <div
          style={styles.workshopSummaryTitleWrapper}
          onClick={() => setIsWorkShopOpen(!isWorkShopOpen)}
        >
          <div style={styles.workshopSummaryTitle}>Workshop-uri</div>
          <span>{isWorkShopOpen ? "▲" : "▼"}</span>
        </div>
        {isWorkShopOpen && (
          <div style={styles.workshopSummaryGrid}>
            {workshopSummary.map((item) => (
              <div key={item.key} style={styles.workshopSummaryCard}>
                <div style={styles.workshopSummaryLabel}>{item.label}</div>
                <div style={styles.workshopSummaryCount}>{item.count}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isMobile ? (
        <div
          style={{
            display: "grid",
            gap: 10,
            opacity: loading ? 0.5 : 1,
            pointerEvents: loading ? "none" : "auto",
            transition: "opacity 0.2s",
          }}
        >
          {filteredTickets.map((t) => (
            <button
              key={`${t.orderId}-${t.ticketIndex}`}
              onClick={() => openEditModalFromTicket(t)}
              style={styles.mobileCardBtn}
            >
              <div style={styles.mobileRow}>
                <span style={badgeStyle(t.orderStatus)}>
                  {getPaymentLabel(t)}
                </span>
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
                Tap pentru editare
              </div>
            </button>
          ))}

          {!loading && filteredTickets.length === 0 ? (
            <div style={styles.card}>No results</div>
          ) : null}

          {loading ? <div style={styles.card}>Loading...</div> : null}
        </div>
      ) : (
        <div
          style={{
            ...styles.tableWrap,
            opacity: loading ? 0.5 : 1,
            pointerEvents: loading ? "none" : "auto",
            transition: "opacity 0.2s",
          }}
        >
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
                  onClick={() => openEditModalFromTicket(t)}
                  title="Click pentru editare"
                >
                  <td style={styles.td}>
                    <span style={badgeStyle(t.orderStatus)}>
                      {getPaymentLabel(t)}
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

      {isReadModalOpen ? (
        <TicketModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onEdit={() => openEditModalFromTicket(selected)}
        />
      ) : null}

      {createOpen ? (
        <OrderFormModal
          mode="create"
          title="Adauga inscriere"
          submitLabel="Creeaza comanda"
          initialData={{
            status: "processing",
            mainParticipant: emptyMainParticipant(),
            extraParticipants: [],
          }}
          onClose={closeCreateModal}
          onSubmit={handleCreateSubmit}
        />
      ) : null}

      {isEditModalOpen ? (
        <EditOrderModal
          state={editState}
          onClose={closeEditModal}
          onSubmit={handleEditSubmit}
        />
      ) : null}
    </div>
  );
}

function EditOrderModal({ state, onClose, onSubmit }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={modalStyles.backdrop} onMouseDown={onClose}>
      <div
        style={{ ...modalStyles.modal, maxWidth: 920 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={modalStyles.head}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              Editeaza inscriere
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
          {state.loading ? (
            <div style={styles.card}>Se incarca comanda...</div>
          ) : state.error && !state.form ? (
            <div style={styles.err}>{state.error}</div>
          ) : state.form ? (
            <OrderForm
              mode="edit"
              initialData={state.form}
              submitLabel={state.saving ? "Se salveaza..." : "Salveaza"}
              error={state.error}
              saving={state.saving}
              focusExtraIndex={state.focusExtraIndex}
              onSubmit={onSubmit}
              onCancel={onClose}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OrderFormModal({
  mode,
  title,
  submitLabel,
  initialData,
  onClose,
  onSubmit,
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={modalStyles.backdrop} onMouseDown={onClose}>
      <div
        style={{ ...modalStyles.modal, maxWidth: 920 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={modalStyles.head}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{title}</div>

          <button
            onClick={onClose}
            style={modalStyles.closeBtn}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={modalStyles.body}>
          <OrderForm
            mode={mode}
            initialData={initialData}
            submitLabel={submitLabel}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

function OrderForm({
  initialData,
  submitLabel,
  onSubmit,
  onCancel,
  error = "",
  saving = false,
  focusExtraIndex = null,
}) {
  const focusedExtraRef = useRef(null);

  const [status, setStatus] = useState(initialData?.status || "processing");
  const [attendance, setAttendance] = useState("absent");
  const [mainParticipant, setMainParticipant] = useState(
    initialData?.mainParticipant || emptyMainParticipant(),
  );
  const [extraParticipants, setExtraParticipants] = useState(
    Array.isArray(initialData?.extraParticipants)
      ? initialData.extraParticipants
      : [],
  );
  const [localError, setLocalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const effectiveSaving = saving || submitting;

  useEffect(() => {
    setStatus(initialData?.status || "processing");
    setAttendance(initialData?.attendance || "absent");
    setMainParticipant(initialData?.mainParticipant || emptyMainParticipant());
    setExtraParticipants(
      Array.isArray(initialData?.extraParticipants)
        ? initialData.extraParticipants
        : [],
    );
  }, [initialData]);

  useEffect(() => {
  if (focusExtraIndex !== null && focusedExtraRef.current) {
    setTimeout(() => {
      focusedExtraRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  }
}, [focusExtraIndex]);

  function updateMain(field, value) {
    setMainParticipant((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateExtra(index, field, value) {
    setExtraParticipants((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function addExtraParticipant() {
    setExtraParticipants((prev) => [...prev, emptyExtraParticipant()]);
  }

  function removeExtraParticipant(index) {
    setExtraParticipants((prev) => prev.filter((_, i) => i !== index));
  }

  function buildPayload() {
    return {
      status,
      attendance,
      mainParticipant: {
        firstName: mainParticipant.firstName || "",
        lastName: mainParticipant.lastName || "",
        church: mainParticipant.church || "",
        county: mainParticipant.county || "",
        department: mainParticipant.department || "",
        ageRange: mainParticipant.ageRange || "",
        heardFrom: mainParticipant.heardFrom || "",
        workshop: mainParticipant.workshop || "",
        email: mainParticipant.email || "",
        phone: mainParticipant.phone || "",
      },
      extraParticipants: extraParticipants.map((p) => ({
        firstName: p.firstName || "",
        lastName: p.lastName || "",
        workshop: p.workshop || "",
        attendance: p?.attendance || "absent",
      })),
    };
  }

  function validate() {
    if (!String(mainParticipant.firstName || "").trim()) {
      return "Numele participantului principal este obligatoriu.";
    }
    if (!String(mainParticipant.lastName || "").trim()) {
      return "Prenumele participantului principal este obligatoriu.";
    }
    if (!String(mainParticipant.workshop || "").trim()) {
      return "Workshop-ul participantului principal este obligatoriu.";
    }

    for (let i = 0; i < extraParticipants.length; i++) {
      const p = extraParticipants[i];
      const nr = i + 1;

      if (!String(p.firstName || "").trim()) {
        return `Numele pentru participantul extra ${nr} este obligatoriu.`;
      }
      if (!String(p.lastName || "").trim()) {
        return `Prenumele pentru participantul extra ${nr} este obligatoriu.`;
      }
      if (!String(p.workshop || "").trim()) {
        return `Workshop-ul pentru participantul extra ${nr} este obligatoriu.`;
      }
    }

    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");

    const validationError = validate();
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(buildPayload());
    } catch (e) {
      setLocalError(e?.message || "Nu am putut salva.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
      {error ? <div style={styles.err}>{error}</div> : null}
      {localError ? <div style={styles.err}>{localError}</div> : null}

      <Section title="Status comanda">
        <div style={formGridStyles.twoCols}>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={styles.selectFull}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prezență">
            <select
              value={attendance}
              onChange={(e) => setAttendance(e.target.value)}
              style={styles.selectFull}
            >
              {ATTENDANCE.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Participant principal / cumparator bilete">
        <div style={formGridStyles.twoCols}>
          <Field label="Nume *">
            <input
              value={mainParticipant.firstName}
              onChange={(e) => updateMain("firstName", e.target.value)}
              style={styles.inputFull}
            />
          </Field>

          <Field label="Prenume *">
            <input
              value={mainParticipant.lastName}
              onChange={(e) => updateMain("lastName", e.target.value)}
              style={styles.inputFull}
            />
          </Field>

          <Field label="Workshop *">
            <select
              value={mainParticipant.workshop}
              onChange={(e) => updateMain("workshop", e.target.value)}
              style={styles.selectFull}
            >
              <option value="">Alege workshop</option>
              {Object.entries(WORKSHOP_MAP).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Biserica">
            <input
              value={mainParticipant.church}
              onChange={(e) => updateMain("church", e.target.value)}
              style={styles.inputFull}
            />
          </Field>

          <Field label="Judet">
            <select
              value={mainParticipant.county}
              onChange={(e) => updateMain("county", e.target.value)}
              style={styles.selectFull}
            >
              {COUNTY_OPTIONS.map((opt) => (
                <option key={opt.value || "empty-county"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Departament">
            <input
              value={mainParticipant.department}
              onChange={(e) => updateMain("department", e.target.value)}
              style={styles.inputFull}
              placeholder="Ex: tineret, inchinare, copii, tehnic"
            />
          </Field>

          <Field label="Varsta">
            <select
              value={mainParticipant.ageRange}
              onChange={(e) => updateMain("ageRange", e.target.value)}
              style={styles.selectFull}
            >
              {AGE_OPTIONS.map((opt) => (
                <option key={opt.value || "empty-age"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sursa">
            <select
              value={mainParticipant.heardFrom}
              onChange={(e) => updateMain("heardFrom", e.target.value)}
              style={styles.selectFull}
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value || "empty-source"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={mainParticipant.email}
              onChange={(e) => updateMain("email", e.target.value)}
              style={styles.inputFull}
              placeholder="Gol = empty@empty.na"
            />
          </Field>

          <Field label="Telefon">
            <input
              type="tel"
              value={mainParticipant.phone}
              onChange={(e) => updateMain("phone", e.target.value)}
              style={styles.inputFull}
              placeholder='Gol = "-"'
            />
          </Field>
        </div>
      </Section>

      <Section
        title={`Participanti extra (${extraParticipants.length}) • Total bilete in comanda: ${
          1 + extraParticipants.length
        }`}
      >
        <div style={{ display: "grid", gap: 12 }}>
          {extraParticipants.length === 0 ? (
            <div style={{ color: "rgba(0,0,0,.65)" }}>
              Nu exista participanti extra.
            </div>
          ) : null}

          {extraParticipants.map((p, index) => {
            const isFocused = focusExtraIndex === index;

            return (
              <div
                key={index}
                style={{
                  border: isFocused
                    ? "2px solid #276678"
                    : "1px solid rgba(0,0,0,.08)",
                  borderRadius: 14,
                  padding: 12,
                  background: isFocused ? "rgba(39,102,120,.08)" : "#fff",
                  boxShadow: isFocused
                    ? "0 0 0 4px rgba(39,102,120,.10)"
                    : "none",
                }}
                ref={isFocused ? focusedExtraRef : null}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>
                    Participant extra #{index + 1}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeExtraParticipant(index)}
                    style={styles.deleteBtn}
                  >
                    Sterge
                  </button>
                </div>

                <div style={formGridStyles.threeCols}>
                  <Field label="Prezență">
                    <select
                      value={p.attendance || "absent"}
                      onChange={(e) =>
                        updateExtra(index, "attendance", e.target.value)
                      }
                      style={styles.selectFull}
                    >
                      {ATTENDANCE.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Nume *">
                    <input
                      value={p.firstName}
                      onChange={(e) =>
                        updateExtra(index, "firstName", e.target.value)
                      }
                      style={styles.inputFull}
                    />
                  </Field>

                  <Field label="Prenume *">
                    <input
                      value={p.lastName}
                      onChange={(e) =>
                        updateExtra(index, "lastName", e.target.value)
                      }
                      style={styles.inputFull}
                    />
                  </Field>

                  <Field label="Workshop *">
                    <select
                      value={p.workshop}
                      onChange={(e) =>
                        updateExtra(index, "workshop", e.target.value)
                      }
                      style={styles.selectFull}
                    >
                      <option value="">Alege workshop</option>
                      {Object.entries(WORKSHOP_MAP).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            );
          })}

          <div>
            <button
              type="button"
              onClick={addExtraParticipant}
              style={styles.secondaryBtn}
            >
              + Adauga participant extra
            </button>
          </div>
        </div>
      </Section>

      <div style={modalStyles.footerInline}>
        <button type="button" onClick={onCancel} style={styles.outBtn}>
          Anuleaza
        </button>

        <button
          type="submit"
          style={modalStyles.primaryBtn}
          disabled={effectiveSaving}
        >
          {effectiveSaving ? "Se proceseaza..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div
        style={{
          color: "rgba(0,0,0,.72)",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}

function TicketModal({ ticket, onClose, onEdit }) {
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
              <span style={badgeStyle(ticket.orderStatus)}>
                {getPaymentLabel(ticket)}
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
          <button onClick={onClose} style={styles.outBtn}>
            Inchide
          </button>
          <button onClick={onEdit} style={modalStyles.primaryBtn}>
            Editeaza
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

function getPaymentLabel(t) {
  if (t?.orderStatus === "completed") return "CASH";
  if (t?.orderStatus === "cancelled") return "CANCELLED";
  if (t?.orderStatus === "on-hold") return "PAID | STAFF";
  return t?.paymentState;
}

function badgeStyle(orderStatus) {
  const base = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,.10)",
    whiteSpace: "nowrap",
  };

  if (orderStatus === "processing" || orderStatus === "on-hold") {
    return { ...base, background: "rgba(34,197,94,.12)" }; // verde
  }

  if (orderStatus === "pending" || orderStatus === "completed") {
    return { ...base, background: "rgba(234,179,8,.14)" }; // galben
  }

  if (orderStatus === "failed" || orderStatus === "cancelled") {
    return { ...base, background: "rgba(239,68,68,.12)" }; // rosu
  }

  // orice alt status (cancelled, refunded etc.)
  return { ...base, background: "rgba(59,130,246,.12)" }; // albastru
}

const formGridStyles = {
  twoCols: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  },
  threeCols: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
};

const styles = {
  loadingBanner: {
    background: "rgba(39,102,120,.08)",
    border: "1px solid rgba(39,102,120,.20)",
    borderRadius: 12,
    padding: "10px 14px",
    marginBottom: 12,
    fontWeight: 700,
    color: "#276678",
  },
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
    gap: 20,
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
    fontSize: 16,
  },
  inputFull: {
    width: "85%",
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    padding: "10px 12px",
    outline: "none",
    background: "#fff",
  },
  select: {
    minWidth: 280,
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    padding: "10px 12px",
    outline: "none",
    background: "#fff",
  },
  selectFull: {
    width: "100%",
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    padding: "10px 12px",
    outline: "none",
    background: "#fff",
  },
  readOnlyBox: {
    minHeight: 42,
    display: "flex",
    alignItems: "center",
    border: "1px solid rgba(0,0,0,.10)",
    borderRadius: 12,
    padding: "10px 12px",
    background: "rgba(0,0,0,.03)",
    fontWeight: 700,
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
  primaryHeaderBtn: {
    border: "none",
    borderRadius: 12,
    padding: "10px 14px",
    cursor: "pointer",
    background: "#276678",
    color: "#fff",
    fontWeight: 900,
  },
  secondaryBtn: {
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    padding: "10px 14px",
    cursor: "pointer",
    background: "#fff",
    fontWeight: 800,
  },
  deleteBtn: {
    border: "1px solid rgba(239,68,68,.25)",
    borderRadius: 10,
    padding: "8px 10px",
    cursor: "pointer",
    background: "rgba(239,68,68,.08)",
    color: "#991b1b",
    fontWeight: 800,
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
  workshopSummaryWrap: {
    marginBottom: 14,
    background: "#fff",
    border: "1px solid rgba(0,0,0,.08)",
    borderRadius: 16,
    padding: 14,
  },
  workshopSummaryTitleWrapper: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  workshopSummaryTitle: {
    fontWeight: 900,
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
    WebkitOverflowScrolling: "touch",
  },
  footer: {
    padding: 14,
    display: "flex",
    justifyContent: "flex-end",
    background: "#fff",
    borderTop: "1px solid rgba(0,0,0,.08)",
    gap: 10,
  },
  footerInline: {
    paddingTop: 4,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
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
