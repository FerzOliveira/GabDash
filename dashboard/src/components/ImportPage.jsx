import { useState, useEffect, useCallback } from "react";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./ImportPage.css";

const API_BASE = "/api";

const EXPECTED_FILES = [
  {
    key: "analiseContratos",
    label: "Análise de Contratos",
    pattern: "analiseContratos-DD_MM_AAAA.xlsx",
    description: "Relatório de contratos ativos com descrição e quantidade",
  },
  {
    key: "clientes",
    label: "Clientes",
    pattern: "clientes-DD_MM_AAAA.xlsx",
    description: "Cadastro completo de clientes com dados pessoais e contratuais",
  },
  {
    key: "contasReceber",
    label: "Contas a Receber",
    pattern: "contas-receber-DD_MM_AAAA.xlsx",
    description: "Relatório financeiro com valores, vencimentos e pagamentos",
  },
  {
    key: "evasao",
    label: "Evasão de Clientes",
    pattern: "Relatório de evasão de clientes-DD-MM-AAAA.xlsx",
    description: "Relatório de cancelamentos com motivos e datas",
  },
  {
    key: "transacoes",
    label: "Transações",
    pattern: "transacoes-next-fit-DD_MM_AAAA-DD_MM_AAAA.xlsx",
    description: "Transações financeiras do período com valores bruto e líquido",
  },
];

export default function ImportPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [messages, setMessages] = useState({});

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/import/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error("Erro ao buscar status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleUpload = async (key, file) => {
    setUploading((prev) => ({ ...prev, [key]: true }));
    setMessages((prev) => ({ ...prev, [key]: null }));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/import/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => ({
          ...prev,
          [key]: { type: "error", text: data.error || "Erro na importação" },
        }));
        return;
      }

      setMessages((prev) => ({
        ...prev,
        [key]: { type: "success", text: data.message },
      }));

      // Invalidate dashboard cache
      await fetch(`${API_BASE}/dashboard/invalidate`, { method: "POST" });

      // Refresh status
      await fetchStatus();
    } catch (err) {
      setMessages((prev) => ({
        ...prev,
        [key]: { type: "error", text: err.message || "Erro ao enviar arquivo" },
      }));
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleFileChange = (key) => (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(key, file);
      e.target.value = "";
    }
  };

  const importedCount = Object.values(status).filter((s) => s.importado).length;
  const allImported = importedCount === EXPECTED_FILES.length;

  if (loading) {
    return (
      <div className="import-page loading-screen">
        <Loader2 className="spinner" size={48} />
        <p>Carregando status de importação...</p>
      </div>
    );
  }

  return (
    <div className="import-page">
      <header className="import-header">
        <div className="import-header-left">
          <button className="btn-back" onClick={() => navigate("/")}>
            <ArrowLeft size={20} />
            Voltar ao Dashboard
          </button>
          <div>
            <h1>Importação de Dados</h1>
            <p className="import-subtitle">
              Envie os arquivos .xlsx exportados do Next Fit para atualizar a base de dados
            </p>
          </div>
        </div>
        <button className="btn-refresh" onClick={fetchStatus}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      {/* Status Banner */}
      <div className={`import-banner ${allImported ? "banner-success" : "banner-warning"}`}>
        {allImported ? (
          <>
            <CheckCircle2 size={20} />
            <span>Todos os arquivos foram importados. O dashboard está pronto para uso.</span>
          </>
        ) : (
          <>
            <AlertCircle size={20} />
            <span>
              {importedCount} de {EXPECTED_FILES.length} arquivos importados.
              {importedCount < 2
                ? " Importe pelo menos os arquivos de Análise de Contratos e Evasão de Clientes para o dashboard funcionar."
                : " Importe os arquivos restantes para dados completos."}
            </span>
          </>
        )}
      </div>

      {/* File Cards */}
      <div className="import-grid">
        {EXPECTED_FILES.map((file) => {
          const st = status[file.key];
          const isUploading = uploading[file.key];
          const msg = messages[file.key];
          const isImported = st?.importado;

          return (
            <div
              key={file.key}
              className={`import-card ${isImported ? "card-imported" : "card-pending"}`}
            >
              <div className="import-card-header">
                <div className="import-card-icon">
                  <FileSpreadsheet size={24} />
                </div>
                <div className="import-card-status">
                  {isImported ? (
                    <span className="status-badge badge-success">
                      <CheckCircle2 size={14} /> Importado
                    </span>
                  ) : (
                    <span className="status-badge badge-pending">
                      <AlertCircle size={14} /> Pendente
                    </span>
                  )}
                </div>
              </div>

              <h3 className="import-card-title">{file.label}</h3>
              <p className="import-card-desc">{file.description}</p>

              <div className="import-card-pattern">
                <span className="pattern-label">Arquivo esperado:</span>
                <code>{file.pattern}</code>
              </div>

              {isImported && st && (
                <div className="import-card-info">
                  <p>
                    <strong>Arquivo:</strong> {st.arquivo}
                  </p>
                  <p>
                    <strong>Registros:</strong> {st.totalRegistros}
                  </p>
                  <p>
                    <strong>Importado em:</strong>{" "}
                    {new Date(st.ultimaImportacao).toLocaleString("pt-BR")}
                  </p>
                  {st.mesesDisponiveis && st.mesesDisponiveis.length > 0 && (
                    <p>
                      <strong>Meses:</strong>{" "}
                      {st.mesesDisponiveis.join(", ")}
                    </p>
                  )}
                </div>
              )}

              <label className={`btn-upload ${isUploading ? "uploading" : ""}`}>
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    {isImported ? "Reimportar arquivo" : "Enviar arquivo"}
                  </>
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange(file.key)}
                  disabled={isUploading}
                  hidden
                />
              </label>

              {msg && (
                <div className={`import-msg msg-${msg.type}`}>
                  {msg.type === "success" ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <AlertCircle size={14} />
                  )}
                  {msg.text}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
