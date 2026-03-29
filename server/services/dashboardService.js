const { fetchAllPages, monthRange, sleep } = require("./nextfitApi");

/**
 * Only contracts whose description starts with one of these prefixes
 * are counted as valid student contracts.
 * This naturally excludes: EXTRA - PASS ASSÍDUO, EXTRA - PASS DIÁRIA,
 * EXT - EXTRA - CORTESIA FUNCIONÁRIO, EXT - EXTRA - CORTESIA ALUNO,
 * Wellhub, TotalPass, BODYSHAPE, HUB, legacy CROSS contracts, etc.
 */
const VALID_PREFIXES = ["REC - ", "PAC - "];

function isValid(descricao) {
  if (!descricao) return false;
  return VALID_PREFIXES.some((p) => descricao.startsWith(p));
}

/**
 * Fetch all base contract descriptions (id → descricao mapping).
 * Cached per server lifetime.
 */
let contratoBaseCache = null;
async function getContratoBaseMap() {
  if (contratoBaseCache) return contratoBaseCache;
  // Fetch ALL base contracts (active + inactive) so every codigoContratoBase
  // resolves to its real name instead of "Contrato #xxx"
  const bases = await fetchAllPages("ContratoBase", {});
  const map = {};
  bases.forEach((b) => {
    map[b.id] = b.descricao || `Contrato #${b.id}`;
  });
  contratoBaseCache = map;
  return map;
}

/**
 * Get dashboard data for a specific month.
 * @param {number} year
 * @param {number} month - 1-indexed
 */
