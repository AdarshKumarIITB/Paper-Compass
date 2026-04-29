// Client-side PDF validation. Backend re-validates with magic-byte sniffing.
// Returns null if OK, or a user-facing error message.

export const MAX_PDF_BYTES = 25 * 1024 * 1024; // keep in sync with backend
export const MAX_PDF_MB = MAX_PDF_BYTES / (1024 * 1024);

export function validatePdfFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  if (file.type && file.type !== "application/pdf" && !lower.endsWith(".pdf")) {
    return "That doesn't look like a PDF. Please upload a .pdf file.";
  }
  if (file.size === 0) {
    return "The selected file is empty.";
  }
  if (file.size > MAX_PDF_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `File is too large (${mb} MB). Maximum is ${MAX_PDF_MB} MB.`;
  }
  return null;
}
