const PRODUCT_ID = Number(process.env.WOO_PRODUCT_ID || 4350);

const VALID_ORDER_STATUSES = ["processing","completed", "pending", "failed"];

function asString(value) {
  return String(value ?? "").trim();
}

function fallbackText(value) {
  const v = asString(value);
  return v || "-";
}

function fallbackEmail(value) {
  const v = asString(value);
  return v || "empty@empty.na";
}

function fallbackPhone(value) {
  const v = asString(value);
  return v || "-";
}

function normalizeParticipantMain(input = {}) {
  return {
    firstName: asString(input.firstName),
    lastName: asString(input.lastName),
    church: fallbackText(input.church),
    county: fallbackText(input.county),
    department: fallbackText(input.department),
    ageRange: fallbackText(input.ageRange),
    heardFrom: fallbackText(input.heardFrom),
    workshop: asString(input.workshop),
    email: fallbackEmail(input.email),
    phone: fallbackPhone(input.phone),
  };
}

function normalizeParticipantExtra(input = {}) {
  return {
    firstName: asString(input.firstName),
    lastName: asString(input.lastName),
    workshop: asString(input.workshop),
  };
}

export function validateUrmeOrderInput(input = {}) {
  const errors = [];

  const status = asString(input.status);
  if (!VALID_ORDER_STATUSES.includes(status)) {
    errors.push("Status invalid.");
  }

  const main = normalizeParticipantMain(input.mainParticipant);
  if (!main.firstName)
    errors.push("Numele participantului principal este obligatoriu.");
  if (!main.lastName)
    errors.push("Prenumele participantului principal este obligatoriu.");
  if (!main.workshop)
    errors.push("Workshop-ul participantului principal este obligatoriu.");

  const extrasRaw = Array.isArray(input.extraParticipants)
    ? input.extraParticipants
    : [];

  const extras = extrasRaw.map(normalizeParticipantExtra);

  extras.forEach((p, index) => {
    const nr = index + 1;
    if (!p.firstName)
      errors.push(`Numele pentru participantul extra ${nr} este obligatoriu.`);
    if (!p.lastName)
      errors.push(
        `Prenumele pentru participantul extra ${nr} este obligatoriu.`,
      );
    if (!p.workshop)
      errors.push(
        `Workshop-ul pentru participantul extra ${nr} este obligatoriu.`,
      );
  });

  return {
    ok: errors.length === 0,
    errors,
    normalized: {
      status,
      paymentMethod: "cash",
      paymentMethodTitle: "Cash",
      mainParticipant: main,
      extraParticipants: extras,
      totalQty: 1 + extras.length,
    },
  };
}

function buildMetaData({ mainParticipant, extraParticipants }) {
  const main = mainParticipant;

  return [
    { key: "_billing_first_name_custom", value: main.firstName },
    { key: "_billing_last_name_custom", value: main.lastName },
    { key: "_billing_church", value: main.church },
    { key: "_billing_county_custom", value: main.county },
    { key: "_billing_department", value: main.department },
    { key: "_billing_age_range", value: main.ageRange },
    { key: "_billing_heard_from", value: main.heardFrom },
    { key: "_billing_workshop", value: main.workshop },

    { key: "_urme_first_name", value: main.firstName },
    { key: "_urme_last_name", value: main.lastName },
    { key: "_urme_church", value: main.church },
    { key: "_urme_county", value: main.county },
    { key: "_urme_department", value: main.department },
    { key: "_urme_age_range", value: main.ageRange },
    { key: "_urme_heard_from", value: main.heardFrom },
    { key: "_urme_workshop", value: main.workshop },

    {
      key: "_urme_participants",
      value: extraParticipants.map((p) => ({
        first_name: p.firstName,
        last_name: p.lastName,
        workshop: p.workshop,
      })),
    },
  ];
}

export function buildCreateOrderPayload(normalized) {
  const { mainParticipant, extraParticipants, totalQty, status } = normalized;

  return {
    status,
    payment_method: "cash",
    payment_method_title: "Cash",
    set_paid: status === "processing" || status === "completed",

    billing: {
      first_name: mainParticipant.firstName,
      last_name: mainParticipant.lastName,
      email: mainParticipant.email,
      phone: mainParticipant.phone,
    },

    line_items: [
      {
        product_id: PRODUCT_ID,
        quantity: totalQty,
      },
    ],

    meta_data: buildMetaData({
      mainParticipant,
      extraParticipants,
    }),
  };
}

export function extractEditableOrder(order) {
  const meta = Array.isArray(order?.meta_data) ? order.meta_data : [];

  function getMeta(key) {
    const found = meta.find((m) => m.key === key);
    return found ? found.value : "";
  }

  const participants = getMeta("_urme_participants");
  const participantsArr = Array.isArray(participants) ? participants : [];

  const ticketLine =
    (order.line_items || []).find(
      (li) => Number(li.product_id) === PRODUCT_ID,
    ) || null;

  return {
    orderId: order.id,
    orderNumber: order.number,
    status: order.status,
    paymentMethod: order.payment_method || "cash",
    paymentMethodTitle: order.payment_method_title || "Cash",
    quantity: Number(ticketLine?.quantity || 1),
    lineItemId: ticketLine?.id || null,
    productId: PRODUCT_ID,

    mainParticipant: {
      firstName: asString(getMeta("_urme_first_name")),
      lastName: asString(getMeta("_urme_last_name")),
      church: asString(getMeta("_urme_church")),
      county: asString(getMeta("_urme_county")),
      department: asString(getMeta("_urme_department")),
      ageRange: asString(getMeta("_urme_age_range")),
      heardFrom: asString(getMeta("_urme_heard_from")),
      workshop: asString(getMeta("_urme_workshop")),
      email: asString(order?.billing?.email),
      phone: asString(order?.billing?.phone),
    },

    extraParticipants: participantsArr.map((p) => ({
      firstName: asString(p?.first_name),
      lastName: asString(p?.last_name),
      workshop: asString(p?.workshop),
    })),
  };
}

export function buildUpdateOrderPayload(existingOrder, normalized) {
  const editable = extractEditableOrder(existingOrder);
  const { mainParticipant, extraParticipants, totalQty, status } = normalized;

  const lineItems = editable.lineItemId
    ? [
        {
          id: editable.lineItemId,
          quantity: totalQty,
        },
      ]
    : [
        {
          product_id: PRODUCT_ID,
          quantity: totalQty,
        },
      ];

  return {
    status,
    payment_method: "cash",
    payment_method_title: "Cash",
    set_paid: status === "processing" || status === "completed",

    billing: {
      first_name: mainParticipant.firstName,
      last_name: mainParticipant.lastName,
      email: mainParticipant.email,
      phone: mainParticipant.phone,
    },

    line_items: lineItems,

    meta_data: buildMetaData({
      mainParticipant,
      extraParticipants,
    }),
  };
}