async function getDashboardData(year, month) {
  // 1. Get base contract descriptions
  const baseMap = await getContratoBaseMap();
  await sleep(400);

  // Date boundaries for the target month
  const firstDay = new Date(Date.UTC(year, month - 1, 1));           // e.g. 2026-03-01
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // e.g. 2026-03-31T23:59:59
  const firstDayNext = new Date(Date.UTC(year, month, 1));           // e.g. 2026-04-01
  const startOfMonthStr = firstDay.toISOString();
  const endOfMonthStr = endOfMonth.toISOString();

  const firstDayNextStr = firstDayNext.toISOString();

  // 2. Fetch currently Ativo contracts that STARTED ≤ end of target month
  //    (If querying a past month, this excludes contracts created after that month)
  const activeContracts = await fetchAllPages("ContratoCliente", {
    Status: "Ativo",
    DataInicioFim: endOfMonthStr,
  });
  await sleep(400);

  // 3. Fetch Encerrado contracts terminated AFTER the month (were still active at end of month)
  //    Bounded: terminated ≥ first day of next month, started ≤ end of month,
  //    AND dataValidade ≥ end of month (validity extended through the month)
  const encerradoAfter = await fetchAllPages("ContratoCliente", {
    Status: "Encerrado",
    DataInicioFim: endOfMonthStr,
    DataEncerramentoInicio: firstDayNextStr,
    DataValidadeInicio: endOfMonthStr,
  });
  await sleep(400);

  // 4. Cancelado contracts terminated AFTER the month
  const canceladoAfter = await fetchAllPages("ContratoCliente", {
    Status: "Cancelado",
    DataInicioFim: endOfMonthStr,
    DataEncerramentoInicio: firstDayNextStr,
    DataValidadeInicio: endOfMonthStr,
  });
  await sleep(400);

  // 5. Encerrado contracts terminated DURING the month (evasions)
  //    Bounded: terminated within [startOfMonth, endOfMonth], started ≤ end of month
  const encerradoDuring = await fetchAllPages("ContratoCliente", {
    Status: "Encerrado",
    DataInicioFim: endOfMonthStr,
    DataEncerramentoInicio: startOfMonthStr,
    DataEncerramentoFim: endOfMonthStr,
  });
  await sleep(400);

  // 6. Cancelado contracts terminated DURING the month (evasions)
  const canceladoDuring = await fetchAllPages("ContratoCliente", {
    Status: "Cancelado",
    DataInicioFim: endOfMonthStr,
    DataEncerramentoInicio: startOfMonthStr,
    DataEncerramentoFim: endOfMonthStr,
  });

  // Active at END of month =
  //   currently Ativo (started ≤ end of month) + terminated AFTER month (were still active at end)
  const allActiveAtEndOfMonth = [...activeContracts, ...encerradoAfter, ...canceladoAfter];

  // Evasions = terminated during the month
  const evasions = [...encerradoDuring, ...canceladoDuring];

  // ─── Process Active Contracts ───
  const enriched = allActiveAtEndOfMonth.map((c) => ({
    ...c,
    descricaoBase: baseMap[c.codigoContratoBase] || `Contrato #${c.codigoContratoBase}`,
  }));

  const validContracts = enriched.filter((c) => isValid(c.descricaoBase));

  // Group by description → count
  const contratosGrouped = {};
  validContracts.forEach((c) => {
    const desc = c.descricaoBase;
    if (!contratosGrouped[desc]) contratosGrouped[desc] = 0;
    contratosGrouped[desc]++;
  });

  const contratosData = Object.entries(contratosGrouped)
    .map(([descricao, quantidade]) => ({ descricao, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const totalAlunos = contratosData.reduce((s, c) => s + c.quantidade, 0);

  // ─── Process Evasions (terminated during the month) ───
  const enrichedCancelled = evasions.map((c) => ({
    ...c,
    descricaoBase: baseMap[c.codigoContratoBase] || `Contrato #${c.codigoContratoBase}`,
  }));

  const validCancelled = enrichedCancelled.filter((c) => isValid(c.descricaoBase));

  // Group cancellations by contract description
  const cancelByContrato = {};
  validCancelled.forEach((c) => {
    const desc = c.descricaoBase;
    if (!cancelByContrato[desc]) cancelByContrato[desc] = 0;
    cancelByContrato[desc]++;
  });

  const evasaoPorContrato = Object.entries(cancelByContrato)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalEvasoes = validCancelled.length;

  // Cancellation rate: evasões / (ativos + evasões)
  const taxaCancelamento =
    totalAlunos + totalEvasoes > 0
      ? ((totalEvasoes / (totalAlunos + totalEvasoes)) * 100).toFixed(1)
      : "0.0";

  // ─── Group by modality ───
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

  // Modalidade grouping
  const modalidadeGroups = {};
  contratosData.forEach(({ descricao, quantidade }) => {
    const m = getModalidade(descricao);
    modalidadeGroups[m] = (modalidadeGroups[m] || 0) + quantidade;
  });
  const porModalidade = Object.entries(modalidadeGroups).map(([name, value]) => ({ name, value }));

  // Duração grouping
  const duracaoGroups = {};
  contratosData.forEach(({ descricao, quantidade }) => {
    const d = getDuracao(descricao);
    duracaoGroups[d] = (duracaoGroups[d] || 0) + quantidade;
  });
  const porDuracao = Object.entries(duracaoGroups).map(([name, value]) => ({ name, value }));

  // ─── Cancellation motivo mapping ───
  // Mapped by cross-referencing API codigoMotivoEncerramentoContrato with Excel data
  const MOTIVO_MAP = {
    143340: "Automático",
    143341: "Perda de renda",
    143342: "Sem tempo",
    143343: "Mudança de endereço",
    143344: "Mudou de contrato/plano",
  };

  function getMotivoName(code) {
    if (!code) return "Automático";
    return MOTIVO_MAP[code] || `Motivo #${code}`;
  }

  // Group all evasions by motivo
  const motivoGroupAll = {};
  validCancelled.forEach((c) => {
    const m = getMotivoName(c.codigoMotivoEncerramentoContrato);
    motivoGroupAll[m] = (motivoGroupAll[m] || 0) + 1;
  });
  const evasaoPorMotivo = Object.entries(motivoGroupAll)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ─── Evasão by prefixo for motivo breakdown ───
  const evasaoByPrefixo = { TODOS: [...evasaoPorMotivo] };
  // Group by prefixo → motivo
  const prefixoMotivoMap = {};
  validCancelled.forEach((c) => {
    const p = getPrefixo(c.descricaoBase);
    const m = getMotivoName(c.codigoMotivoEncerramentoContrato);
    if (!prefixoMotivoMap[p]) prefixoMotivoMap[p] = {};
    prefixoMotivoMap[p][m] = (prefixoMotivoMap[p][m] || 0) + 1;
  });
  Object.entries(prefixoMotivoMap).forEach(([prefix, motivos]) => {
    evasaoByPrefixo[prefix] = Object.entries(motivos)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  });

  return {
    mes: `${year}-${String(month).padStart(2, "0")}`,
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

module.exports = { getDashboardData };
