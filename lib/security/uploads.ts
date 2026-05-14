export const MAX_REQUEST_UPLOAD_FILES = 8;
export const MAX_REQUEST_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_REQUEST_UPLOAD_TOTAL_BYTES = 160 * 1024 * 1024;

const ALLOWED_REQUEST_UPLOAD_EXTENSIONS = new Set([
  "3mf",
  "bmp",
  "csv",
  "doc",
  "docx",
  "dxf",
  "gif",
  "iges",
  "igs",
  "jpeg",
  "jpg",
  "pdf",
  "png",
  "step",
  "stl",
  "stp",
  "txt",
  "webp",
  "xls",
  "xlsx",
  "zip",
]);

const ALLOWED_REQUEST_UPLOAD_TYPES = new Set([
  "application/msword",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "model/stl",
  "text/csv",
  "text/plain",
]);

export function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.trim().toLowerCase() ?? "";
}

export function validateRequestUploadFile(file: File) {
  if (file.size > MAX_REQUEST_UPLOAD_BYTES) {
    return `File ${file.name || "upload"} is too large. Maximum size is 50 MB.`;
  }

  const extension = getFileExtension(file.name || "");
  if (!extension || !ALLOWED_REQUEST_UPLOAD_EXTENSIONS.has(extension)) {
    return `File ${file.name || "upload"} has an unsupported file extension.`;
  }

  const normalizedType = (file.type || "").toLowerCase();
  if (normalizedType && !ALLOWED_REQUEST_UPLOAD_TYPES.has(normalizedType)) {
    return `File ${file.name || "upload"} has an unsupported content type.`;
  }

  return null;
}
