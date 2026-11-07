import { buildDealPdf } from "./buildDealPdf";
import { pdfFileName, type DealPdfInput } from "./content";

export async function downloadDealPdf(input: DealPdfInput): Promise<void> {
  const bytes = await buildDealPdf(input);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = pdfFileName(input.label, input.date);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
