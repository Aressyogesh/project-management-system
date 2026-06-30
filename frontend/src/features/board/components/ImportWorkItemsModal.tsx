import { useRef, useState } from 'react';
import { boardApi, type ImportRowResult } from '../api/boardApi';

type Step = 'upload' | 'preview' | 'done';

interface Props {
  projectId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function ImportWorkItemsModal({ projectId, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportRowResult[]>([]);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const allValid = results.length > 0 && results.every((r) => r.status === 'valid');
  const errorCount = results.filter((r) => r.status === 'error').length;

  function handleFile(f: File) {
    if (!f.name.endsWith('.xlsx')) {
      alert('Only .xlsx files are supported.');
      return;
    }
    setFile(f);
  }

  async function handleValidate() {
    if (!file) return;
    setValidating(true);
    try {
      const res = await boardApi.importWorkItems(projectId, file, true);
      setResults(res.results);
      setStep('preview');
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Validation failed. Please try again.');
    } finally {
      setValidating(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    try {
      const res = await boardApi.importWorkItems(projectId, file, false);
      setStep('done');
      onSuccess(`Successfully imported ${res.results.length} work item${res.results.length !== 1 ? 's' : ''}`);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    try {
      await boardApi.downloadImportTemplate(projectId);
    } catch {
      alert('Failed to download template.');
    } finally {
      setDownloadingTemplate(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Import Work Items</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 'upload' && 'Upload an Excel file to import USER_STORY, TASK, or SUB_TASK items'}
              {step === 'preview' && `${results.length} row${results.length !== 1 ? 's' : ''} found — ${errorCount > 0 ? `${errorCount} error${errorCount !== 1 ? 's' : ''}` : 'all valid'}`}
              {step === 'done' && 'Import complete'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Step: Upload ── */}
          {step === 'upload' && (
            <div className="flex flex-col gap-4">
              {/* Download template */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div>
                  <p className="text-xs font-medium text-blue-800">Download Sample Template</p>
                  <p className="text-[11px] text-blue-600 mt-0.5">Includes headers and 3 example rows with the correct format</p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 px-3 py-1.5 border border-blue-200 rounded-lg bg-white hover:bg-blue-50 transition disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {downloadingTemplate ? 'Downloading…' : 'Download'}
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 transition ${
                  dragging ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {file ? (
                  <p className="text-xs font-medium text-primary-700">{file.name}</p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-gray-600">Drop your .xlsx file here or click to browse</p>
                    <p className="text-[11px] text-gray-400">Max file size: 5 MB</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

              {/* Column reference */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[11px] font-semibold text-gray-500 mb-2">REQUIRED COLUMNS (in order)</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Title*', 'Work Item Type*', 'Assignee Email', 'Sprint Name', 'Priority', 'Story Points', 'Est. Hours', 'Billing Status', 'Start Date', 'Due Date', 'Parent ID', 'Labels', 'Release Milestone', 'Description'].map((col) => (
                    <span key={col} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${col.endsWith('*') ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
                      {col}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">* Required · Work Item Type: USER_STORY, TASK, SUB_TASK · Date format: YYYY-MM-DD</p>
              </div>
            </div>
          )}

          {/* ── Step: Preview ── */}
          {step === 'preview' && (
            <div className="flex flex-col gap-3">
              {/* Summary */}
              <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium ${allValid ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                {allValid ? (
                  <>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    All {results.length} rows are valid. Ready to import.
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errorCount} row{errorCount !== 1 ? 's have' : ' has'} errors. Fix them in your file and re-upload.
                  </>
                )}
              </div>

              {/* Table */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-3 py-2 text-left text-gray-500 font-medium w-10">Row</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Title</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium w-28">Type</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.row} className="border-b border-gray-50 last:border-0">
                        <td className="px-3 py-2 text-gray-400">{r.row}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-800 truncate max-w-xs">{r.title}</p>
                          {r.errors.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {r.errors.map((e, i) => (
                                <li key={i} className="text-[10px] text-red-500">• {e}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{r.type || '—'}</td>
                        <td className="px-3 py-2">
                          {r.status === 'valid' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-500 font-medium">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">Import Complete</p>
              <p className="text-xs text-gray-500 text-center">
                All work items have been created and are now visible on the board.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={() => {
              if (step === 'preview') { setStep('upload'); setResults([]); }
              else onClose();
            }}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            {step === 'preview' ? '← Re-upload' : 'Cancel'}
          </button>

          <div className="flex gap-2">
            {step === 'done' && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition"
              >
                Close
              </button>
            )}
            {step === 'upload' && (
              <button
                onClick={handleValidate}
                disabled={!file || validating}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition"
              >
                {validating ? 'Validating…' : 'Validate'}
              </button>
            )}
            {step === 'preview' && allValid && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {importing ? 'Importing…' : `Import ${results.length} Item${results.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
