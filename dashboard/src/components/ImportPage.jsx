import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Files,
  X,
  Info,
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
  const [dragOver, setDragOver] = useState(false);
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchUploading, setBatchUploading] = useState(false);
  const dropRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/import/status`, { cache: "no-store" });
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

  // --- Batch / Drag-and-drop logic ---

  const filterXlsxFiles = (fileList) => {
    return Array.from(fileList).filter((f) => {
      const name = f.name.toLowerCase();
      return name.endsWith(".xlsx") || name.endsWith(".xls");
    });
  };

  const addBatchFiles = (newFiles) => {
    const xlsx = filterXlsxFiles(newFiles);
    if (xlsx.length === 0) return;
    setBatchFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.file.name));
      const unique = xlsx.filter((f) => !existingNames.has(f.name));
      return [
        ...prev,
        ...unique.map((f) => ({ file: f, status: "pending", message: null })),
      ];
    });
  };

  const removeBatchFile = (index) => {
    setBatchFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearBatchFiles = () => {
    setBatchFiles([]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      addBatchFiles(e.dataTransfer.files);
    }
  };

  const handleBatchFileSelect = (e) => {
    if (e.target.files?.length) {
      addBatchFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleBatchUpload = async () => {
    if (batchFiles.length === 0 || batchUploading) return;
    setBatchUploading(true);

    for (let i = 0; i < batchFiles.length; i++) {
      const entry = batchFiles[i];
      if (entry.status === "success") continue;

      setBatchFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading", message: null } : f
        )
      );

      const formData = new FormData();
      formData.append("file", entry.file);

      try {
        const res = await fetch(`${API_BASE}/import/upload`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
          setBatchFiles((prev) =>
            prev.map((f, idx) =>
              idx === i
                ? { ...f, status: "error", message: data.error || "Erro na importação" }
                : f
            )
          );
          continue;
        }

        setBatchFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "success", message: data.message } : f
          )
        );
      } catch (err) {
        setBatchFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: "error", message: err.message || "Erro ao enviar" }
              : f
          )
        );
      }
    }

    // Invalidate cache and refresh once after all uploads
    try {
      await fetch(`${API_BASE}/dashboard/invalidate`, { method: "POST" });
    } catch {}
    await fetchStatus();
    setBatchUploading(false);
  };

  const handleRefresh = () => {
    setBatchFiles([]);
    setBatchUploading(false);
    fetchStatus();
  };

  const batchSuccessCount = batchFiles.filter((f) => f.status === "success").length;
  const batchHasFiles = batchFiles.length > 0;
  const batchAllDone =
    batchHasFiles && batchFiles.every((f) => f.status === "success" || f.status === "error");

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
        <button className="btn-refresh" onClick={handleRefresh}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      {/* Status Banner — shown only when há arquivos pendentes */}
      {!allImported && (
        <div className="import-banner banner-warning">
          <AlertCircle size={20} />
          <span>
            {importedCount} de {EXPECTED_FILES.length} arquivos importados.
            {importedCount < 2
              ? " Importe pelo menos os arquivos de Análise de Contratos e Evasão de Clientes para o dashboard funcionar."
              : " Importe os arquivos restantes para dados completos."}
          </span>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        ref={dropRef}
        className={`drop-zone ${dragOver ? "drop-zone-active" : ""} ${batchHasFiles ? "drop-zone-has-files" : ""}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !batchUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          onChange={handleBatchFileSelect}
          hidden
        />
        {!batchHasFiles ? (
          <div className="drop-zone-content">
            <Files size={40} strokeWidth={1.5} />
            <p className="drop-zone-title">Arraste todos os arquivos aqui</p>
            <p className="drop-zone-hint">
              ou clique para selecionar múltiplos arquivos .xlsx de uma vez
            </p>
          </div>
        ) : (
          <div className="drop-zone-files" onClick={(e) => e.stopPropagation()}>
            <div className="drop-zone-files-header">
              <span className="drop-zone-files-count">
                <Files size={18} />
                {batchFiles.length} arquivo{batchFiles.length !== 1 ? "s" : ""} selecionado{batchFiles.length !== 1 ? "s" : ""}
                {batchSuccessCount > 0 && (
                  <span className="batch-success-count">
                    ({batchSuccessCount} importado{batchSuccessCount !== 1 ? "s" : ""})
                  </span>
                )}
              </span>
              <div className="drop-zone-files-actions">
                {!batchUploading && (
                  <button className="btn-add-more" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={14} />
                    Adicionar mais
                  </button>
                )}
                {!batchUploading && (
                  <button className="btn-clear-batch" onClick={clearBatchFiles}>
                    Limpar lista
                  </button>
                )}
              </div>
            </div>
            <ul className="batch-file-list">
              {batchFiles.map((entry, idx) => (
                <li key={idx} className={`batch-file-item batch-file-${entry.status}`}>
                  <FileSpreadsheet size={16} />
                  <span className="batch-file-name">{entry.file.name}</span>
                  <span className="batch-file-status-icon">
                    {entry.status === "pending" && <span className="batch-dot pending" />}
                    {entry.status === "uploading" && <Loader2 size={14} className="spinner" />}
                    {entry.status === "success" && <CheckCircle2 size={14} className="batch-icon-success" />}
                    {entry.status === "error" && <AlertCircle size={14} className="batch-icon-error" />}
                  </span>
                  {entry.message && (
                    <span className={`batch-file-msg ${entry.status === "error" ? "batch-msg-error" : "batch-msg-success"}`}>
                      {entry.message}
                    </span>
                  )}
                  {!batchUploading && entry.status !== "uploading" && (
                    <button className="btn-remove-file" onClick={() => removeBatchFile(idx)}>
                      <X size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <button
              className={`btn-batch-upload ${batchUploading ? "uploading" : ""}`}
              onClick={handleBatchUpload}
              disabled={batchUploading || batchAllDone}
            >
              {batchUploading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  Importando arquivos...
                </>
              ) : batchAllDone ? (
                <>
                  <CheckCircle2 size={16} />
                  Importação concluída
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Importar todos os arquivos
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="info-import-grid">
        {EXPECTED_FILES.map((file) => {
          const st = status[file.key];
          const isImported = st?.importado;

          return (
            <div
              key={file.key}
              className={`info-import-card ${isImported ? "info-card-imported" : "info-card-pending"}`}
            >
              <div className="info-card-header">
                <div className="info-card-icon">
                  <FileSpreadsheet size={18} />
                </div>
                <div className="info-card-title-group">
                  <span className="info-card-label">{file.label}</span>
                  <span className="info-card-desc">{file.description}</span>
                </div>
                {isImported ? (
                  <span className="status-badge badge-success">
                    <CheckCircle2 size={12} /> Importado
                  </span>
                ) : (
                  <span className="status-badge badge-pending">
                    <AlertCircle size={12} /> Pendente
                  </span>
                )}
              </div>
              <div className="info-card-footer">
                <span className="info-card-pattern">
                  <code>{file.pattern}</code>
                </span>
                {isImported && st && (
                  <div className="info-card-meta">
                    <span>{st.totalRegistros} registros</span>
                    <span className="meta-separator">&middot;</span>
                    <span>{new Date(st.ultimaImportacao).toLocaleDateString("pt-BR")}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
