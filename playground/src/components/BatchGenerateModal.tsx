/**
 * Batch Generate Modal
 * Shows data preview, field mapping, and batch generation options
 */
import { useState, useMemo } from 'react';
import { SpreadsheetData, autoMapFields } from '../utils/parseSpreadsheet';
import './BatchGenerateModal.css';

interface BatchGenerateModalProps {
  isOpen: boolean;
  spreadsheetData: SpreadsheetData | null;
  templateFields: string[];
  onClose: () => void;
  onGenerate: (
    data: SpreadsheetData,
    fieldMapping: Record<string, string>,
    mode: 'merge' | 'zip'
  ) => void;
  isGenerating: boolean;
  progress: number; // 0-100
}

export default function BatchGenerateModal({
  isOpen,
  spreadsheetData,
  templateFields,
  onClose,
  onGenerate,
  isGenerating,
  progress,
}: BatchGenerateModalProps) {
  const [outputMode, setOutputMode] = useState<'merge' | 'zip'>('merge');
  
  // Auto-generate field mapping
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>(() => {
    if (spreadsheetData) {
      return autoMapFields(spreadsheetData.headers, templateFields);
    }
    return {};
  });

  // Update mapping when data changes
  useMemo(() => {
    if (spreadsheetData) {
      setFieldMapping(autoMapFields(spreadsheetData.headers, templateFields));
    }
  }, [spreadsheetData, templateFields]);

  if (!isOpen || !spreadsheetData) return null;

  const previewRows = spreadsheetData.rows.slice(0, 5);
  const mappedFields = Object.keys(fieldMapping).filter(k => fieldMapping[k]);

  const handleMappingChange = (templateField: string, spreadsheetColumn: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [templateField]: spreadsheetColumn,
    }));
  };

  const handleGenerate = () => {
    onGenerate(spreadsheetData, fieldMapping, outputMode);
  };

  return (
    <div className="batch-modal-overlay" onClick={onClose}>
      <div className="batch-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="batch-modal-header">
          <div className="batch-modal-title">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125" />
            </svg>
            批量生成
          </div>
          <button className="batch-modal-close" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="batch-modal-content">
          {/* File Info */}
          <div className="batch-file-info">
            <span className="batch-file-name">📊 {spreadsheetData.fileName}</span>
            <span className="batch-file-stats">
              {spreadsheetData.totalRows} 条数据 · {spreadsheetData.headers.length} 列
            </span>
          </div>

          {/* Data Preview */}
          <div className="batch-section">
            <h4>数据预览（前5行）</h4>
            <div className="batch-preview-table-wrapper">
              <table className="batch-preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {spreadsheetData.headers.map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="row-num">{idx + 1}</td>
                      {spreadsheetData.headers.map(h => (
                        <td key={h}>{row[h] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Field Mapping */}
          <div className="batch-section">
            <h4>字段映射</h4>
            <p className="batch-section-desc">将 Excel 列映射到模版字段</p>
            <div className="batch-mapping-grid">
              {templateFields.map(field => (
                <div key={field} className="batch-mapping-row">
                  <span className="batch-template-field">{field}</span>
                  <span className="batch-mapping-arrow">←</span>
                  <select
                    value={fieldMapping[field] || ''}
                    onChange={e => handleMappingChange(field, e.target.value)}
                    className="batch-mapping-select"
                  >
                    <option value="">（不映射）</option>
                    {spreadsheetData.headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {mappedFields.length === 0 && (
              <p className="batch-mapping-warning">⚠️ 未映射任何字段，请手动选择</p>
            )}
          </div>

          {/* Output Mode */}
          <div className="batch-section">
            <h4>输出模式</h4>
            <div className="batch-output-options">
              <label className={`batch-output-option ${outputMode === 'merge' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="outputMode"
                  value="merge"
                  checked={outputMode === 'merge'}
                  onChange={() => setOutputMode('merge')}
                />
                <span className="option-icon">📑</span>
                <span className="option-text">
                  <strong>合并 PDF</strong>
                  <small>所有数据生成到一个多页 PDF</small>
                </span>
              </label>
              <label className={`batch-output-option ${outputMode === 'zip' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="outputMode"
                  value="zip"
                  checked={outputMode === 'zip'}
                  onChange={() => setOutputMode('zip')}
                />
                <span className="option-icon">📦</span>
                <span className="option-text">
                  <strong>ZIP 打包</strong>
                  <small>每条数据生成独立 PDF，打包下载</small>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="batch-modal-footer">
          {isGenerating ? (
            <div className="batch-progress">
              <div className="batch-progress-bar">
                <div className="batch-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="batch-progress-text">生成中... {progress}%</span>
            </div>
          ) : (
            <>
              <button className="batch-btn-cancel" onClick={onClose}>取消</button>
              <button 
                className="batch-btn-generate" 
                onClick={handleGenerate}
                disabled={mappedFields.length === 0}
              >
                生成 {spreadsheetData.totalRows} 份 PDF
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
