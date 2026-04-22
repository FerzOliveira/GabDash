const fetch = require("node-fetch");

const BASE_URL = process.env.NEXTFIT_API_URL || "https://integracao.nextfit.com.br/api/v1";
const API_KEY = process.env.NEXTFIT_API_KEY;
const PAGE_SIZE = 30;
const REQUEST_DELAY_MS = 400; // delay between paginated requests to avoid TooManyRequests

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch all pages from a paginated Next Fit API endpoint.
 * @param {string} endpoint - e.g. "ContratoCliente"
 * @param {Object} params - query string params (excluding Skip/Take)
 * @returns {Promise<Array>} all items concatenated
 */
async function fetchAllPages(endpoint, params = {}) {
  const allItems = [];
  let skip = 0;
  let hasMore = true;
  let retries = 0;

  while (hasMore) {
    const qp = new URLSearchParams({
      ...params,
      Skip: String(skip),
      Take: String(PAGE_SIZE),
    });

    const url = `${BASE_URL}/${endpoint}?${qp.toString()}`;

    const res = await fetch(url, {
      headers: {
        "X-Api-Key": API_KEY,
        Accept: "application/json",
      },
    });

    if (res.status === 429) {
      // Too Many Requests — wait longer and retry
      console.warn(`[NextFit] 429 TooManyRequests on ${endpoint} (skip=${skip}), waiting 3s...`);
      await sleep(3000);
      continue; // retry same page
    }

    if (res.status === 524 || res.status === 502 || res.status === 503 || res.status === 504) {
      retries = (retries || 0) + 1;
      if (retries <= 2) {
        console.warn(`[NextFit] ${res.status} on ${endpoint} (skip=${skip}), retry ${retries}/2 in 5s...`);
        await sleep(5000);
        continue; // retry same page
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`[NextFit] ${endpoint} returned ${res.status}: ${text}`);
    }

    retries = 0; // reset on success

    const body = await res.json();
    const items = body.items || [];
    allItems.push(...items);

    hasMore = body.temProximaPagina === true;
    skip += PAGE_SIZE;

    if (hasMore) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log(`[NextFit] ${endpoint}: fetched ${allItems.length} items (${Math.ceil(allItems.length / PAGE_SIZE)} pages)`);
  return allItems;
}

/**
 * Build date range params for a given month.
 * @param {number} year
 * @param {number} month - 1-indexed (1 = January)
 * @param {string} startKey - param name for start date
 * @param {string} endKey - param name for end date
 */
function monthRange(year, month, startKey, endKey) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0)); // last day of month
  return {
    [startKey]: start.toISOString(),
    [endKey]: end.toISOString(),
  };
}

module.exports = { fetchAllPages, monthRange, sleep };
