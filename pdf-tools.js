const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');

/**
 * Merge multiple PDF files into a single PDF.
 * @param {string[]} inputPaths - Paths to PDF files.
 * @param {string} [outputPath] - Optional path to save the merged PDF.
 * @returns {Promise<Uint8Array>} The merged PDF bytes.
 */
async function mergePDFs(inputPaths, outputPath) {
  const mergedPdf = await PDFDocument.create();
  for (const p of inputPaths) {
    const bytes = await fs.readFile(p);
    const pdf = await PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }
  const mergedBytes = await mergedPdf.save();
  if (outputPath) {
    await fs.writeFile(outputPath, mergedBytes);
  }
  return mergedBytes;
}

/**
 * Extract text content from a PDF file.
 * @param {string|Buffer} file - Path or buffer of the PDF to parse.
 * @returns {Promise<string>} Extracted text.
 */
async function extractText(file) {
  const data = Buffer.isBuffer(file) ? file : await fs.readFile(file);
  const result = await pdfParse(data);
  return result.text;
}

module.exports = {
  mergePDFs,
  extractText,
};
