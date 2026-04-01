import ExcelJS from "exceljs";
import { getAllOrdersForProduct } from "../../../../lib/woo";
import { cookies } from "next/headers";
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from "../../../../lib/session.js";

const PRODUCT_ID = Number(process.env.WOO_PRODUCT_ID || 4350);

const WORKSHOP_MAP = {
  ucenicie_doruCirdei: "Ucenicie - Doru Cirdei",
  inchinare_adiKovaci: "Inchinare - Adi Kovaci",
  voluntarvsslujitor_otiTipei: "Voluntar vs Slujitor - Oti Tipei",
  conducereBisericeasca_mihaiDumitrascu:
    "Conducere bisericeasca - Mihai Dumitrascu",
};

const HEARD_FROM_MAP = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp / Grup",
  grup_de_casa: "Grup de casa",
  church: "Din biserica",
  poster: "Afis / anunt",
  friend: "De la un prieten",
  other: "Altfel",
};

// Light red fill for failed/cancelled rows
const RED_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFC7CE" },
};

function statusLabel(status) {
  switch (status) {
    case "completed":
      return "CASH (Inregistrat! Plata la welcome)";
    case "processing":
      return "PAID (Inregistrat! Bilet Platit)";
    case "on-hold":
      return "PAID (Inregistrat! Bilet Redus | STAFF)";
    case "pending":
      return "PENDING (Participantul NU este inregistrat)";
    case "cancelled":
      return "CANCELLED (Plata neefectuata)";
    case "failed":
      return "FAILED (Eroare la plata)";
    default:
      return status || "";
  }
}

function getMeta(order, key) {
  const meta = order.meta_data || [];
  const found = meta.find((m) => m.key === key);
  return found ? found.value : "";
}

function removeDiacritics(s) {
  return String(s || "")
    .replace(/[ăÃ¤]/g, (c) => (c === "ă" ? "a" : "A"))
    .replace(/[âÂ]/g, (c) => (c === "â" ? "a" : "A"))
    .replace(/[îÎ]/g, (c) => (c === "î" ? "i" : "I"))
    .replace(/[șşȘŞ]/g, (c) => (c === "ș" || c === "ş" ? "s" : "S"))
    .replace(/[țţȚŢ]/g, (c) => (c === "ț" || c === "ţ" ? "t" : "T"));
}

function clean(v) {
  const s = removeDiacritics(String(v ?? "")).trim();
  return s === "" ? "-" : s;
}

function normalizeStr(s) {
  return String(s || "").trim();
}

function attendanceLabel(val) {
  return val === "present" ? "Prezent" : "Absent";
}

function workshopLabel(val) {
  return WORKSHOP_MAP[val] || val || "";
}

