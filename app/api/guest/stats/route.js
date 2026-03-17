import { NextResponse } from "next/server";
import { getAllOrdersForProduct } from "../../../../lib/woo";
import { cookies } from "next/headers";
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from "../../../../lib/session.js";

const WORKSHOPS = {
  ucenicie_doruCirdei: "Ucenicie - Doru Cîrdei",
  inchinare_adiKovaci: "Închinare - Adi Kovaci",
  voluntarvsslujitor_otiTipei: "Voluntar vs Slujitor - Oti Țipei",
  conducereBisericeasca_mihaiDumitrascu:
    "Conducere bisericească - Mihai Dumitrașcu",
};

function isPaidStatus(status) {
  return status === "processing" || status === "completed";
}

function getMetaValue(order, key) {
  const meta = Array.isArray(order?.meta_data) ? order.meta_data : [];
  const found = meta.find((item) => item?.key === key);
  return found?.value;
}

function addWorkshopCount(workshopKey, workshopCounts) {
  const key = String(workshopKey || "").trim();
  if (!key) return;

  if (Object.prototype.hasOwnProperty.call(workshopCounts, key)) {
    workshopCounts[key] += 1;
  }
}

export async function GET() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value || null;
  const session = verifySessionToken(token, {
    secret: process.env.AUTH_SECRET,
  });

  if (!session || (session.role !== "admin" && session.role !== "guest")) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const productId = Number(process.env.WOO_PRODUCT_ID || 4350);
  const totalStock = Number(process.env.WOO_TOTAL_STOCK || 150);

  const orders = await getAllOrdersForProduct({ productId });

  let paidOrders = 0;
  let paidTickets = 0;

  const workshopCounts = Object.keys(WORKSHOPS).reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  let countedWorkshopTickets = 0;

  for (const order of orders) {
    if (!isPaidStatus(order?.status)) continue;

    const line = (order.line_items || []).find(
      (li) => Number(li?.product_id) === productId,
    );

    const qty = Number(line?.quantity || 0);
    if (!qty) continue;

    paidOrders += 1;
    paidTickets += qty;

    // 1) workshop-ul cumparatorului
    const buyerWorkshop =
      getMetaValue(order, "_urme_workshop") ||
      getMetaValue(order, "_billing_workshop");

    if (buyerWorkshop) {
      addWorkshopCount(buyerWorkshop, workshopCounts);
      countedWorkshopTickets += 1;
    }

    // 2) workshop-urile participantilor extra
    const participants = getMetaValue(order, "_urme_participants");

    if (Array.isArray(participants)) {
      for (const participant of participants) {
        if (participant?.workshop) {
          addWorkshopCount(participant.workshop, workshopCounts);
          countedWorkshopTickets += 1;
        }
      }
    }
  }

  const remaining = Math.max(0, totalStock - paidTickets);

  const workshops = Object.entries(WORKSHOPS).map(([key, label]) => ({
    key,
    label,
    count: workshopCounts[key] || 0,
  }));

  return NextResponse.json({
    ok: true,
    productId,
    totalStock,
    paidOrders,
    paidTickets,
    remaining,
    workshops,
    workshopCounts,
    countedWorkshopTickets,
    unassignedWorkshopTickets: Math.max(
      0,
      paidTickets - countedWorkshopTickets,
    ),
  });
}
