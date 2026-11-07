import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { VerdictLevel } from "../model/verdict";
import { dealPdfContent, pdfSafe, type DealPdfInput } from "./content";

const PAGE = { width: 612, height: 792 };
const MARGIN = 48;
const WIDTH = PAGE.width - MARGIN * 2;

const INK = rgb(0x16 / 255, 0x21 / 255, 0x2b / 255);
const MUTED = rgb(0x62 / 255, 0x70 / 255, 0x7c / 255);
const LINE = rgb(0xd8 / 255, 0xde / 255, 0xe4 / 255);
const ACCENT = rgb(0x0e / 255, 0x7c / 255, 0x86 / 255);

const TONE: Record<VerdictLevel, { strong: ReturnType<typeof rgb>; soft: ReturnType<typeof rgb> }> = {
  match: { strong: rgb(0x2f / 255, 0x8a / 255, 0x57 / 255), soft: rgb(0xdd / 255, 0xf1 / 255, 0xe4 / 255) },
  ask: { strong: rgb(0xb9 / 255, 0x77 / 255, 0x1a / 255), soft: rgb(0xfb / 255, 0xeb / 255, 0xd2 / 255) },
  large: { strong: rgb(0xb5 / 255, 0x44 / 255, 0x3b / 255), soft: rgb(0xf7 / 255, 0xde / 255, 0xdc / 255) },
};

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of pdfSafe(text).split(" ")) {
    const attempt = line === "" ? word : `${line} ${word}`;
    if (line !== "" && font.widthOfTextAtSize(attempt, size) > width) {
      lines.push(line);
      line = word;
    } else {
      line = attempt;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

export async function buildDealPdf(input: DealPdfInput): Promise<Uint8Array> {
  const content = dealPdfContent(input);
  const doc = await PDFDocument.create();
  const when = new Date(`${input.date}T12:00:00Z`);
  doc.setTitle(pdfSafe(`TradePoint deal check: ${content.label}`));
  doc.setProducer("TradePoint");
  doc.setCreator("TradePoint");
  doc.setCreationDate(when);
  doc.setModificationDate(when);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN;

  const text = (value: string, x: number, size: number, font: PDFFont, color = INK) =>
    page.drawText(pdfSafe(value), { x, y, size, font, color });

  const right = (value: string, size: number, font: PDFFont, color = INK, edge = MARGIN + WIDTH) =>
    page.drawText(pdfSafe(value), { x: edge - font.widthOfTextAtSize(pdfSafe(value), size), y, size, font, color });

  const paragraph = (value: string, size: number, font: PDFFont, color = INK, lead = size * 1.35, width = WIDTH, x = MARGIN) => {
    for (const line of wrap(value, font, size, width)) {
      text(line, x, size, font, color);
      y -= lead;
    }
  };

  y -= 10;
  text(content.brand.toUpperCase(), MARGIN, 10, bold, ACCENT);
  right(content.dateLine, 10, regular, MUTED);
  y -= 26;
  paragraph(content.label, 20, bold, INK, 24);
  y -= 6;

  const tone = TONE[content.level];
  const subtitleLines = wrap(content.subtitle, regular, 11, WIDTH - 32);
  const boxHeight = 20 + 34 + subtitleLines.length * 15 + 6;
  page.drawRectangle({ x: MARGIN, y: y - boxHeight + 8, width: WIDTH, height: boxHeight, color: tone.soft });
  y -= 20;
  text(content.headline, MARGIN + 16, 28, bold, tone.strong);
  y -= 26;
  for (const line of subtitleLines) {
    text(line, MARGIN + 16, 11, regular, INK);
    y -= 15;
  }
  y -= 22;

  for (const line of content.quoteLines) paragraph(line, 10.5, regular, MUTED, 14);
  y -= 14;

  const heading = (value: string) => {
    text(value.toUpperCase(), MARGIN, 9, bold, MUTED);
    y -= 16;
  };

  if (content.gaps.length > 0) {
    heading("Gaps");
    for (const gap of content.gaps) {
      const detail = wrap(gap.detail, regular, 9.5, WIDTH - 110);
      const rowHeight = 14 + detail.length * 12;
      page.drawRectangle({ x: MARGIN, y: y - rowHeight + 11, width: 4, height: rowHeight, color: TONE[gap.level].strong });
      text(gap.title, MARGIN + 14, 11.5, bold);
      right(gap.amount, 15, bold, TONE[gap.level].strong);
      y -= 14;
      for (const line of detail) {
        text(line, MARGIN + 14, 9.5, regular, MUTED);
        y -= 12;
      }
      y -= 10;
    }
    y -= 6;
  }

  heading("What this deal actually is");
  content.breakdown.forEach((row, i) => {
    const last = i === content.breakdown.length - 1;
    if (last) {
      page.drawLine({ start: { x: MARGIN, y: y + 12 }, end: { x: MARGIN + WIDTH, y: y + 12 }, thickness: 0.75, color: LINE });
    }
    text(row.label, MARGIN, 11, last ? bold : regular, last ? INK : MUTED);
    right(row.value, 11, last ? bold : regular);
    y -= 19;
  });
  y -= 14;

  heading("Ask for");
  for (const item of content.askFor) {
    page.drawCircle({ x: MARGIN + 4, y: y + 3.5, size: 2, color: ACCENT });
    text(item, MARGIN + 16, 11, regular);
    y -= 17;
  }

  const footer = wrap(content.notAdvice, regular, 8.5, WIDTH);
  y = MARGIN + footer.length * 11;
  page.drawLine({ start: { x: MARGIN, y: y + 10 }, end: { x: MARGIN + WIDTH, y: y + 10 }, thickness: 0.5, color: LINE });
  for (const line of footer) {
    text(line, MARGIN, 8.5, regular, MUTED);
    y -= 11;
  }

  return doc.save();
}