function heardFromLabel(val) {
  return HEARD_FROM_MAP[val] || val || "";
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function normalizeEmail(email) {
  if (!email || email === "empty@empty.na") return "";
  return email;
}

function buildTicketsFromOrder(order) {
  const buyerFirst = normalizeStr(getMeta(order, "_urme_first_name"));
  const buyerLast = normalizeStr(getMeta(order, "_urme_last_name"));
  const buyerWorkshop = workshopLabel(
    normalizeStr(getMeta(order, "_urme_workshop")),
  );
  const buyerChurch = normalizeStr(getMeta(order, "_urme_church"));
  const buyerCounty = normalizeStr(getMeta(order, "_urme_county"));
  const buyerDept = normalizeStr(getMeta(order, "_urme_department"));
  const buyerAge = normalizeStr(getMeta(order, "_urme_age_range"));
  const buyerSource = heardFromLabel(
    normalizeStr(getMeta(order, "_urme_heard_from")),
  );
  const buyerAttendance =
    normalizeStr(getMeta(order, "_urme_attendance")) || "absent";

  const participants = getMeta(order, "_urme_participants");
  const participantsArr = Array.isArray(participants) ? participants : [];

  const line = (order.line_items || []).find(
    (li) => Number(li.product_id) === PRODUCT_ID,
  );
  const qty = Number(line?.quantity || 0);

  const purchasedBy = `${buyerFirst} ${buyerLast}`.trim();
  const paidState = statusLabel(order.status);
  const dateCreated = formatDate(order.date_created);
  const isFailed = order.status === "failed" || order.status === "cancelled";

  const orderBase = {
    orderId: order.id,
    paymentState: paidState,
    dateCreated,
    isFailed,
  };

  const tickets = [];

  if (qty >= 1) {
    tickets.push({
      ...orderBase,
      achizitionatDe: "",
      email: normalizeEmail(order.billing?.email),
      phone: order.billing?.phone || "",
      attendeeFirstName: buyerFirst,
      attendeeLastName: buyerLast,
      attendeeWorkshop: buyerWorkshop,
      attendance: attendanceLabel(buyerAttendance),
      church: buyerChurch,
      county: buyerCounty,
      department: buyerDept,
      ageRange: buyerAge,
      heardFrom: buyerSource,
    });
  }

  let extraIndex = 2;
  for (const p of participantsArr) {
    if (extraIndex > qty) break;
    tickets.push({
      ...orderBase,
      achizitionatDe: purchasedBy,
      email: "",
      phone: "",
      attendeeFirstName: normalizeStr(p?.first_name),
      attendeeLastName: normalizeStr(p?.last_name),
      attendeeWorkshop: workshopLabel(normalizeStr(p?.workshop)),
      attendance: attendanceLabel(normalizeStr(p?.attendance) || "absent"),
      church: "",
      county: "",
      department: "",
      ageRange: "",
      heardFrom: "",
    });
    extraIndex++;
  }

  while (extraIndex <= qty) {
    tickets.push({
      ...orderBase,
      achizitionatDe: purchasedBy,
      email: "",
      phone: "",
      attendeeFirstName: "",
      attendeeLastName: "",
      attendeeWorkshop: "",
      attendance: attendanceLabel("absent"),
      church: "",
      county: "",
      department: "",
      ageRange: "",
      heardFrom: "",
    });
    extraIndex++;
  }

  return tickets;
}

const COLUMNS = [
  { label: "ID Comanda", key: "orderId" },
  { label: "Achizitionat de", key: "achizitionatDe" },
  { label: "Nume", key: "attendeeLastName" },
  { label: "Prenume", key: "attendeeFirstName" },
  { label: "Status Plata", key: "paymentState" },
  { label: "Email", key: "email" },
  { label: "Telefon", key: "phone", raw: true },
  { label: "Atelier", key: "attendeeWorkshop" },
  { label: "Prezenta", key: "attendance" },
  { label: "Biserica", key: "church" },
  { label: "Judet", key: "county" },
  { label: "Departament", key: "department" },
  { label: "Grupa de Varsta", key: "ageRange" },
  { label: "De unde a aflat", key: "heardFrom" },
  { label: "Data Achizitionarii", key: "dateCreated" },
];

export async function GET() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value || null;
  const session = verifySessionToken(token, {
    secret: process.env.AUTH_SECRET,
  });

  if (!session || session.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const orders = await getAllOrdersForProduct({ productId: PRODUCT_ID });
  const tickets = orders.flatMap(buildTicketsFromOrder);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Bilete");

  // Header row
  worksheet.addRow(COLUMNS.map((c) => c.label));
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.commit();

  // Data rows
  for (const t of tickets) {
    const values = COLUMNS.map((c) => {
      const raw = t[c.key];
      // Phone: store as text to preserve leading + sign
      if (c.raw) {
        const s = removeDiacritics(String(raw ?? "")).trim();
        return s === "" ? "-" : s;
      }
      return clean(raw);
    });

    const row = worksheet.addRow(values);

    // Force phone cell to text so Excel doesn't reformat it
    const phoneColIndex = COLUMNS.findIndex((c) => c.raw) + 1;
    if (phoneColIndex > 0) {
      row.getCell(phoneColIndex).numFmt = "@";
    }

    // Light red background for failed/cancelled orders
    if (t.isFailed) {
      row.eachCell((cell) => {
        cell.fill = RED_FILL;
      });
    }

    row.commit();
  }

  // Auto-fit column widths
  COLUMNS.forEach((_, i) => {
    const col = worksheet.getColumn(i + 1);
    let maxLen = COLUMNS[i].label.length;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 2, 50);
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="urme-tickets.xlsx"`,
    },
  });
}
