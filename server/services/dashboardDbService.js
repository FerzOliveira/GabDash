const { getPool } = require("../config/database");

/**
 * Valid contract prefixes — same logic as the original API-based service.
 */
const VALID_PREFIXES = ["REC - ", "PAC - "];

function isValid(descricao) {
  if (!descricao) return false;
  return VALID_PREFIXES.some((p) => descricao.startsWith(p));
}

function getModalidade(desc) {
  if (!desc) return "Outros";
  const upper = desc.toUpperCase();
  if (upper.includes("CROSS")) return "Cross";
  if (upper.includes("SPINNING")) return "Spinning";
  return "Outros";
}

function getPrefixo(desc) {
  if (!desc) return "OUTROS";
  if (desc.startsWith("REC ")) return "REC";
  if (desc.startsWith("PAC ")) return "PAC";
  return "OUTROS";
}

function getDuracao(desc) {
  if (!desc) return "Outros";
  const upper = desc.toUpperCase();
  if (upper.includes("ANUAL")) return "Anual";
  if (upper.includes("SEMESTRAL")) return "Semestral";
  if (upper.includes("TRIMESTRAL")) return "Trimestral";
  if (upper.includes("MENSAL")) return "Mensal";
  if (upper.includes("AVULS")) return "Avulso";
  return "Outros";
}

/**
 * Get dashboard data from the local MySQL database.
 * @param {string|null} mes - Optional month filter "YYYY-MM". Defaults to latest.
 */
