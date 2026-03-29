// Data extracted from Relatório de evasão de clientes-29-03-2026-10-14.xlsx
export const evasaoData = [
  { cliente: "Bonnie Popinhaki", contrato: "EXTRA - PASS DIÁRIA", motivo: "Automático", inicio: "15/01/2026", encerramento: "01/03/2026" },
  { cliente: "Rodrigo Weiss", contrato: "EXTRA - PASS DIÁRIA", motivo: "Automático", inicio: "22/01/2026", encerramento: "01/03/2026" },
  { cliente: "DANIEL DE MOURA", contrato: "EXTRA - PASS DIÁRIA", motivo: "Automático", inicio: "15/01/2026", encerramento: "01/03/2026" },
  { cliente: "ELENARA LUCAS", contrato: "EXTRA - PASS DIÁRIA", motivo: "Automático", inicio: "25/01/2026", encerramento: "01/03/2026" },
  { cliente: "NICOLAS LUCAS", contrato: "EXTRA - PASS DIÁRIA", motivo: "Automático", inicio: "25/01/2026", encerramento: "01/03/2026" },
  { cliente: "LUCIANA MOURA FREITAS", contrato: "PAC - SPINNING - MENSAL 5 AULAS", motivo: "Automático", inicio: "26/02/2026", encerramento: "01/03/2026" },
  { cliente: "PATRICIA GARCIA BERNARDI", contrato: "PAC - SPINNING - MENSAL 5 AULAS", motivo: "Automático", inicio: "28/02/2026", encerramento: "01/03/2026" },
  { cliente: "Greice Brixner Machado", contrato: "PAC - CROSS - MENSAL 8 CHECK INS", motivo: "Automático", inicio: "02/03/2026", encerramento: "02/03/2026" },
  { cliente: "EZEQUIEL SOUZA OLIVEIRA", contrato: "REC - CROSS - ANUAL 12 CHECK INS", motivo: "Automático", inicio: "03/03/2025", encerramento: "03/03/2026" },
  { cliente: "GABRIELE SILVA DA PAIXÃO", contrato: "PAC - SPINNING - MENSAL 5 AULAS", motivo: "Automático", inicio: "06/03/2026", encerramento: "06/03/2026" },
];

export const totalEvasoes = 48;

// Churn by reason (excluding PASS ASSÍDUO: 20 and PASS DIÁRIA: 23, all Automático)
export const evasaoPorMotivo = [
  { name: "Automático", value: 42 },
  { name: "Mudança de endereço", value: 2 },
  { name: "Mudou de contrato/plano", value: 2 },
  { name: "Sem tempo", value: 1 },
  { name: "Perda de renda", value: 1 },
];

// Real cross-tabulation: motivo x contract prefix (from raw data)
// PAC: all 32 are Automático
// REC: 9 Automático, 2 Mudança de endereço, 2 Mudou de contrato/plano, 1 Sem tempo, 1 Perda de renda
// HUB: 1 Automático
export const evasaoPorMotivoByPrefixo = {
  TODOS: [
    { name: "Automático", value: 42 },
    { name: "Mudança de endereço", value: 2 },
    { name: "Mudou de contrato/plano", value: 2 },
    { name: "Sem tempo", value: 1 },
    { name: "Perda de renda", value: 1 },
  ],
  PAC: [
    { name: "Automático", value: 32 },
  ],
  REC: [
    { name: "Automático", value: 9 },
    { name: "Mudança de endereço", value: 2 },
    { name: "Mudou de contrato/plano", value: 2 },
    { name: "Sem tempo", value: 1 },
    { name: "Perda de renda", value: 1 },
  ],
};

// Churn by contract type (PASS DIÁRIA and PASS ASSÍDUO excluded)
export const evasaoPorContrato = [
  { name: "PAC - SPINNING - MENSAL 5 AULAS", value: 14 },
  { name: "PAC - CROSS - MENSAL 12 CHECK INS", value: 5 },
  { name: "PAC - CROSS - MENSAL 8 CHECK INS", value: 5 },
  { name: "REC - CROSS - ANUAL 12 CHECK INS", value: 3 },
  { name: "PAC - SPINNING - MENSAL 8 AULAS", value: 3 },
  { name: "REC - CROSS - SEMESTRAL 20 CHECK INS", value: 3 },
  { name: "REC - SPINNING - SEMESTRAL 8 AULAS", value: 2 },
  { name: "PAC - CROSS - MENSAL ILIMITADO", value: 2 },
  { name: "REC - CROSS - SEMESTRAL 12 CHECK INS", value: 2 },
  { name: "REC - SPINNING - SEMESTRAL 20 AULAS", value: 2 },
  { name: "PAC - SPINNING - 10 AULAS AVULSAS", value: 2 },
  { name: "REC - CROSS - ANUAL 20 CHECK INS", value: 2 },
  { name: "PAC - CROSS - MENSAL 5 CHECK INS", value: 1 },
  { name: "REC - SPINNING - ANUAL 20 AULAS", value: 1 },
  { name: "HUB - SEMESTRAL 12 AULAS", value: 1 },
];

// Cancellation rate = evasões / (total alunos + evasões) * 100
// Uses dynamic import of totalAlunos (354 after exclusions)
import { totalAlunos } from './contratos';
export const taxaCancelamento = ((totalEvasoes / (totalAlunos + totalEvasoes)) * 100).toFixed(1);
