const XLSX = require("xlsx");
const { getPool } = require("../config/database");

/**
 * Maps file name patterns to table configurations.
 * Each config specifies the target table and column mapping.
 */
const TABLE_CONFIGS = {
  analiseContratos: {
    tabela: "analise_contratos",
    label: "Análise de Contratos",
    pattern: /analiseContratos/i,
    columns: {
      "Descrição": "descricao",
      "Quantidade": "quantidade",
    },
  },
  clientes: {
    tabela: "clientes",
    label: "Clientes",
    pattern: /^clientes/i,
    columns: {
      "Nome": "nome",
      "E-mail": "email",
      "Contrato": "contrato",
      "Telefone": "telefone",
      "Situação do contrato": "situacao_contrato",
      "Situação do cliente": "situacao_cliente",
      "CPF": "cpf",
      "RG": "rg",
      "Data de nascimento": "data_nascimento",
      "Data de cadastro": "data_cadastro",
      "Objetivo": "objetivo",
      "Sexo": "sexo",
      "VIP": "vip",
      "Endereco": "endereco",
      "Número": "numero",
      "Bairro": "bairro",
      "Cep": "cep",
      "Cidade": "cidade",
      "Complemento": "complemento",
      "Consultor": "consultor",
      "Professor": "professor",
      "Bloqueio de notificações": "bloqueio_notificacoes",
      "Categorias": "categorias",
    },
  },
  contasReceber: {
    tabela: "contas_receber",
    label: "Contas a Receber",
    pattern: /contas-receber/i,
    columns: {
      "Cliente": "cliente",
      "Descrição": "descricao",
      "Data de emissão": "data_emissao",
      "Data de vencimento": "data_vencimento",
      "Data de recebimento": "data_recebimento",
      "DDD": "ddd",
      "Telefone": "telefone",
      "Valor": "valor",
      "Valor recebido": "valor_recebido",
      "Valor em créditos": "valor_creditos",
      "Valor desconto": "valor_desconto",
      "Valor multa": "valor_multa",
      "Valor taxa": "valor_taxa",
      "Método de pagamento": "metodo_pagamento",
      "Operadora/Emissor": "operadora_emissor",
      "Usuário recebimento": "usuario_recebimento",
      "Número de parcelas": "numero_parcelas",
      "Situação": "situacao",
      "Consultor": "consultor",
      "Usuário": "usuario",
      "Observação": "observacao",
    },
  },
  evasao: {
    tabela: "evasao_clientes",
    label: "Evasão de Clientes",
    pattern: /evasao/i,
    columns: {
      "Cliente": "cliente",
      "Telefone": "telefone",
      "Contrato": "contrato",
      "Motivo": "motivo",
      "Início": "data_inicio",
      "Encerramento": "data_encerramento",
    },
  },
  transacoes: {
    tabela: "transacoes",
    label: "Transações",
    pattern: /transacoes/i,
    columns: {
      "Cliente": "cliente",
      "Gateway": "gateway",
      "Descricao": "descricao",
      "Parcela": "parcela",
      "Data de transação": "data_transacao",
      "Tipo": "tipo",
      "Situação": "situacao",
      "Mensagem retorno": "mensagem_retorno",
      "Vencto. do receber": "vencto_receber",
      "Liberado para saque": "liberado_saque",
      "Finalização do saque": "finalizacao_saque",
      "Valor bruto": "valor_bruto",
      "Valor líquido parcela": "valor_liquido_parcela",
    },
  },
};

// Date columns that need special parsing
const DATE_COLUMNS = new Set([
  "data_nascimento", "data_cadastro", "data_emissao", "data_vencimento",
  "data_recebimento", "data_inicio", "data_encerramento", "data_transacao",
  "vencto_receber", "liberado_saque", "finalizacao_saque",
]);

// Decimal columns
const DECIMAL_COLUMNS = new Set([
  "valor", "valor_recebido", "valor_creditos", "valor_desconto",
  "valor_multa", "valor_taxa", "valor_bruto", "valor_liquido_parcela",
]);

// Integer columns
const INT_COLUMNS = new Set(["quantidade", "numero_parcelas"]);

/**
 * Normalize a string for pattern matching: remove diacritics and lowercase.
 */
