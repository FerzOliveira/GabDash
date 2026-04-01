import { useState, useMemo, useEffect, useCallback } from "react";
import { Users, TrendingDown, BarChart3, Activity, Loader2, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import KpiCard from "./KpiCard";
import ChartCard from "./ChartCard";

import "./Dashboard.css";

const API_BASE = "/api";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#e0e7ff",
  "#818cf8",
];

const CHURN_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
];

const FILTER_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "REC", label: "REC — Recorrente" },
  { value: "PAC", label: "PAC — Pacote" },
];

const FILTER_MODALIDADE_OPTIONS = [
  { value: "TODOS", label: "Todas as Modalidades" },
  { value: "CROSS", label: "Cross" },
  { value: "SPINNING", label: "Spinning" },
];

function shortName(descricao) {
  return descricao
    .replace("REC - ", "")
    .replace("PAC - ", "")
    .replace("EXT - ", "")
    .replace("EXTRA - ", "");
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label || payload[0].name}</p>
        <p className="tooltip-value">{payload[0].value}</p>
      </div>
    );
  }
  return null;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState("TODOS");
  const [filtroModalidade, setFiltroModalidade] = useState("TODOS");
  const [needsImport, setNeedsImport] = useState(false);

  // Month selection
  const [meses, setMeses] = useState([]);
  const [mesSelecionado, setMesSelecionado] = useState("");

  // API data
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch available months
  const fetchMeses = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/months`);
      if (res.ok) {
        const list = await res.json();
        setMeses(list);
      }
    } catch {
      // ignore – months selector will just be empty
    }
  }, []);

  const fetchData = useCallback(async (mes) => {
    setLoading(true);
    setError(null);
    setNeedsImport(false);
    try {
      const url = mes
        ? `${API_BASE}/dashboard?mes=${encodeURIComponent(mes)}`
        : `${API_BASE}/dashboard`;
      const res = await fetch(url);
      if (res.status === 404) {
        const body = await res.json();
        if (body.needsImport) {
          setNeedsImport(true);
          return;
        }
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeses();
  }, [fetchMeses]);

  useEffect(() => {
    fetchData(mesSelecionado || null);
  }, [fetchData, mesSelecionado]);

  // ─── Derived / filtered data ───
  const contratosFiltered = useMemo(() => {
    if (!data) return [];
    let base =
      filtro === "TODOS"
        ? data.contratosData
        : data.contratosData.filter((c) => c.descricao.startsWith(filtro + " "));
    if (filtroModalidade !== "TODOS")
      base = base.filter((c) =>
        c.descricao.toUpperCase().includes(filtroModalidade.toUpperCase())
      );
    return base;
  }, [data, filtro, filtroModalidade]);

  const totalAlunosFiltrado = useMemo(
    () => contratosFiltered.reduce((sum, c) => sum + c.quantidade, 0),
    [contratosFiltered]
  );

  const top10 = useMemo(
    () =>
      contratosFiltered
        .slice(0, 10)
        .map((c) => ({ name: shortName(c.descricao), quantidade: c.quantidade })),
    [contratosFiltered]
  );

  const modalidadeData = useMemo(() => {
    const groups = {};
    contratosFiltered.forEach(({ descricao, quantidade }) => {
      let m = descricao.toUpperCase().includes("CROSS")
        ? "Cross"
        : descricao.toUpperCase().includes("SPINNING")
        ? "Spinning"
        : "Outros";
      groups[m] = (groups[m] || 0) + quantidade;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [contratosFiltered]);

  const duracaoData = useMemo(() => {
    const groups = {};
    contratosFiltered.forEach(({ descricao, quantidade }) => {
      const upper = descricao.toUpperCase();
      let d = upper.includes("ANUAL")
        ? "Anual"
        : upper.includes("SEMESTRAL")
        ? "Semestral"
        : upper.includes("TRIMESTRAL")
        ? "Trimestral"
        : upper.includes("MENSAL")
        ? "Mensal"
        : upper.includes("AVULS")
        ? "Avulso"
        : "Outros";
      groups[d] = (groups[d] || 0) + quantidade;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [contratosFiltered]);

  const churnContratosAll = useMemo(() => {
    if (!data) return [];
    let base =
      filtro === "TODOS"
        ? data.evasaoPorContrato
        : data.evasaoPorContrato.filter((c) => c.name.startsWith(filtro + " "));
    if (filtroModalidade !== "TODOS")
      base = base.filter((c) =>
        c.name.toUpperCase().includes(filtroModalidade.toUpperCase())
      );
    return base;
  }, [data, filtro, filtroModalidade]);

  const churnContratos = useMemo(() => {
    return churnContratosAll
      .slice(0, 8)
      .map((c) => ({ name: shortName(c.name), value: c.value }));
  }, [churnContratosAll]);

  const churnMotivo = useMemo(() => {
    if (!data) return [];
    const byPrefixo =
      data.evasaoPorMotivoByPrefixo[filtro] ??
      data.evasaoPorMotivoByPrefixo["TODOS"] ??
      [];
    if (filtroModalidade === "TODOS") return byPrefixo;
    const totalPrefixo = byPrefixo.reduce((s, m) => s + m.value, 0);
    const totalModalidade = churnContratosAll.reduce((s, c) => s + c.value, 0);
    if (totalPrefixo === 0) return byPrefixo;
    return byPrefixo
      .map((m) => ({
        ...m,
        value: Math.round((m.value / totalPrefixo) * totalModalidade),
      }))
      .filter((m) => m.value > 0);
  }, [data, filtro, filtroModalidade, churnContratosAll]);

  const totalEvasoesFiltrado = churnContratosAll.reduce((s, c) => s + c.value, 0);
  const taxaFiltrada =
    totalAlunosFiltrado > 0
      ? ((totalEvasoesFiltrado / (totalAlunosFiltrado + totalEvasoesFiltrado)) * 100).toFixed(1)
      : "0.0";

  // ─── Loading / Error / NeedsImport states ───
  if (loading) {
    return (
      <div className="dashboard loading-screen">
        <Loader2 className="spinner" size={48} />
        <p>Carregando dados...</p>
      </div>
    );
  }
  if (needsImport) {
    return (
      <div className="dashboard loading-screen">
        <Upload size={48} style={{ color: "#f59e0b" }} />
        <p style={{ fontSize: "1.1rem", color: "#374151", textAlign: "center" }}>
          Nenhum dado importado ainda.<br />
          Importe os arquivos necessários para visualizar o dashboard.
        </p>
        <button className="btn-retry" onClick={() => navigate("/importar")}>
          Ir para Importação
        </button>
      </div>
    );
  }
  if (error) {
    return (
      <div className="dashboard loading-screen">
        <p className="error-text">Erro ao carregar dados: {error}</p>
        <button className="btn-retry" onClick={() => fetchData(mesSelecionado || null)}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>GabDash</h1>
          <p className="header-subtitle">
            Painel de Controle — {data?.mes ? (() => {
              const [y, m] = data.mes.split("-");
              return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
            })() : ""}
          </p>
        </div>
        <div className="filtros-wrapper">
          <button
            className="filtro-select btn-import-link"
            onClick={() => navigate("/importar")}
          >
            <Upload size={16} style={{ marginRight: 6 }} />
            Importar Dados
          </button>
          {meses.length > 0 && (
            <select
              className="filtro-select"
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
            >
              <option value="">Mais recente</option>
              {meses.map((m) => {
                const [y, mo] = m.split("-");
                return (
                  <option key={m} value={m}>
                    {MONTH_NAMES[parseInt(mo, 10) - 1]} {y}
                  </option>
                );
              })}
            </select>
          )}
          <select
            className="filtro-select"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="filtro-select"
            value={filtroModalidade}
            onChange={(e) => setFiltroModalidade(e.target.value)}
          >
            {FILTER_MODALIDADE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="kpi-grid">
        <KpiCard
          title="Total de Alunos"
          value={totalAlunosFiltrado}
          subtitle="Contratos ativos"
          icon={Users}
          color="#6366f1"
        />
        <KpiCard
          title="Taxa de Cancelamento"
          value={`${taxaFiltrada}%`}
          subtitle={`${totalEvasoesFiltrado} cancelamentos`}
          icon={TrendingDown}
          color="#ef4444"
        />
        <KpiCard
          title="Tipos de Contrato"
          value={contratosFiltered.length}
          subtitle="Planos ativos"
          icon={BarChart3}
          color="#8b5cf6"
        />
        <KpiCard
          title="Retenção"
          value={`${(100 - parseFloat(taxaFiltrada)).toFixed(1)}%`}
          subtitle="Taxa de retenção"
          icon={Activity}
          color="#22c55e"
        />
      </section>

      {/* Charts Row 1 */}
      <section className="charts-grid">
        <ChartCard title="Top 10 Contratos por Quantidade de Alunos">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={top10}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                dataKey="name"
                type="category"
                width={200}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="quantidade" fill="#6366f1" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Alunos por Modalidade">
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={modalidadeData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {modalidadeData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Charts Row 2 */}
      <section className="charts-grid">
        <ChartCard title="Cancelamentos por Motivo">
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={churnMotivo}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {churnMotivo.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHURN_COLORS[index % CHURN_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cancelamentos por Tipo de Contrato (Top 8)">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={churnContratos}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                dataKey="name"
                type="category"
                width={200}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#ef4444" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Charts Row 3 */}
      <section className="charts-grid single">
        <ChartCard title="Alunos por Duração do Plano">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={duracaoData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <footer className="dashboard-footer">
        <p>Dados importados da base local — GabDash</p>
      </footer>
    </div>
  );
}
