const express = require("express");
const { getDashboardData } = require("../services/dashboardService");

const router = express.Router();

// In-memory cache: key = "YYYY-MM" → { data, fetchedAt }
const cache = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/dashboard?year=2025&month=6
 *
 * Returns processed dashboard data for the given month.
 * If no params supplied, defaults to current month.
 */
router.get("/dashboard", async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;

    // Check cache
    if (cache[key] && Date.now() - cache[key].fetchedAt < CACHE_TTL_MS) {
      return res.json(cache[key].data);
    }

    console.log(`[API] Fetching dashboard data for ${key}...`);
    const data = await getDashboardData(year, month);

    cache[key] = { data, fetchedAt: Date.now() };
    console.log(`[API] Dashboard data for ${key} cached.`);

    res.json(data);
  } catch (err) {
    console.error("[API] Error fetching dashboard data:", err);
    res.status(500).json({ error: "Erro ao buscar dados do dashboard", details: err.message });
  }
});

/**
 * POST /api/dashboard/invalidate
 * Clears the cache so next request fetches fresh data.
 */
router.post("/dashboard/invalidate", (_req, res) => {
  Object.keys(cache).forEach((k) => delete cache[k]);
  res.json({ ok: true, message: "Cache invalidado" });
});

module.exports = router;