function normalize(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Detect which table a file belongs to based on its filename.
 * Accepts already-decoded filename.
 */
function detectTable(filename) {
  const normalizedName = normalize(filename);
  for (const [key, config] of Object.entries(TABLE_CONFIGS)) {
    if (config.pattern.test(normalizedName)) {
      return { key, ...config };
    }
  }
  return null;
}

/**
 * Parse a date value from XLSX.
 * XLSX may provide dates as:
 * - Excel serial numbers (e.g. 46015.126)
 * - Strings like "01/03/2026" or "2026-03-01"
 */
function parseDate(value) {
  if (value == null || value === "") return null;

  // Excel serial number (number)
  if (typeof value === "number") {
    // XLSX utility to convert serial to JS Date
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  // String date "dd/mm/yyyy"
  const str = String(value).trim();
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  // ISO format "yyyy-mm-dd"
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  return null;
}

/**
 * Parse a decimal value, handling Brazilian format (comma as decimal)
 */
function parseDecimal(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;
  const str = String(value).replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function parseInt2(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Math.round(value);
  const num = parseInt(String(value), 10);
  return isNaN(num) ? null : num;
}

/**
 * Parse an XLSX buffer and import into the appropriate MySQL table.
 * @param {Buffer} fileBuffer - The uploaded file buffer
 * @param {string} originalName - Original file name
 * @returns {Object} Import result
 */
async function importXlsx(fileBuffer, originalName) {
  // Fix encoding once here (browsers may send UTF-8 names parsed as Latin-1)
  let fixedName = originalName;
  try {
    const attempt = Buffer.from(originalName, "latin1").toString("utf8");
    if (attempt !== originalName) fixedName = attempt;
  } catch { /* keep original */ }

  const detected = detectTable(fixedName);
  if (!detected) {
    throw new Error(`Não foi possível identificar a tabela para o arquivo: ${fixedName}`);
  }

  const { tabela, label, columns } = detected;

  // Parse XLSX
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rows.length < 2) {
    throw new Error("O arquivo não contém dados suficientes (mínimo: cabeçalho + 1 linha)");
  }

  const headers = rows[0];
  const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell != null && cell !== ""));

  // Map header indices to DB columns
  const colMapping = [];
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] || "").trim();
    const dbCol = columns[header];
    if (dbCol) {
      colMapping.push({ index: i, dbColumn: dbCol });
    }
  }

  if (colMapping.length === 0) {
    throw new Error(
      `Colunas do arquivo não correspondem à tabela '${label}'. ` +
      `Esperado: ${Object.keys(columns).join(", ")}`
    );
  }

  // Extract reference date from filename
  const dateMatch = fixedName.match(/(\d{2})[_-](\d{2})[_-](\d{4})/);
  const dataReferencia = dateMatch
    ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
    : null;

  if (!dataReferencia) {
    throw new Error(
      "Não foi possível extrair a data de referência do nome do arquivo. " +
      "Use o formato: nome-DD_MM_AAAA.xlsx"
    );
  }

  // Derive year-month for grouping (e.g. "2026-03")
  const mesReferencia = dataReferencia.substring(0, 7);

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Create import record
    const [importResult] = await conn.query(
      "INSERT INTO importacoes (nome_arquivo, tabela_destino, data_referencia, total_registros) VALUES (?, ?, ?, ?)",
      [fixedName, tabela, dataReferencia, dataRows.length]
    );
    const importacaoId = importResult.insertId;

    // Delete previous data for this table AND same month only (cascade deletes data rows)
    await conn.query(
      "DELETE FROM importacoes WHERE tabela_destino = ? AND DATE_FORMAT(data_referencia, '%Y-%m') = ? AND id != ?",
      [tabela, mesReferencia, importacaoId]
    );

    // Build insert query
    const dbColumns = colMapping.map((c) => c.dbColumn);
    const placeholders = dbColumns.map(() => "?").join(", ");
    const insertSql = `INSERT INTO \`${tabela}\` (${dbColumns.map(c => `\`${c}\``).join(", ")}, importacao_id) VALUES (${placeholders}, ?)`;

    // Insert rows in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
      const batch = dataRows.slice(i, i + BATCH_SIZE);
      for (const row of batch) {
        const values = colMapping.map(({ index, dbColumn }) => {
          let val = row[index];
          if (val == null || val === "") return null;

          if (DATE_COLUMNS.has(dbColumn)) return parseDate(val);
          if (DECIMAL_COLUMNS.has(dbColumn)) return parseDecimal(val);
          if (INT_COLUMNS.has(dbColumn)) return parseInt2(val);

          // Truncate strings to avoid overflow
          if (typeof val === "string" && val.length > 255) {
            return val.substring(0, 255);
          }
          return String(val).trim();
        });
        values.push(importacaoId);
        await conn.query(insertSql, values);
      }
    }

    await conn.commit();

    return {
      tabela,
      label,
      arquivo: fixedName,
      dataReferencia,
      registrosImportados: dataRows.length,
      importacaoId,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Get the current import status for all expected tables.
 * Shows the latest import per table, plus how many months exist.
 */
async function getImportStatus() {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT tabela_destino, nome_arquivo, data_referencia, total_registros, created_at
     FROM importacoes
     ORDER BY created_at DESC`
  );

  const status = {};
  for (const [key, config] of Object.entries(TABLE_CONFIGS)) {
    const tableRows = rows.filter((r) => r.tabela_destino === config.tabela);
    const latest = tableRows[0] || null;
    const meses = [...new Set(tableRows
      .filter((r) => r.data_referencia)
      .map((r) => {
        const d = new Date(r.data_referencia);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })
    )].sort().reverse();

    status[key] = {
      key,
      tabela: config.tabela,
      label: config.label,
      importado: !!latest,
      arquivo: latest?.nome_arquivo || null,
      dataReferencia: latest?.data_referencia || null,
      totalRegistros: latest?.total_registros || 0,
      ultimaImportacao: latest?.created_at || null,
      mesesDisponiveis: meses,
    };
  }

  return status;
}

/**
 * Get available months that have data for the dashboard (contratos + evasão).
 */
async function getAvailableMonths() {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT DISTINCT DATE_FORMAT(data_referencia, '%Y-%m') AS mes
     FROM importacoes
     WHERE data_referencia IS NOT NULL
     AND tabela_destino IN ('analise_contratos', 'evasao_clientes')
     ORDER BY mes DESC`
  );
  return rows.map((r) => r.mes);
}

module.exports = { importXlsx, getImportStatus, getAvailableMonths, detectTable, TABLE_CONFIGS };
