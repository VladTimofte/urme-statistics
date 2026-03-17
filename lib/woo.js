const BASE_URL = process.env.WOO_BASE_URL;
const CK = process.env.WOO_CONSUMER_KEY;
const CS = process.env.WOO_CONSUMER_SECRET;

function assertEnv() {
  if (!BASE_URL || !CK || !CS) {
    throw new Error(
      "Missing WOO_BASE_URL / WOO_CONSUMER_KEY / WOO_CONSUMER_SECRET",
    );
  }
}

function authHeader() {
  const token = Buffer.from(`${CK}:${CS}`).toString("base64");
  return `Basic ${token}`;
}

async function wooFetch(path, { method = "GET", searchParams, body } = {}) {
  assertEnv();

  const url = new URL(
    `${BASE_URL.replace(/\/$/, "")}/wp-json/wc/v3/${path.replace(/^\//, "")}`,
  );

  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Woo API error ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}

export async function getProduct(productId) {
  return wooFetch(`/products/${productId}`);
}

export async function getOrder(orderId) {
  return wooFetch(`/orders/${orderId}`);
}

export async function createOrder(payload) {
  return wooFetch("/orders", {
    method: "POST",
    body: payload,
  });
}

export async function updateOrder(orderId, payload) {
  return wooFetch(`/orders/${orderId}`, {
    method: "PUT",
    body: payload,
  });
}

export async function getAllOrdersForProduct({ productId } = {}) {
  const perPage = 100;
  const maxPages = 50;

  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const data = await wooFetch("/orders", {
      searchParams: {
        product: productId,
        per_page: perPage,
        page,
        orderby: "date",
        order: "desc",
      },
    });

    if (!Array.isArray(data)) break;
    all.push(...data);
    if (data.length < perPage) break;
  }

  return all;
}
