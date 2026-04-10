/**
 * Document Conversion Route
 * 
 * Converts office documents (PPT, DOCX, XLSX) to PDF using LibreOffice headless.
 * Returns the converted PDF as base64 for the frontend to render via pdf2img.
 * 
 * POST /api/convert
 * Body: { base64: string, filename: string }
 * Response: { success: true, pdfBase64: string, pageCount: number }
 */

import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = Router();

// Supported file extensions for conversion
const SUPPORTED_EXTENSIONS = new Set([
  '.pptx', '.ppt',     // PowerPoint
  '.docx', '.doc',     // Word
  '.xlsx', '.xls',     // Excel
  '.odt', '.ods', '.odp', // OpenDocument
  '.rtf',              // Rich Text
]);

/**
 * POST /api/convert
 * Convert an office document to PDF using LibreOffice
 */
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  let tmpDir: string | null = null;

  try {
    const { base64, filename } = req.body;

    if (!base64 || !filename) {
      return res.status(400).json({ error: 'Missing base64 or filename' });
    }

    // Validate file extension
    const ext = path.extname(filename).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      return res.status(400).json({ 
        error: `Unsupported file type: ${ext}. Supported: ${[...SUPPORTED_EXTENSIONS].join(', ')}` 
      });
    }

    // Create temp directory for this conversion
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mouva-convert-'));
    const inputPath = path.join(tmpDir, `input${ext}`);
    const outputPdfPath = path.join(tmpDir, 'input.pdf');

    // Write input file
    const fileBuffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(inputPath, fileBuffer);

    console.log(`[Convert] Starting conversion: ${filename} (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB)`);

    // Run LibreOffice headless conversion
    // --outdir specifies output directory, output file will be named input.pdf
    try {
      execSync(
        `soffice --headless --norestore --convert-to pdf --outdir "${tmpDir}" "${inputPath}"`,
        { 
          timeout: 60000, // 60s timeout
          stdio: 'pipe',
          env: {
            ...process.env,
            HOME: tmpDir, // Prevent LibreOffice profile conflicts in parallel requests
          },
        }
      );
    } catch (cmdError: any) {
      console.error('[Convert] LibreOffice error:', cmdError.stderr?.toString() || cmdError.message);
      return res.status(500).json({ error: 'Document conversion failed. Is LibreOffice installed?' });
    }

    // Check if output PDF was created
    if (!fs.existsSync(outputPdfPath)) {
      return res.status(500).json({ error: 'Conversion produced no output file' });
    }

    // Read the PDF and convert to base64
    const pdfBuffer = fs.readFileSync(outputPdfPath);
    const pdfBase64 = pdfBuffer.toString('base64');

    const elapsed = Date.now() - startTime;
    console.log(`[Convert] ✅ Converted ${filename} → PDF (${(pdfBuffer.length / 1024 / 1024).toFixed(1)}MB) in ${elapsed}ms`);

    return res.json({
      success: true,
      pdfBase64,
      filename: filename.replace(/\.[^.]+$/, '.pdf'),
    });

  } catch (error: any) {
    console.error('[Convert] Error:', error.message);
    return res.status(500).json({ error: error.message || 'Conversion failed' });
  } finally {
    // Clean up temp files
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch { /* ignore cleanup errors */ }
    }
  }
});

/**
 * GET /api/convert/status
 * Check if LibreOffice is available on the server
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const version = execSync('soffice --version', { timeout: 5000, stdio: 'pipe' }).toString().trim();
    return res.json({ 
      available: true, 
      version,
      supportedFormats: [...SUPPORTED_EXTENSIONS],
    });
  } catch {
    return res.json({ 
      available: false, 
      error: 'LibreOffice not installed',
      supportedFormats: [...SUPPORTED_EXTENSIONS],
    });
  }
});

export default router;
