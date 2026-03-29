// Data extracted from analiseContratos-29_03_2026.xlsx
export const contratosData = [
  { descricao: "EXTRA - PASS ASSÍDUO", quantidade: 62 },
  { descricao: "REC - CROSS - ANUAL 12 CHECK INS", quantidade: 56 },
  { descricao: "REC - CROSS - ANUAL 20 CHECK INS", quantidade: 53 },
  { descricao: "REC - CROSS - ANUAL ILIMITADO", quantidade: 53 },
  { descricao: "REC - SPINNING - ANUAL 20 AULAS", quantidade: 30 },
  { descricao: "REC - SPINNING - ANUAL 12 AULAS", quantidade: 22 },
  { descricao: "PAC - SPINNING - MENSAL 5 AULAS", quantidade: 20 },
  { descricao: "REC - CROSS - SEMESTRAL 12 CHECK INS", quantidade: 19 },
  { descricao: "EXT - EXTRA - CORTESIA FUNCIONÁRIO", quantidade: 13 },
  { descricao: "REC - SPINNING - ANUAL 8 AULAS", quantidade: 12 },
  { descricao: "REC - CROSS - SEMESTRAL 20 CHECK INS", quantidade: 11 },
  { descricao: "PAC - CROSS - MENSAL 8 CHECK INS", quantidade: 9 },
  { descricao: "PAC - CROSS - MENSAL 5 CHECK INS", quantidade: 9 },
  { descricao: "REC - SPINNING - SEMESTRAL 8 AULAS", quantidade: 8 },
  { descricao: "PAC - CROSS - MENSAL 12 CHECK INS", quantidade: 7 },
  { descricao: "REC - SPINNING - ANUAL ILIMITADO", quantidade: 7 },
  { descricao: "REC - CROSS - TRIMESTRAL 12 CHECK INS", quantidade: 6 },
  { descricao: "REC - SPINNING - SEMESTRAL 12 AULAS", quantidade: 6 },
  { descricao: "EXT - EXTRA - CORTESIA ALUNO", quantidade: 6 },
  { descricao: "REC - SPINNING - TRIMESTRAL 8 AULAS", quantidade: 5 },
  { descricao: "REC - SPINNING - TRIMESTRAL 12 AULAS", quantidade: 5 },
  { descricao: "REC - SPINNING - SEMESTRAL 20 AULAS", quantidade: 4 },
  { descricao: "PAC - SPINNING - 10 AULAS AVULSAS", quantidade: 3 },
  { descricao: "PAC - SPINNING - 15 AULAS AVULSAS", quantidade: 2 },
  { descricao: "EXTRA - PASS DIÁRIA", quantidade: 2 },
  { descricao: "PAC - CROSS - MENSAL 20 CHECK INS", quantidade: 1 },
];

// Contracts to exclude from student count (not real enrollments)
const EXCLUDED_PATTERNS = ["PASS ASSÍDUO", "PASS DIÁRIA", "CORTESIA FUNCIONÁRIO", "CORTESIA ALUNO"];

function isExcluded(descricao) {
  return EXCLUDED_PATTERNS.some((p) => descricao.includes(p));
}

export const contratosAtivos = contratosData.filter((c) => !isExcluded(c.descricao));
export const totalAlunos = contratosAtivos.reduce((sum, c) => sum + c.quantidade, 0);

// Grouped by modality (only active contracts)
export function getContratosByModalidade() {
  const groups = {};
  contratosAtivos.forEach(({ descricao, quantidade }) => {
    let modalidade;
    if (descricao.includes("CROSS")) modalidade = "Cross";
    else if (descricao.includes("SPINNING")) modalidade = "Spinning";
    else modalidade = "Outros";

    if (!groups[modalidade]) groups[modalidade] = 0;
    groups[modalidade] += quantidade;
  });
  return Object.entries(groups).map(([name, value]) => ({ name, value }));
}

// Grouped by plan duration (only active contracts)
export function getContratosByDuracao() {
  const groups = {};
  contratosAtivos.forEach(({ descricao, quantidade }) => {
    let duracao;
    if (descricao.includes("ANUAL")) duracao = "Anual";
    else if (descricao.includes("SEMESTRAL")) duracao = "Semestral";
    else if (descricao.includes("TRIMESTRAL")) duracao = "Trimestral";
    else if (descricao.includes("MENSAL")) duracao = "Mensal";
    else if (descricao.includes("AVULSAS")) duracao = "Avulso";
    else duracao = "Outros";

    if (!groups[duracao]) groups[duracao] = 0;
    groups[duracao] += quantidade;
  });
  return Object.entries(groups).map(([name, value]) => ({ name, value }));
}