async function getDashboardDataFromDb(mes = null) {
  const pool = getPool();

  // ─── Resolve the importacao IDs to use ───
  let contratosImportFilter;
  let evasaoImportFilter;

  if (mes) {
    // Filter by specific month
    contratosImportFilter =
      `importacao_id IN (SELECT id FROM importacoes WHERE tabela_destino = 'analise_contratos' AND DATE_FORMAT(data_referencia, '%Y-%m') = ${pool.escape(mes)})`;
    evasaoImportFilter =
      `importacao_id IN (SELECT id FROM importacoes WHERE tabela_destino = 'evasao_clientes' AND DATE_FORMAT(data_referencia, '%Y-%m') = ${pool.escape(mes)})`;
  } else {
    // Use the most recent month by data_referencia (not by upload order)
    contratosImportFilter =
      `importacao_id IN (SELECT id FROM importacoes WHERE tabela_destino = 'analise_contratos' AND DATE_FORMAT(data_referencia, '%Y-%m') = (SELECT MAX(DATE_FORMAT(data_referencia, '%Y-%m')) FROM importacoes WHERE tabela_destino = 'analise_contratos' AND data_referencia IS NOT NULL))`;
    evasaoImportFilter =
      `importacao_id IN (SELECT id FROM importacoes WHERE tabela_destino = 'evasao_clientes' AND DATE_FORMAT(data_referencia, '%Y-%m') = (SELECT MAX(DATE_FORMAT(data_referencia, '%Y-%m')) FROM importacoes WHERE tabela_destino = 'evasao_clientes' AND data_referencia IS NOT NULL))`;
  }

  // ─── Fetch contracts from analise_contratos ───
  const [contratosRaw] = await pool.execute(
    `SELECT descricao, quantidade
     FROM analise_contratos
     WHERE ${contratosImportFilter}
     ORDER BY quantidade DESC`
  );

  // Filter: only valid prefixes (REC, PAC)
  const contratosData = contratosRaw
    .filter((c) => isValid(c.descricao))
    .map((c) => ({ descricao: c.descricao, quantidade: c.quantidade }));

  const totalAlunos = contratosData.reduce((s, c) => s + c.quantidade, 0);

  // ─── Fetch evasion data from evasao_clientes ───
  const [evasaoRaw] = await pool.execute(
    `SELECT cliente, contrato, motivo, data_inicio, data_encerramento
     FROM evasao_clientes
     WHERE ${evasaoImportFilter}`
  );

  // Filter: only valid contract prefixes
  const validEvasao = evasaoRaw.filter((e) => isValid(e.contrato));

  // Group evasions by contract
  const cancelByContrato = {};
  validEvasao.forEach((e) => {
    const desc = e.contrato;
    cancelByContrato[desc] = (cancelByContrato[desc] || 0) + 1;
  });
  const evasaoPorContrato = Object.entries(cancelByContrato)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalEvasoes = validEvasao.length;

  // Cancellation rate
  const taxaCancelamento =
    totalAlunos + totalEvasoes > 0
      ? ((totalEvasoes / (totalAlunos + totalEvasoes)) * 100).toFixed(1)
      : "0.0";

  // ─── Group by modality ───
  const modalidadeGroups = {};
  contratosData.forEach(({ descricao, quantidade }) => {
    const m = getModalidade(descricao);
    modalidadeGroups[m] = (modalidadeGroups[m] || 0) + quantidade;
  });
  const porModalidade = Object.entries(modalidadeGroups).map(([name, value]) => ({ name, value }));

  // ─── Group by duration ───
  const duracaoGroups = {};
  contratosData.forEach(({ descricao, quantidade }) => {
    const d = getDuracao(descricao);
    duracaoGroups[d] = (duracaoGroups[d] || 0) + quantidade;
  });
  const porDuracao = Object.entries(duracaoGroups).map(([name, value]) => ({ name, value }));

  // ─── Group evasions by motivo ───
  const motivoGroupAll = {};
  validEvasao.forEach((e) => {
    const m = e.motivo || "Automático";
    motivoGroupAll[m] = (motivoGroupAll[m] || 0) + 1;
  });
  const evasaoPorMotivo = Object.entries(motivoGroupAll)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ─── Evasão by prefixo for motivo breakdown ───
  const evasaoByPrefixo = { TODOS: [...evasaoPorMotivo] };
  const prefixoMotivoMap = {};
  validEvasao.forEach((e) => {
    const p = getPrefixo(e.contrato);
    const m = e.motivo || "Automático";
    if (!prefixoMotivoMap[p]) prefixoMotivoMap[p] = {};
    prefixoMotivoMap[p][m] = (prefixoMotivoMap[p][m] || 0) + 1;
  });
  Object.entries(prefixoMotivoMap).forEach(([prefix, motivos]) => {
    evasaoByPrefixo[prefix] = Object.entries(motivos)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  });

  // ─── Resolve display month ───
  let resolvedMes = mes;
  if (!resolvedMes) {
    const [imports] = await pool.execute(
      `SELECT DATE_FORMAT(MAX(data_referencia), '%Y-%m') AS mes
       FROM importacoes
       WHERE tabela_destino = 'analise_contratos'
       AND data_referencia IS NOT NULL`
    );
    resolvedMes = imports[0]?.mes || null;
  }

  return {
    mes: resolvedMes || new Date().toISOString().slice(0, 7),
    totalAlunos,
    totalEvasoes,
    taxaCancelamento: parseFloat(taxaCancelamento),
    contratosData,
    evasaoPorContrato,
    evasaoPorMotivo,
    evasaoPorMotivoByPrefixo: evasaoByPrefixo,
    porModalidade,
    porDuracao,
    tiposContrato: contratosData.length,
  };
}

/**
 * Check if we have data imported in the database.
 * @param {string|null} mes - Optional month filter "YYYY-MM"
 */
async function hasImportedData(mes = null) {
  const pool = getPool();
  try {
    let sql = "SELECT COUNT(*) as cnt FROM importacoes WHERE tabela_destino IN ('analise_contratos', 'evasao_clientes')";
    const params = [];
    if (mes) {
      sql += " AND DATE_FORMAT(data_referencia, '%Y-%m') = ?";
      params.push(mes);
    }
    const [rows] = await pool.execute(sql, params);
    return rows[0].cnt >= 2;
  } catch {
    return false;
  }
}

module.exports = { getDashboardDataFromDb, hasImportedData };
