import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Download, FileSpreadsheet, History, IndianRupee,
  LoaderCircle, RefreshCw, Upload, Users, X
} from 'lucide-react';
import { maintenanceAPI, residentsAPI } from '../services/api';
import './data-import.css';

const IMPORT_TYPES = {
  residents: {
    title: 'Import Residents',
    description: 'Create resident accounts and flats from a validated spreadsheet.',
    icon: Users,
    accent: 'blue',
    maxSizeMb: 5,
    sampleName: 'resident_import_sample.xlsx',
    downloadTemplate: residentsAPI.downloadImportTemplate,
    preview: residentsAPI.previewImport,
    confirm: residentsAPI.confirmImport,
    history: residentsAPI.getImportHistory,
    errors: residentsAPI.downloadImportErrors,
  },
  maintenance: {
    title: 'Import Maintenance Transactions',
    description: 'Add validated maintenance payment transactions in one controlled batch.',
    icon: IndianRupee,
    accent: 'green',
    maxSizeMb: 10,
    sampleName: 'maintenance_import_sample.xlsx',
    downloadTemplate: maintenanceAPI.downloadTransactionImportTemplate,
    preview: maintenanceAPI.previewTransactionImport,
    confirm: maintenanceAPI.confirmTransactionImport,
    history: maintenanceAPI.getTransactionImportHistory,
    errors: maintenanceAPI.downloadTransactionImportErrors,
  },
};

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const allowedFile = (file) => /\.(xlsx|xls|csv)$/i.test(file?.name || '');

const messageFromError = async (error, fallback) => {
  let data = error?.response?.data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const text = await data.text();
      data = JSON.parse(text);
    } catch (_ignored) {
      data = null;
    }
  }
  return data?.message || error?.message || fallback;
};

