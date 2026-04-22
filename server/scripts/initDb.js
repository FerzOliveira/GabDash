/**
 * Initializes the MySQL database schema.
 * Run once or on server startup to ensure tables exist.
 */
const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const DB_NAME = process.env.DB_NAME || "gabdash";

const TABLES = [
  // Import history tracking
  `CREATE TABLE IF NOT EXISTS importacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_arquivo VARCHAR(255) NOT NULL,
    tabela_destino VARCHAR(100) NOT NULL,
    data_referencia DATE NULL,
    total_registros INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tabela_destino (tabela_destino),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Contract analysis (from analiseContratos xlsx)
  `CREATE TABLE IF NOT EXISTS analise_contratos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    quantidade INT NOT NULL DEFAULT 0,
    importacao_id INT NOT NULL,
    INDEX idx_descricao (descricao),
    INDEX idx_importacao_id (importacao_id),
    FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Clients (from clientes xlsx)
  `CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    contrato VARCHAR(255) NULL,
    telefone VARCHAR(50) NULL,
    situacao_contrato VARCHAR(50) NULL,
    situacao_cliente VARCHAR(50) NULL,
    cpf VARCHAR(14) NULL,
    rg VARCHAR(30) NULL,
    data_nascimento DATE NULL,
    data_cadastro DATE NULL,
    objetivo VARCHAR(255) NULL,
    sexo VARCHAR(20) NULL,
    vip VARCHAR(10) NULL,
    endereco VARCHAR(255) NULL,
    numero VARCHAR(20) NULL,
    bairro VARCHAR(100) NULL,
    cep VARCHAR(10) NULL,
    cidade VARCHAR(100) NULL,
    complemento VARCHAR(255) NULL,
    consultor VARCHAR(100) NULL,
    professor VARCHAR(100) NULL,
    bloqueio_notificacoes VARCHAR(10) NULL,
    categorias VARCHAR(255) NULL,
    importacao_id INT NOT NULL,
    INDEX idx_nome (nome),
    INDEX idx_contrato (contrato),
    INDEX idx_situacao_contrato (situacao_contrato),
    INDEX idx_importacao_id (importacao_id),
    FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Accounts receivable (from contas-receber xlsx)
  `CREATE TABLE IF NOT EXISTS contas_receber (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente VARCHAR(255) NULL,
    descricao VARCHAR(255) NULL,
    data_emissao DATE NULL,
    data_vencimento DATE NULL,
    data_recebimento DATE NULL,
    ddd VARCHAR(5) NULL,
    telefone VARCHAR(20) NULL,
    valor DECIMAL(12,2) NULL,
    valor_recebido DECIMAL(12,2) NULL,
    valor_creditos DECIMAL(12,2) NULL,
    valor_desconto DECIMAL(12,2) NULL,
    valor_multa DECIMAL(12,2) NULL,
    valor_taxa DECIMAL(12,2) NULL,
    metodo_pagamento VARCHAR(100) NULL,
    operadora_emissor VARCHAR(100) NULL,
    usuario_recebimento VARCHAR(100) NULL,
    numero_parcelas INT NULL,
    situacao VARCHAR(50) NULL,
    consultor VARCHAR(100) NULL,
    usuario VARCHAR(100) NULL,
    observacao TEXT NULL,
    importacao_id INT NOT NULL,
    INDEX idx_cliente (cliente),
    INDEX idx_situacao (situacao),
    INDEX idx_data_vencimento (data_vencimento),
    INDEX idx_importacao_id (importacao_id),
    FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Customer churn (from Relatório de evasão xlsx)
  `CREATE TABLE IF NOT EXISTS evasao_clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente VARCHAR(255) NULL,
    telefone VARCHAR(50) NULL,
    contrato VARCHAR(255) NULL,
    motivo VARCHAR(100) NULL,
    data_inicio DATE NULL,
    data_encerramento DATE NULL,
    importacao_id INT NOT NULL,
    INDEX idx_cliente (cliente),
    INDEX idx_contrato (contrato),
    INDEX idx_motivo (motivo),
    INDEX idx_data_encerramento (data_encerramento),
    INDEX idx_importacao_id (importacao_id),
    FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Transactions (from transacoes-next-fit xlsx)
  `CREATE TABLE IF NOT EXISTS transacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente VARCHAR(255) NULL,
    gateway VARCHAR(100) NULL,
    descricao VARCHAR(255) NULL,
    parcela VARCHAR(50) NULL,
    data_transacao DATE NULL,
    tipo VARCHAR(100) NULL,
    situacao VARCHAR(50) NULL,
    mensagem_retorno TEXT NULL,
    vencto_receber DATE NULL,
    liberado_saque DATE NULL,
    finalizacao_saque DATE NULL,
    valor_bruto DECIMAL(12,2) NULL,
    valor_liquido_parcela DECIMAL(12,2) NULL,
    importacao_id INT NOT NULL,
    INDEX idx_cliente (cliente),
    INDEX idx_situacao (situacao),
    INDEX idx_data_transacao (data_transacao),
    INDEX idx_importacao_id (importacao_id),
    FOREIGN KEY (importacao_id) REFERENCES importacoes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function initDatabase() {
  // First connect without database to create it if needed
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.query(`USE \`${DB_NAME}\``);

  for (const sql of TABLES) {
    await conn.query(sql);
  }

  await conn.end();
  console.log(`✅ Banco de dados '${DB_NAME}' inicializado com sucesso`);
}

// Run directly
if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Erro ao inicializar banco:", err.message);
      process.exit(1);
    });
}

module.exports = { initDatabase };
