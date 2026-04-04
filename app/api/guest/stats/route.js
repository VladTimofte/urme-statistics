import { NextResponse } from "next/server";
import { getAllOrdersForProduct } from "../../../../lib/woo";
import { cookies } from "next/headers";
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from "../../../../lib/session.js";
import { WORKSHOP_MAP } from "@/app/helpers/strings";

function isPaidStatus(status) {
  return status === "processing" || status === "completed";
}

function isStaffStatus(status) {
  return status === "on-hold";
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

  let paidParticipants = 0;
  let staffParticipants = 0;

  const workshopCounts = Object.keys(WORKSHOP_MAP).reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
  const workshopPrezent = Object.keys(WORKSHOP_MAP).reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  function addWorkshopPrezent(workshopKey, attendance, workshopPrezent) {
    const key = String(workshopKey || "").trim();
    if (!key) return;
    if (
      attendance &&
      attendance !== "absent" &&
      Object.prototype.hasOwnProperty.call(workshopPrezent, key)
    ) {
      workshopPrezent[key] += 1;
    }
  }

  for (const order of orders) {
    const status = order?.status;

    const line = (order.line_items || []).find(
      (li) => Number(li?.product_id) === productId,
    );

    const qty = Number(line?.quantity || 0);
    if (!qty) continue;

    const paid = isPaidStatus(status);
    const staff = isStaffStatus(status);

    if (paid) {
      paidParticipants += qty;
    }

    if (staff) {
      staffParticipants += qty;
    }

    if (paid || staff) {
      const buyerWorkshop =
        getMetaValue(order, "_urme_workshop") ||
        getMetaValue(order, "_billing_workshop");

      const participants = getMetaValue(order, "_urme_participants");

      if (buyerWorkshop) {
        addWorkshopCount(buyerWorkshop, workshopCounts);
      }

      if (Array.isArray(participants)) {
        for (const participant of participants) {
          if (participant?.workshop) {
            addWorkshopCount(participant.workshop, workshopCounts);
          }
        }
      }

      const buyerAttendance = getMetaValue(order, "_urme_attendance");
      addWorkshopPrezent(buyerWorkshop, buyerAttendance, workshopPrezent);

      if (Array.isArray(participants)) {
        for (const participant of participants) {
          addWorkshopPrezent(
            participant.workshop,
            participant.attendance,
            workshopPrezent,
          );
        }
      }
    }
  }

  const remaining = Math.max(0, totalStock - paidParticipants);

  const workshops = Object.entries(WORKSHOP_MAP).map(([key, label]) => ({
    key,
    label,
    count: workshopCounts[key] || 0,
    prezent: workshopPrezent[key] || 0,
    absent: (workshopCounts[key] || 0) - (workshopPrezent[key] || 0),
  }));

  return NextResponse.json({
    ok: true,
    productId,
    totalStock,
    paidParticipants,
    staffParticipants,
    remaining,
    workshops,
  });
}