const downloadResponse = (response, fallbackName) => {
  const disposition = response?.headers?.['content-disposition'] || '';
  const utfName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const fileName = decodeURIComponent(utfName || plainName || fallbackName);
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const resultTone = (value) => {
  const status = String(value || '').toLowerCase();
  if (status === 'valid' || status === 'completed') return 'success';
  if (status === 'warning' || status === 'previewed') return 'warning';
  if (status === 'duplicate') return 'duplicate';
  return 'error';
};

const displayStatus = (value) => String(value || 'Unknown').replaceAll('_', ' ');

const DataImport = () => {
  const inputRefs = useRef({});
  const [selectedType, setSelectedType] = useState('residents');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const config = IMPORT_TYPES[selectedType];
  const duplicateRows = useMemo(() => {
    if (!preview) return 0;
    if (preview.duplicateRows !== undefined) return Number(preview.duplicateRows || 0);
    return (preview.rows || []).filter((row) => /duplicate|already exists/i.test(row.validationMessage || '')).length;
  }, [preview]);

  const clearMessages = () => {
    setError('');
    setNotice('');
  };

  const switchType = (type) => {
    setSelectedType(type);
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setShowHistory(false);
    setHistory([]);
    setConfirmOpen(false);
    clearMessages();
  };

  const downloadTemplate = async (type) => {
    const selected = IMPORT_TYPES[type];
    switchType(type);
    setBusy(`${type}:template`);
    try {
      const response = await selected.downloadTemplate();
      downloadResponse(response, selected.sampleName);
      setNotice(`${selected.title} sample downloaded. Replace the example rows but keep every heading unchanged.`);
    } catch (requestError) {
      setError(await messageFromError(requestError, 'Unable to download the sample Excel file.'));
    } finally {
      setBusy('');
    }
  };

  const chooseFile = (type) => {
    switchType(type);
    inputRefs.current[type]?.click();
  };

  const previewFile = async (type, file) => {
    if (!file) return;
    const selected = IMPORT_TYPES[type];
    switchType(type);
    setSelectedFile(file);

    if (!allowedFile(file)) {
      setError('Unsupported file. Select an .xlsx, .xls, or .csv file.');
      if (inputRefs.current[type]) inputRefs.current[type].value = '';
      return;
    }
    if (file.size > selected.maxSizeMb * 1024 * 1024) {
      setError(`File must be ${selected.maxSizeMb} MB or smaller.`);
      if (inputRefs.current[type]) inputRefs.current[type].value = '';
      return;
    }

    setBusy(`${type}:preview`);
    try {
      const response = await selected.preview(file);
      setPreview(unwrap(response));
      setNotice('Validation complete. Review every count and row message before confirming.');
    } catch (requestError) {
      setError(await messageFromError(requestError, 'Unable to validate this file.'));
    } finally {
      setBusy('');
      if (inputRefs.current[type]) inputRefs.current[type].value = '';
    }
  };

  const loadHistory = async (type) => {
    const selected = IMPORT_TYPES[type];
    switchType(type);
    setBusy(`${type}:history`);
    try {
      const response = await selected.history();
      setHistory(Array.isArray(unwrap(response)) ? unwrap(response) : []);
      setShowHistory(true);
    } catch (requestError) {
      setError(await messageFromError(requestError, 'Unable to load import history.'));
    } finally {
      setBusy('');
    }
  };

  const confirmImport = async () => {
    if (!preview?.batchId) return;
    setConfirmOpen(false);
    clearMessages();
    setBusy(`${selectedType}:confirm`);
    try {
      const response = await config.confirm(preview.batchId);
      setResult(unwrap(response));
      setNotice('Import finished. Existing records were not overwritten.');
      const historyResponse = await config.history().catch(() => null);
      if (historyResponse) setHistory(Array.isArray(unwrap(historyResponse)) ? unwrap(historyResponse) : []);
    } catch (requestError) {
      setError(await messageFromError(requestError, 'Import failed. No records were saved.'));
    } finally {
      setBusy('');
    }
  };

  const downloadErrors = async (batchId) => {
    clearMessages();
    setBusy(`${selectedType}:errors:${batchId}`);
    try {
      const response = await config.errors(batchId);
      downloadResponse(response, `${selectedType}_import_errors_${batchId}.xlsx`);
      setNotice('Excel error report downloaded.');
    } catch (requestError) {
      setError(await messageFromError(requestError, 'No error report is available for this import.'));
    } finally {
      setBusy('');
    }
  };

  const importedCount = result
    ? Number(result.successfullyImported ?? result.imported ?? 0)
    : 0;
  const validRows = Number(preview?.validRows || 0);
  const hasErrors = Number(preview?.invalidRows || 0) + duplicateRows + Number(preview?.warningRows || 0) > 0;

  return (
    <div className="data-import-page">
      <div className="portal-page-title data-import-title">
        <div>
          <h1>Data Import</h1>
          <p>Securely preview and import society data from Excel or CSV files.</p>
        </div>
        <span className="data-import-admin-badge"><CheckCircle2 size={14} /> Admin only</span>
      </div>

      {error && <div className="portal-error data-import-message"><AlertCircle size={17} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
      {notice && <div className="data-import-notice data-import-message"><CheckCircle2 size={17} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}

      <section className="data-import-cards" aria-label="Import types">
        {Object.entries(IMPORT_TYPES).map(([type, item]) => {
          const Icon = item.icon;
          const active = selectedType === type;
          return (
            <article className={`data-import-card ${item.accent} ${active ? 'active' : ''}`} key={type}>
              <button type="button" className="data-import-card-main" onClick={() => switchType(type)}>
                <span className="data-import-card-icon"><Icon size={22} /></span>
                <span><strong>{item.title}</strong><small>{item.description}</small></span>
              </button>
              <div className="data-import-card-actions">
                <button type="button" className="portal-primary-btn" onClick={() => chooseFile(type)} disabled={Boolean(busy)}>
                  {busy === `${type}:preview` ? <LoaderCircle className="spin" size={15} /> : <Upload size={15} />}
                  {busy === `${type}:preview` ? 'Validating...' : 'Import Excel'}
                </button>
                <button type="button" className="portal-light-btn" onClick={() => downloadTemplate(type)} disabled={Boolean(busy)}>
                  {busy === `${type}:template` ? <LoaderCircle className="spin" size={15} /> : <Download size={15} />}
                  Download Sample Excel
                </button>
                <button type="button" className="data-import-link-btn" onClick={() => loadHistory(type)} disabled={Boolean(busy)}>
                  {busy === `${type}:history` ? <LoaderCircle className="spin" size={15} /> : <History size={15} />}
                  Import History
                </button>
                <input
                  ref={(node) => { inputRefs.current[type] = node; }}
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  hidden
                  onChange={(event) => previewFile(type, event.target.files?.[0])}
                />
              </div>
            </article>
          );
        })}
      </section>

      {!preview && !showHistory && !result && (
        <section className="portal-panel data-import-guide">
          <div className="data-import-guide-icon"><FileSpreadsheet size={25} /></div>
          <div>
            <h2>How to import</h2>
            <ol>
              <li>Download the sample Excel for the data you want to import.</li>
              <li>Replace the example rows with your data without changing headings.</li>
              <li>Choose the file, review the preview and row-wise messages, then confirm.</li>
            </ol>
            <p>Supported files: .xlsx, .xls and .csv. Records already in the system are skipped and never overwritten.</p>
          </div>
        </section>
      )}

      {preview && (
        <section className="portal-panel data-import-workspace">
          <div className="portal-panel-head data-import-workspace-head">
            <div>
              <h2>{config.title} preview</h2>
              <p>{selectedFile?.name || 'Selected spreadsheet'} · Batch #{preview.batchId}</p>
            </div>
            <button type="button" className="portal-light-btn" onClick={() => chooseFile(selectedType)} disabled={Boolean(busy)}>
              <RefreshCw size={14} /> Choose another file
            </button>
          </div>

          <div className="data-import-summary">
            <div><span>Total rows</span><strong>{Number(preview.totalRows || 0)}</strong></div>
            <div className="success"><span>Valid rows</span><strong>{validRows}</strong></div>
            <div className="error"><span>Invalid rows</span><strong>{Number(preview.invalidRows || 0)}</strong></div>
            <div className="warning"><span>Duplicate rows</span><strong>{duplicateRows}</strong></div>
            {selectedType === 'maintenance' && <div className="warning"><span>Warning rows</span><strong>{Number(preview.warningRows || 0)}</strong></div>}
          </div>

          <div className="data-import-preview-actions">
            <p><AlertCircle size={15} /> Only rows marked Valid will be saved. Review row messages before continuing.</p>
            <div>
              {hasErrors && (
                <button type="button" className="portal-light-btn" onClick={() => downloadErrors(preview.batchId)} disabled={Boolean(busy)}>
                  {busy.includes(':errors:') ? <LoaderCircle className="spin" size={14} /> : <Download size={14} />} Error report
                </button>
              )}
              <button type="button" className="portal-primary-btn" onClick={() => setConfirmOpen(true)} disabled={!validRows || Boolean(busy) || Boolean(result)}>
                <CheckCircle2 size={15} /> Confirm {validRows} valid {validRows === 1 ? 'row' : 'rows'}
              </button>
            </div>
          </div>

          <PreviewTable type={selectedType} rows={preview.rows || []} />
        </section>
      )}

      {result && (
        <section className="portal-panel data-import-result">
          <div className="data-import-result-icon"><CheckCircle2 size={25} /></div>
          <div className="data-import-result-copy">
            <h2>Import result</h2>
            <p>The confirmed batch has finished processing.</p>
          </div>
          <div className="data-import-result-counts">
            <span><strong>{importedCount}</strong> Successfully imported</span>
            <span><strong>{Number(result.skipped || 0)}</strong> Skipped</span>
            <span><strong>{Number(result.failed || 0)}</strong> Failed</span>
          </div>
          <button type="button" className="portal-light-btn" onClick={() => loadHistory(selectedType)}><History size={14} /> View history</button>
        </section>
      )}

      {showHistory && (
        <HistoryTable
          type={selectedType}
          title={config.title}
          rows={history}
          busy={busy}
          onDownloadErrors={downloadErrors}
          onClose={() => setShowHistory(false)}
        />
      )}

      {confirmOpen && (
        <div className="portal-modal-backdrop" onMouseDown={() => setConfirmOpen(false)}>
          <div className="portal-modal data-import-confirm" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confirm-import-title">
            <div className="portal-modal-head">
              <div><h3 id="confirm-import-title">Confirm data import</h3><p>This action will save the valid staged rows.</p></div>
              <button type="button" onClick={() => setConfirmOpen(false)} aria-label="Close"><X size={17} /></button>
            </div>
            <div className="data-import-confirm-body">
              <div className="data-import-confirm-count"><strong>{validRows}</strong><span>valid rows ready to import</span></div>
              <p>Invalid, warning, duplicate, and existing records will be skipped. Existing residents or transactions will not be overwritten.</p>
            </div>
            <div className="data-import-confirm-actions">
              <button type="button" className="portal-light-btn" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button type="button" className="portal-primary-btn" onClick={confirmImport}><CheckCircle2 size={15} /> Confirm import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PreviewTable = ({ type, rows }) => {
  const visibleRows = rows.slice(0, 200);
  return (
    <div className="data-import-table-block">
      <div className="data-import-table-label">
        <strong>Row validation</strong>
        <span>Showing {visibleRows.length} of {rows.length} rows</span>
      </div>
      <div className="portal-table-wrap data-import-table-wrap">
        <table className="portal-data-table data-import-table">
          <thead>
            <tr>
              <th>Row</th>
              {type === 'residents' ? <><th>Flat</th><th>Resident</th><th>Email</th><th>Mobile</th><th>Flat type</th><th>Ownership</th><th>Occupancy</th></> : <><th>Resident</th><th>Wing / Flat</th><th>Date</th><th>Mode</th><th>Amount</th><th>Status</th><th>Action</th></>}
              <th>Validation</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={`${row.rowNumber}-${index}`}>
                <td>{row.rowNumber}</td>
                {type === 'residents' ? <><td><strong>{row.flatNumber || '—'}</strong></td><td>{row.residentName || '—'}</td><td>{row.email || '—'}</td><td>{row.mobileNumber || '—'}</td><td>{row.flatType || '—'}</td><td>{row.ownershipType || '—'}</td><td>{row.occupancyStatus || '—'}</td></> : <><td>{row.memberName || '—'}</td><td>{[row.wing, row.flatNumber].filter(Boolean).join(' / ') || '—'}</td><td>{row.transactionDate || '—'}</td><td>{row.paymentMode || '—'}</td><td>{row.amount ?? '—'}</td><td>{row.status || '—'}</td><td>{row.importAction || '—'}</td></>}
                <td><span className={`data-import-status ${resultTone(row.validationResult)}`}>{displayStatus(row.validationResult)}</span></td>
                <td className="data-import-message-cell">{row.validationMessage || 'Ready to import'}</td>
              </tr>
            ))}
            {!visibleRows.length && <tr><td colSpan={11} className="data-import-empty">No preview rows returned.</td></tr>}
          </tbody>
        </table>
      </div>
      {rows.length > visibleRows.length && <p className="data-import-table-note">Only the first 200 rows are shown here. All rows remain part of the server-side import batch.</p>}
    </div>
  );
};

const HistoryTable = ({ type, title, rows, busy, onDownloadErrors, onClose }) => (
  <section className="portal-panel data-import-history">
    <div className="portal-panel-head data-import-workspace-head">
      <div><h2>{title} history</h2><p>Latest 100 import batches for this society.</p></div>
      <button type="button" className="portal-light-btn" onClick={onClose}><X size={14} /> Close</button>
    </div>
    <div className="portal-table-wrap data-import-table-wrap">
      <table className="portal-data-table data-import-table">
        <thead><tr><th>File name</th><th>Uploaded by</th><th>Date and time</th><th>Total</th><th>Imported</th><th>Skipped</th><th>Failed</th><th>Status</th><th>Error report</th></tr></thead>
        <tbody>
          {rows.map((row) => {
            const skipped = Number(row.skipped ?? Math.max(0, Number(row.totalRows || 0) - Number(row.imported || 0) - Number(row.failed || 0)));
            const hasReport = type === 'residents'
              ? Number(row.invalidRows || 0) + Number(row.duplicateRows || 0) > 0
              : skipped + Number(row.failed || 0) > 0;
            return (
              <tr key={row.id}>
                <td><strong>{row.fileName || 'Spreadsheet'}</strong><small className="data-import-batch">Batch #{row.id}</small></td>
                <td>{row.uploadedBy || 'Admin'}</td>
                <td>{row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN') : '—'}</td>
                <td>{Number(row.totalRows || 0)}</td><td>{Number(row.imported || 0)}</td><td>{skipped}</td><td>{Number(row.failed || 0)}</td>
                <td><span className={`data-import-status ${resultTone(row.status)}`}>{displayStatus(row.status)}</span></td>
                <td>{hasReport ? <button type="button" className="data-import-icon-btn" onClick={() => onDownloadErrors(row.id)} disabled={Boolean(busy)} aria-label={`Download error report for batch ${row.id}`}><Download size={15} /> Download</button> : <span className="data-import-no-report">No errors</span>}</td>
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={9} className="data-import-empty">No import history is available yet.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>
);

export default DataImport;
