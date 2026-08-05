import { createRequire } from "module";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

function resolveWorkerPath(): string | undefined {
  try {
    if (typeof import.meta.url === "undefined") return undefined;
    const require = createRequire(import.meta.url);
    return require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  } catch {
    return undefined;
  }
}

let workerReady = false;

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  if (!workerReady) {
    const workerPath = resolveWorkerPath();
    if (workerPath) {
      pdfjs.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
    }
    workerReady = true;
  }

  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ");
    parts.push(pageText);
  }
  return parts.join("\n").trim();
}
