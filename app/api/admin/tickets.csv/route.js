import { getAllOrdersForProduct } from "../../../../lib/woo";

import { cookies } from "next/headers";
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from "../../../../lib/session.js";

const PRODUCT_ID = Number(process.env.WOO_PRODUCT_ID || 4350);

function statusLabel(status) {
  if (status === "processing" || status === "completed") return "PAID";
  if (status === "pending" || status === "on-hold") return "PENDING";
  return "FAILED";
}

function getMeta(order, key) {
  const meta = order.meta_data || [];
  const found = meta.find((m) => m.key === key);
  return found ? found.value : "";
}

function escCsv(v) {
  const s = String(v ?? "");
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function normalizeStr(s) {
  return String(s || "").trim();
}

function buildTicketsFromOrder(order) {
  const buyerFirst = normalizeStr(getMeta(order, "_urme_first_name"));
  const buyerLast = normalizeStr(getMeta(order, "_urme_last_name"));
  const buyerWorkshop = normalizeStr(getMeta(order, "_urme_workshop"));
  const buyerChurch = normalizeStr(getMeta(order, "_urme_church"));
  const buyerCounty = normalizeStr(getMeta(order, "_urme_county"));
  const buyerDept = normalizeStr(getMeta(order, "_urme_department"));
  const buyerAge = normalizeStr(getMeta(order, "_urme_age_range"));
  const buyerSource = normalizeStr(getMeta(order, "_urme_heard_from"));

  const participants = getMeta(order, "_urme_participants");
  const participantsArr = Array.isArray(participants) ? participants : [];

  const line = (order.line_items || []).find(
    (li) => Number(li.product_id) === PRODUCT_ID,
  );
  const qty = Number(line?.quantity || 0);

  const purchasedBy = `${buyerFirst} ${buyerLast}`.trim();
  const paidState = statusLabel(order.status);

  const base = {
    orderId: order.id,
    orderNumber: order.number,
    orderStatus: order.status,
    paymentState: paidState,
    dateCreated: order.date_created,
    email: order.billing?.email || "",
    phone: order.billing?.phone || "",
    purchasedBy,
  };

  const tickets = [];

  if (qty >= 1) {
    tickets.push({
      ...base,
      ticketIndex: 1,
      attendeeFirstName: buyerFirst,
      attendeeLastName: buyerLast,
      attendeeWorkshop: buyerWorkshop,
      hasFullDetails: "YES",
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
      ...base,
      ticketIndex: extraIndex,
      attendeeFirstName: normalizeStr(p?.first_name),
      attendeeLastName: normalizeStr(p?.last_name),
      attendeeWorkshop: normalizeStr(p?.workshop),
      hasFullDetails: "NO",
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
      ...base,
      ticketIndex: extraIndex,
      attendeeFirstName: "",
      attendeeLastName: "",
      attendeeWorkshop: "",
      hasFullDetails: "NO",
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

  const headers = [
    "orderId",
    "orderNumber",
    "paymentState",
    "orderStatus",
    "dateCreated",
    "email",
    "phone",
    "ticketIndex",
    "attendeeFirstName",
    "attendeeLastName",
    "attendeeWorkshop",
    "purchasedBy",
    "hasFullDetails",
    "church",
    "county",
    "department",
    "ageRange",
    "heardFrom",
  ];

  const rows = [headers.join(",")];

  for (const t of tickets) {
    rows.push(headers.map((h) => escCsv(t[h])).join(","));
  }

  const csv = rows.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="urme-tickets.csv"`,
    },
  });
}
