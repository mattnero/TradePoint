import { PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { buildDealPdf } from "../src/pdf/buildDealPdf";
import { dealPdfContent, pdfFileName, pdfSafe, type DealPdfInput } from "../src/pdf/content";
import type { DealQuote } from "../src/model/deal";
import { cents } from "../src/model/money";
import { headline, verdict } from "../src/model/verdict";
import { askFor, gapRows, subtitle } from "../src/model/verdictCopy";

const quote: DealQuote = {
  payment: cents(45000),
  frequency: "monthly",
  termMonths: 84,
  apr: 0.0799,
  downPayment: cents(300000),
  tradeAllowance: cents(800000),
  tradePayoff: cents(500000),
  province: "ON",
  advertisedPrice: cents(2999500),
};
const benchmarks = { preApprovalApr: 0.0599, outsideTradeOffer: cents(920000) };

const input: DealPdfInput = { label: "Honda of Oakville", quote, benchmarks, date: "2026-11-07" };

async function pdfText(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes);
  const chunks: string[] = [];
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    const decoded = new TextDecoder("latin1").decode(decodePDFRawStream(object).decode());
    for (const m of decoded.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
      const hex = m[1]!;
      let line = "";
      for (let i = 0; i < hex.length; i += 2) line += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
      chunks.push(line);
    }
  }
  return chunks.join(" ").replace(/\s+/g, " ");
}

describe("pdfSafe", () => {
  it("swaps characters the standard fonts cannot draw", () => {
    expect(pdfSafe("−$900")).toBe("-$900");
    expect(pdfSafe("a b c")).toBe("a b c");
    expect(pdfSafe("café")).toBe("café");
    expect(pdfSafe("✓ ok")).toBe("? ok");
  });
});

describe("pdfFileName", () => {
  it("uses the label and the date", () => {
    expect(pdfFileName("Honda of Oakville", "2026-11-07")).toBe("TradePoint-Honda-of-Oakville-2026-11-07.pdf");
  });

  it("cleans awkward labels and falls back without one", () => {
    expect(pdfFileName("  A/B: Motors & Sons!! ", "2026-11-07")).toBe("TradePoint-A-B-Motors-Sons-2026-11-07.pdf");
    expect(pdfFileName(undefined, "2026-11-07")).toBe("TradePoint-deal-check-2026-11-07.pdf");
    expect(pdfFileName("???", "2026-11-07")).toBe("TradePoint-deal-check-2026-11-07.pdf");
  });
});

describe("dealPdfContent", () => {
  const content = dealPdfContent(input);
  const v = verdict(quote, benchmarks);

  it("carries the same headline, subtitle, gap rows and ask-for list as the Verdict screen", () => {
    expect(content.headline).toBe(headline(v.level));
    expect(content.level).toBe(v.level);
    expect(content.subtitle).toBe(subtitle(v));
    expect(content.gaps).toEqual(gapRows(quote, benchmarks, v));
    expect(content.askFor).toEqual(askFor(quote, v));
  });

  it("breaks the worked example down to the same dollars", () => {
    expect(content.breakdown).toEqual([
      { label: "Amount financed", value: "$28,881" },
      { label: "Down + net trade equity", value: "$6,000" },
      { label: "Implied all-in price", value: "$34,881" },
      { label: "Total interest", value: "$8,919" },
      { label: "Total you pay over the term", value: "$43,800" },
    ]);
    expect(content.gaps.find((g) => g.kind === "price")?.amount).toBe("+$1,877");
  });

  it("describes the quote and the benchmarks used", () => {
    expect(content.quoteLines).toEqual([
      "$450 monthly for 84 months at 7.99% APR",
      "Down payment $3,000. Trade-in value $8,000, with $5,000 still owing on it.",
      "Advertised price $29,995.",
      "Benchmarks used: 5.99% pre-approval, $9,200 outside trade offer.",
    ]);
  });

  it("leaves out what was not entered", () => {
    const { advertisedPrice: _, ...plain } = quote;
    const bare = dealPdfContent({ quote: { ...plain, tradeAllowance: cents(0), tradePayoff: cents(0) }, benchmarks: {}, date: "2026-11-07" });
    expect(bare.quoteLines).toEqual(["$450 monthly for 84 months at 7.99% APR", "Down payment $3,000."]);
    expect(bare.label).toBe("Dealer quote");
  });

  it("dates the page and says it is not advice", () => {
    expect(content.dateLine).toBe("Prepared Nov 7, 2026");
    expect(content.notAdvice).toContain("isn't financial, legal or tax advice");
  });

  it("never includes a walk-away number", () => {
    expect(JSON.stringify(content).toLowerCase()).not.toContain("walk-away");
  });
});

describe("buildDealPdf", () => {
  it("makes a one-page PDF", async () => {
    const bytes = await buildDealPdf(input);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe("TradePoint deal check: Honda of Oakville");
  });

  it("prints the same numbers and wording as the Verdict screen", async () => {
    const text = await pdfText(await buildDealPdf(input));
    const content = dealPdfContent(input);
    expect(text).toContain(content.headline);
    expect(text).toContain(content.subtitle);
    for (const g of content.gaps) {
      expect(text).toContain(g.title);
      expect(text).toContain(g.amount.replace("−", "-"));
    }
    for (const row of content.breakdown) {
      expect(text).toContain(row.label);
      expect(text).toContain(row.value);
    }
    for (const chip of content.askFor) expect(text).toContain(chip);
    for (const line of content.quoteLines) expect(text).toContain(line);
    expect(text).toContain(content.notAdvice);
    expect(text).toContain("Prepared Nov 7, 2026");
    expect(text).toContain("Honda of Oakville");
    for (const figure of ["$28,881", "$34,881", "+$1,877", "$8,919", "$43,800"]) expect(text).toContain(figure);
  });

  it("still fits one page with a long label and every row", async () => {
    const bytes = await buildDealPdf({ ...input, label: "X".repeat(40) });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("draws a label with characters the standard font cannot, without throwing", async () => {
    const bytes = await buildDealPdf({ ...input, label: "Café ✓ Motors" });
    expect(await pdfText(bytes)).toContain("Café ? Motors");
  });
});
