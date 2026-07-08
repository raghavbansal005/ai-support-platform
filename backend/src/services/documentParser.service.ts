import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export type SupportedFileType = "pdf" | "docx" | "txt" | "md";

export function detectFileType(filename: string, mimeType: string): SupportedFileType | null {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  if (ext === "docx" || mimeType.includes("wordprocessingml")) return "docx";
  if (ext === "md" || ext === "markdown") return "md";
  if (ext === "txt") return "txt";
  return null;
}

export async function extractText(buffer: Buffer, fileType: SupportedFileType): Promise<string> {
  switch (fileType) {
    case "pdf": {
      const result = await pdfParse(buffer);
      return result.text;
    }
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case "txt":
    case "md":
      return buffer.toString("utf-8");
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
