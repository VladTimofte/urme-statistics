import { NextResponse } from "next/server";
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

  // Ticket #1 = buyer
  if (qty >= 1) {
    tickets.push({
      ...base,
      ticketIndex: 1,
      attendeeFirstName: buyerFirst,
      attendeeLastName: buyerLast,
      attendeeWorkshop: buyerWorkshop,
      attendeeHasFullDetails: true,
      attendeeDetails: {
        church: buyerChurch,
        county: buyerCounty,
        department: buyerDept,
        ageRange: buyerAge,
        heardFrom: buyerSource,
      },
    });
  }

  // Tickets #2..N = extra participants (we use meta array)
  let extraIndex = 2;
  for (const p of participantsArr) {
    if (extraIndex > qty) break;
    tickets.push({
      ...base,
      ticketIndex: extraIndex,
      attendeeFirstName: normalizeStr(p?.first_name),
      attendeeLastName: normalizeStr(p?.last_name),
      attendeeWorkshop: normalizeStr(p?.workshop),
      attendeeHasFullDetails: false,
      attendeeDetails: null,
    });
    extraIndex++;
  }

  // If qty says there are more tickets but no participant meta for them, still show placeholders
  while (extraIndex <= qty) {
    tickets.push({
      ...base,
      ticketIndex: extraIndex,
      attendeeFirstName: "",
      attendeeLastName: "",
      attendeeWorkshop: "",
      attendeeHasFullDetails: false,
      attendeeDetails: null,
    });
    extraIndex++;
  }

  return tickets;
}

export async function GET(req) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value || null;
  const session = verifySessionToken(token, {
    secret: process.env.AUTH_SECRET,
  });

  if (!session || session.role !== "admin") {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = normalizeStr(searchParams.get("q")).toLowerCase();

  const orders = await getAllOrdersForProduct({ productId: PRODUCT_ID });

  // Flatten orders into tickets
  let tickets = [];
  for (const o of orders) tickets.push(...buildTicketsFromOrder(o));

  // Search by attendee name
  if (q) {
    tickets = tickets.filter((t) => {
      const full = `${t.attendeeFirstName} ${t.attendeeLastName}`.toLowerCase();
      return full.includes(q);
    });
  }

  return NextResponse.json({ ok: true, tickets });
}
