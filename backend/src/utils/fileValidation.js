/**
 * Server-side integrity checks for uploaded reports/images.
 *
 * The frontend already limits file type and size, but that only happens in
 * the browser and can be bypassed by calling the API directly. This module
 * re-verifies, on the server, that an uploaded file:
 *   1. is a well-formed base64 data URL that actually decodes,
 *   2. is non-empty and under the size cap,
 *   3. is one of the allowed types, and
 *   4. really IS that type - by checking the file's leading "magic bytes"
 *      rather than trusting the label the browser attached to it.
 *
 * NOTE: this confirms the file is a genuine, uncorrupted JPG/PNG/WEBP/PDF.
 * It does not (and cannot) confirm the file's *content* is a legitimate
 * medical document - see reportAnalysisService.js for the text cross-check.
 */

const MAX_REPORT_SIZE_BYTES = 5 * 1024 * 1024; // mirrors the 5MB frontend cap

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function decodeDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") return null;

  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match) return null;

  const [, mime, base64Data] = match;
  const buffer = Buffer.from(base64Data, "base64");
  return { mime, buffer };
}

function matchesSignature(buffer, mime) {
  switch (mime) {
    case "image/jpeg":
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    case "image/png":
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );

    case "image/webp":
      return (
        buffer.length >= 12 &&
        buffer.slice(0, 4).toString("ascii") === "RIFF" &&
        buffer.slice(8, 12).toString("ascii") === "WEBP"
      );

    case "application/pdf":
      // PDFs start with "%PDF-" (some producers put a few junk bytes first,
      // so allow it anywhere in the first 1024 bytes)
      return buffer.slice(0, 1024).toString("latin1").includes("%PDF-");

    default:
      return false;
  }
}

/**
 * @param {{ dataUrl?: string, fileType?: string }} report
 * @returns {{ valid: true, mime: string, buffer: Buffer } | { valid: false, reason: string }}
 */
function validateReportFile(report) {
  if (!report || typeof report.dataUrl !== "string" || report.dataUrl.trim() === "") {
    return { valid: false, reason: "no file data was received" };
  }

  const decoded = decodeDataUrl(report.dataUrl);
  if (!decoded) {
    return { valid: false, reason: "file data is not a valid base64 upload" };
  }

  const { mime, buffer } = decoded;

  if (buffer.length === 0) {
    return { valid: false, reason: "the file is empty" };
  }
  if (buffer.length > MAX_REPORT_SIZE_BYTES) {
    return {
      valid: false,
      reason: `the file is larger than the ${MAX_REPORT_SIZE_BYTES / (1024 * 1024)}MB limit`,
    };
  }
  if (!ALLOWED_TYPES.includes(mime)) {
    return { valid: false, reason: `unsupported file type (${mime})` };
  }
  if (!matchesSignature(buffer, mime)) {
    return {
      valid: false,
      reason: "the file content does not match its declared type (it may be corrupted or renamed)",
    };
  }

  return { valid: true, mime, buffer };
}

module.exports = { validateReportFile, MAX_REPORT_SIZE_BYTES, ALLOWED_TYPES };
