/**
 * Excel/CSV Spreadsheet Parser
 * Parses uploaded Excel (.xlsx, .xls) or CSV files into structured data
 */
import * as XLSX from 'xlsx';

export interface SpreadsheetData {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  sheetName: string;
  totalRows: number;
}

/**
 * Parse an Excel or CSV file into structured data
 */
export async function parseSpreadsheet(file: File): Promise<SpreadsheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        // Parse workbook
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error('No sheets found in workbook'));
          return;
        }
        
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON (first row as headers)
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          header: 1, // Array of arrays
          defval: '', // Default empty string for empty cells
        }) as any[][];

        if (jsonData.length === 0) {
          reject(new Error('Empty spreadsheet'));
          return;
        }

        // First row is headers
        const headers = jsonData[0].map((h: any) => String(h || '').trim());
        
        // Rest are data rows
        const rows: Record<string, string>[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row: Record<string, string> = {};
          headers.forEach((header, idx) => {
            if (header) {
              row[header] = String(jsonData[i][idx] ?? '');
            }
          });
          // Skip completely empty rows
          if (Object.values(row).some(v => v.trim() !== '')) {
            rows.push(row);
          }
        }

        resolve({
          headers: headers.filter(h => h !== ''),
          rows,
          fileName: file.name,
          sheetName,
          totalRows: rows.length,
        });
      } catch (error: any) {
        reject(new Error(`Failed to parse spreadsheet: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Auto-map spreadsheet columns to template fields
 * Uses fuzzy matching on field names
 */
export function autoMapFields(
  spreadsheetHeaders: string[],
  templateFields: string[]
): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  for (const templateField of templateFields) {
    const normalizedTemplate = templateField.toLowerCase().replace(/[_\-\s]/g, '');
    
    // Try exact match first
    const exactMatch = spreadsheetHeaders.find(
      h => h.toLowerCase().replace(/[_\-\s]/g, '') === normalizedTemplate
    );
    
    if (exactMatch) {
      mapping[templateField] = exactMatch;
      continue;
    }
    
    // Try partial match
    const partialMatch = spreadsheetHeaders.find(
      h => h.toLowerCase().includes(normalizedTemplate) || 
           normalizedTemplate.includes(h.toLowerCase().replace(/[_\-\s]/g, ''))
    );
    
    if (partialMatch) {
      mapping[templateField] = partialMatch;
    }
  }
  
  return mapping;
}

/**
 * Check if a file is a spreadsheet type
 */
export function isSpreadsheetFile(file: File): boolean {
  const spreadsheetTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
    'application/csv',
  ];
  
  const spreadsheetExtensions = ['.xlsx', '.xls', '.csv'];
  const fileName = file.name.toLowerCase();
  
  return spreadsheetTypes.includes(file.type) || 
         spreadsheetExtensions.some(ext => fileName.endsWith(ext));
}
