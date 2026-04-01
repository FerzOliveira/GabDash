const express = require("express");
const multer = require("multer");
const { importXlsx, getImportStatus, detectTable } = require("../services/importService");

const router = express.Router();

// Multer config: store in memory, max 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos .xlsx ou .xls são aceitos"));
    }
  },
});

/**
 * GET /api/import/status
 * Returns import status for all expected tables.
 */
router.get("/import/status", async (_req, res) => {
  try {
    const status = await getImportStatus();
    res.json(status);
  } catch (err) {
    console.error("[Import] Erro ao buscar status:", err);
    res.status(500).json({ error: "Erro ao buscar status de importação", details: err.message });
  }
});

/**
 * POST /api/import/detect
 * Detect which table a file belongs to (from filename only).
 */
router.post("/import/detect", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }
  const detected = detectTable(req.file.originalname);
  if (!detected) {
    return res.status(400).json({
      error: "Não foi possível identificar a tabela para este arquivo",
      filename: req.file.originalname,
    });
  }
  res.json({
    filename: req.file.originalname,
    tabela: detected.tabela,
    label: detected.label,
  });
});

/**
 * POST /api/import/upload
 * Upload and import an XLSX file into the database.
 */
router.post("/import/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }

  try {
    const result = await importXlsx(req.file.buffer, req.file.originalname);
    res.json({
      success: true,
      message: `${result.registrosImportados} registros importados para '${result.label}'`,
      ...result,
    });
  } catch (err) {
    console.error("[Import] Erro na importação:", err);
    res.status(400).json({
      error: err.message || "Erro ao importar arquivo",
    });
  }
});

module.exports = router;
