import { isNativeApp, isShareCancel } from "../native/platform";
import { sharePdfNatively } from "../native/share";
import { buildDealPdf } from "./buildDealPdf";
import { pdfFileName, type DealPdfInput } from "./content";

export type PdfOutcome = "downloaded" | "shared" | "cancelled";

export async function downloadDealPdf(input: DealPdfInput): Promise<PdfOutcome> {
  const bytes = await buildDealPdf(input);
  const fileName = pdfFileName(input.label, input.date);
  if (isNativeApp()) {
    try {
      await sharePdfNatively(bytes, fileName, "TradePoint deal check");
      return "shared";
    } catch (error) {
      if (isShareCancel(error)) return "cancelled";
      throw error;
    }
  }
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded";
}
