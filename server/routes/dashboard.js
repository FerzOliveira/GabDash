const express = require("express");
const { getDashboardDataFromDb, hasImportedData } = require("../services/dashboardDbService");
const { getAvailableMonths } = require("../services/importService");

const router = express.Router();

// In-memory cache: key = month (or "latest") → { data, fetchedAt }
const cache = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/dashboard/months
 * Returns the list of months that have imported data.
 */
router.get("/dashboard/months", async (_req, res) => {
  try {
    const months = await getAvailableMonths();
    res.json(months);
  } catch (err) {
    console.error("[API] Erro ao buscar meses:", err);
    res.status(500).json({ error: "Erro ao buscar meses disponíveis", details: err.message });
  }
});

/**
 * GET /api/dashboard?mes=2026-03
 *
 * Returns processed dashboard data from the local database.
 * Optional query param `mes` filters by month (YYYY-MM). Defaults to latest.
 */
router.get("/dashboard", async (req, res) => {
  try {
    const mes = req.query.mes || null;

    // Validate mes format if provided
    if (mes && !/^\d{4}-\d{2}$/.test(mes)) {
      return res.status(400).json({ error: "Formato de mês inválido. Use YYYY-MM." });
    }

    const hasData = await hasImportedData(mes);
    if (!hasData) {
      return res.status(404).json({
        error: "Nenhum dado importado",
        needsImport: true,
        message: mes
          ? `Não há dados importados para ${mes}. Importe os arquivos deste mês.`
          : "Importe os arquivos necessários na tela de importação.",
      });
    }

    const key = mes || "latest";
    if (cache[key] && Date.now() - cache[key].fetchedAt < CACHE_TTL_MS) {
      return res.json(cache[key].data);
    }

    console.log(`[API] Buscando dados do dashboard no banco (mês: ${mes || "mais recente"})...`);
    const data = await getDashboardDataFromDb(mes);

    cache[key] = { data, fetchedAt: Date.now() };
    console.log("[API] Dados do dashboard carregados do banco.");

    res.json(data);
  } catch (err) {
    console.error("[API] Erro ao buscar dados do dashboard:", err);
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
