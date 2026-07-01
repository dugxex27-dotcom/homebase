/**
 * Contractor Module Developer Reference — PDF Generator
 * Reads exports/contractor-module.md and writes exports/contractor-module.pdf
 * using PDFKit with styled sections, tables, and code blocks.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(__dirname, "../..");
const MD_PATH = path.join(WORKSPACE_ROOT, "exports", "contractor-module.md");
const OUT_PATH = path.join(WORKSPACE_ROOT, "exports", "contractor-module.pdf");
const PUBLIC_MD = path.join(WORKSPACE_ROOT, "artifacts", "myhomebase", "public", "contractor-docs.md");
const PUBLIC_PDF = path.join(WORKSPACE_ROOT, "artifacts", "myhomebase", "public", "contractor-docs.pdf");

// ─── Layout ──────────────────────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const ML = 50;
const MR = 50;
const MT = 50;
const MB = 50;
const CW = PAGE_W - ML - MR;

// ─── Colours ─────────────────────────────────────────────────────────────────
const C = {
  brand: "#1560A2",
  brandDark: "#0C3460",
  accent: "#F59E0B",
  bg: "#F8FAFC",
  codeBg: "#1E293B",
  codeText: "#CBD5E1",
  codeKeyword: "#FF7B72",
  codeString: "#A5D6FF",
  codeComment: "#8B949E",
  tableHead: "#1560A2",
  tableAlt: "#EAF4FD",
  text: "#111827",
  muted: "#6B7280",
  border: "#D1D5DB",
  h1: "#0C3460",
  h2: "#1560A2",
  h3: "#1D4ED8",
  rule: "#CBD5E1",
};

// ─── Font sizes ───────────────────────────────────────────────────────────────
const FS = {
  h1: 20,
  h2: 15,
  h3: 12,
  h4: 10,
  body: 9,
  code: 7,
  small: 7.5,
  footer: 7,
};

interface DocCtx {
  doc: typeof PDFDocument.prototype;
  pageNum: number;
}

function checkPageBreak(ctx: DocCtx, needed = 30) {
  if (ctx.doc.y + needed > PAGE_H - MB) {
    ctx.doc.addPage();
    ctx.pageNum++;
    drawPageFooter(ctx);
    ctx.doc.y = MT;
  }
}

function drawPageFooter(ctx: DocCtx) {
  const y = PAGE_H - MB + 10;
  ctx.doc
    .save()
    .moveTo(ML, y - 2)
    .lineTo(PAGE_W - MR, y - 2)
    .strokeColor(C.rule)
    .lineWidth(0.5)
    .stroke()
    .font("Helvetica")
    .fontSize(FS.footer)
    .fillColor(C.muted)
    .text("MyHomeBase™ Contractor Module — Developer Reference", ML, y, { width: CW / 2, lineBreak: false })
    .text(`Page ${ctx.pageNum}`, ML + CW / 2, y, { width: CW / 2, align: "right", lineBreak: false })
    .restore();
}

// ─── Markdown line-type classifier ───────────────────────────────────────────
type LineType =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "hr" }
  | { type: "blank" }
  | { type: "blockquote"; text: string }
  | { type: "li"; indent: number; text: string }
  | { type: "table_sep" }
  | { type: "table_row"; cells: string[] }
  | { type: "code_fence"; lang: string }
  | { type: "code_line"; text: string }
  | { type: "para"; text: string };

function classifyLine(raw: string, inCode: boolean, codeLang: string): LineType {
  if (inCode) {
    if (raw.trim() === "```") return { type: "code_fence", lang: codeLang };
    return { type: "code_line", text: raw };
  }
  if (raw.startsWith("```")) return { type: "code_fence", lang: raw.slice(3).trim() };
  if (/^#{1}\s/.test(raw)) return { type: "h1", text: raw.replace(/^#+\s*/, "") };
  if (/^#{2}\s/.test(raw)) return { type: "h2", text: raw.replace(/^#+\s*/, "") };
  if (/^#{3}\s/.test(raw)) return { type: "h3", text: raw.replace(/^#+\s*/, "") };
  if (/^#{4}\s/.test(raw)) return { type: "h4", text: raw.replace(/^#+\s*/, "") };
  if (/^---+$/.test(raw.trim())) return { type: "hr" };
  if (raw.trim() === "") return { type: "blank" };
  if (raw.startsWith("> ")) return { type: "blockquote", text: raw.slice(2) };
  if (/^\|[-: |]+\|/.test(raw)) return { type: "table_sep" };
  if (raw.trim().startsWith("|")) {
    const cells = raw.split("|").slice(1, -1).map((c) => c.trim());
    return { type: "table_row", cells };
  }
  const liMatch = raw.match(/^(\s*)([-*]|\d+\.)\s+(.*)/);
  if (liMatch) {
    return { type: "li", indent: liMatch[1].length, text: liMatch[3] };
  }
  return { type: "para", text: raw };
}

// Strip markdown inline formatting for PDF text
function stripInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/~~(.+?)~~/g, "$1");
}

// Simple inline render that bolds **text** and highlights `code`
function renderInline(doc: typeof PDFDocument.prototype, rawText: string, x: number, y: number, opts: any = {}) {
  const segments = splitInlineSegments(rawText);
  let cx = x;
  const baseFont = opts.baseFont || "Helvetica";
  const boldFont = opts.boldFont || "Helvetica-Bold";
  const codeFont = "Courier";
  const fontSize = opts.fontSize || FS.body;
  const color = opts.color || C.text;
  const maxWidth = opts.width || CW;

  for (const seg of segments) {
    if (seg.type === "bold") {
      doc.font(boldFont).fontSize(fontSize).fillColor(color);
    } else if (seg.type === "code") {
      doc.font(codeFont).fontSize(fontSize - 0.5).fillColor(C.brand);
    } else {
      doc.font(baseFont).fontSize(fontSize).fillColor(color);
    }
    const w = doc.widthOfString(seg.text);
    if (cx + w > x + maxWidth) {
      // wrap — just use regular text rendering for simplicity
      doc.text(seg.text, cx, y, { lineBreak: false, width: x + maxWidth - cx, ellipsis: true });
    } else {
      doc.text(seg.text, cx, y, { lineBreak: false });
    }
    cx += doc.widthOfString(seg.text);
  }
  return cx;
}

type InlineSeg = { type: "normal" | "bold" | "code"; text: string };

function splitInlineSegments(text: string): InlineSeg[] {
  const segs: InlineSeg[] = [];
  // Remove link brackets [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const re = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ type: "normal", text: text.slice(last, m.index) });
    if (m[0].startsWith("**")) segs.push({ type: "bold", text: m[2] });
    else segs.push({ type: "code", text: m[3] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ type: "normal", text: text.slice(last) });
  return segs;
}

// ─── Table renderer ──────────────────────────────────────────────────────────
function renderTable(ctx: DocCtx, rows: string[][]) {
  if (rows.length === 0) return;
  const { doc } = ctx;
  const colCount = rows[0].length;
  const colW = CW / colCount;
  const rowH = 16;
  const cellPad = 4;

  for (let r = 0; r < rows.length; r++) {
    checkPageBreak(ctx, rowH + 4);
    const y = doc.y;
    const isHead = r === 0;
    const isAlt = !isHead && r % 2 === 0;

    // Row background
    doc
      .save()
      .rect(ML, y, CW, rowH)
      .fill(isHead ? C.tableHead : isAlt ? C.tableAlt : "#FFFFFF")
      .restore();

    // Cell text
    for (let c = 0; c < colCount; c++) {
      const cx = ML + c * colW + cellPad;
      const cellText = stripInline(rows[r][c] || "");
      doc
        .font(isHead ? "Helvetica-Bold" : "Helvetica")
        .fontSize(FS.small)
        .fillColor(isHead ? "#FFFFFF" : C.text)
        .text(cellText, cx, y + cellPad, {
          width: colW - cellPad * 2,
          lineBreak: false,
          ellipsis: true,
        });
    }

    // Row border
    doc
      .save()
      .moveTo(ML, y + rowH)
      .lineTo(ML + CW, y + rowH)
      .strokeColor(C.border)
      .lineWidth(0.3)
      .stroke()
      .restore();

    doc.y = y + rowH;
  }
  doc.y += 8;
}

// ─── Code block renderer ─────────────────────────────────────────────────────
function renderCodeBlock(ctx: DocCtx, lines: string[], lang: string) {
  const { doc } = ctx;
  const lineH = FS.code * 1.5;
  const blockH = lines.length * lineH + 12;

  checkPageBreak(ctx, Math.min(blockH, PAGE_H - MT - MB - 20));

  const startY = doc.y;
  const visibleLines: string[] = [];
  let y = startY + 8;

  for (const line of lines) {
    if (y + lineH > PAGE_H - MB) {
      // page break mid-block
      doc
        .save()
        .rect(ML, startY, CW, y - startY + 4)
        .fill(C.codeBg)
        .restore();

      // render visible lines so far
      let ly = startY + 8;
      for (const vl of visibleLines) {
        renderCodeLine(doc, vl, ML + 8, ly);
        ly += lineH;
      }
      doc.y = y;
      doc.addPage();
      ctx.pageNum++;
      drawPageFooter(ctx);
      doc.y = MT;
      y = MT + 8;
      visibleLines.length = 0;
    }
    visibleLines.push(line);
    y += lineH;
  }

  // Draw background
  const endY = y + 4;
  doc
    .save()
    .rect(ML, startY, CW, endY - startY)
    .fill(C.codeBg)
    .restore();

  // Left accent bar
  doc
    .save()
    .rect(ML, startY, 3, endY - startY)
    .fill(C.brand)
    .restore();

  // Lang label
  if (lang) {
    doc
      .font("Helvetica")
      .fontSize(6)
      .fillColor("#94A3B8")
      .text(lang.toUpperCase(), ML + 8, startY + 2, { lineBreak: false });
  }

  // Render lines
  let ly = startY + 8;
  for (const vl of visibleLines) {
    renderCodeLine(doc, vl, ML + 8, ly);
    ly += lineH;
  }

  doc.y = endY + 8;
}

function renderCodeLine(doc: typeof PDFDocument.prototype, rawLine: string, x: number, y: number) {
  // Very basic syntax colouring: keywords, strings, comments
  const line = rawLine.replace(/\t/g, "  ");

  // Detect comment line
  if (/^\s*(\/\/|#|\/\*)/.test(line)) {
    doc.font("Courier").fontSize(FS.code).fillColor(C.codeComment)
      .text(line, x, y, { lineBreak: false, width: CW - 16, ellipsis: true });
    return;
  }

  doc.font("Courier").fontSize(FS.code).fillColor(C.codeText)
    .text(line, x, y, { lineBreak: false, width: CW - 16, ellipsis: true });
}

// ─── Cover page ──────────────────────────────────────────────────────────────
function drawCover(ctx: DocCtx) {
  const { doc } = ctx;

  // Dark header band
  doc.save().rect(0, 0, PAGE_W, 220).fill(C.brandDark).restore();

  // Brand accent stripe
  doc.save().rect(0, 220, PAGE_W, 6).fill(C.accent).restore();

  // Logo text
  doc
    .font("Helvetica-Bold")
    .fontSize(28)
    .fillColor("#FFFFFF")
    .text("MyHomeBase™", ML, 70);

  // Title
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(C.accent)
    .text("Contractor Module", ML, 110);

  // Subtitle
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#AFD6F9")
    .text("Developer Reference", ML, 140);

  // Tagline
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#94A3B8")
    .text("Architecture · API Reference · Database Schema · Annotated Code", ML, 165);

  // Meta box
  const metaY = 250;
  doc
    .save()
    .rect(ML, metaY, CW, 80)
    .fill(C.bg)
    .restore();

  doc
    .save()
    .rect(ML, metaY, 3, 80)
    .fill(C.brand)
    .restore();

  const metaItems = [
    ["Generated", new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
    ["Stack", "React 18 + TypeScript (Vite) / Express 5 + Drizzle ORM (PostgreSQL)"],
    ["Monorepo", "pnpm workspaces — @workspace/myhomebase, @workspace/api-server, @workspace/db"],
    ["Production", "gotohomebase.com"],
  ];

  let my = metaY + 10;
  for (const [label, value] of metaItems) {
    doc
      .font("Helvetica-Bold").fontSize(7.5).fillColor(C.muted)
      .text(label.toUpperCase(), ML + 12, my, { lineBreak: false });
    doc
      .font("Helvetica").fontSize(8).fillColor(C.text)
      .text(value, ML + 80, my, { width: CW - 92, lineBreak: false, ellipsis: true });
    my += 16;
  }

  // Section list preview
  const sections = [
    "1. Module Overview",
    "2. Subscription Tiers",
    "3. Authentication & Authorization",
    "4. File Map",
    "5. Frontend Architecture",
    "6. API Reference — Contractor Endpoints",
    "7. API Reference — CRM Endpoints",
    "8. API Reference — Proposals",
    "9. Database Schema",
    "10. Annotated Code Walkthroughs",
    "11. Integration Points",
    "12. Key Patterns & Gotchas",
  ];

  doc
    .font("Helvetica-Bold").fontSize(10).fillColor(C.brand)
    .text("Contents", ML, metaY + 100);

  let sy = metaY + 118;
  const half = Math.ceil(sections.length / 2);
  for (let i = 0; i < sections.length; i++) {
    const col = i < half ? 0 : 1;
    const row = i < half ? i : i - half;
    const sx = ML + col * (CW / 2 + 10);
    const sly = sy + row * 13;
    doc
      .font("Helvetica").fontSize(8).fillColor(C.text)
      .text(`• ${sections[i]}`, sx, sly, { width: CW / 2 - 10, lineBreak: false, ellipsis: true });
  }

  doc.y = metaY + 118 + half * 13 + 20;
  drawPageFooter(ctx);
}

// ─── Main renderer ────────────────────────────────────────────────────────────
async function generatePdf() {
  const md = fs.readFileSync(MD_PATH, "utf-8");
  const rawLines = md.split("\n");

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MT, bottom: MB, left: ML, right: MR },
    bufferPages: true,
    info: {
      Title: "MyHomeBase™ Contractor Module — Developer Reference",
      Author: "CodeStation AI",
      Subject: "Contractor Module Architecture, API, Schema",
      CreationDate: new Date(),
    },
  });

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  const stream = fs.createWriteStream(OUT_PATH);
  doc.pipe(stream);

  const ctx: DocCtx = { doc, pageNum: 1 };

  // Cover page
  drawCover(ctx);
  doc.addPage();
  ctx.pageNum++;
  doc.y = MT;
  drawPageFooter(ctx);

  // Parse and render
  let inCode = false;
  let codeLang = "";
  let codeLines: string[] = [];
  let tableRows: string[][] = [];
  let inTable = false;

  function flushTable() {
    if (tableRows.length > 0) {
      renderTable(ctx, tableRows);
      tableRows = [];
    }
    inTable = false;
  }

  for (const raw of rawLines) {
    const classified = classifyLine(raw, inCode, codeLang);

    // Handle table flush when leaving a table context
    if (inTable && classified.type !== "table_row" && classified.type !== "table_sep") {
      flushTable();
    }

    switch (classified.type) {
      case "code_fence": {
        if (!inCode) {
          inCode = true;
          codeLang = classified.lang;
          codeLines = [];
        } else {
          inCode = false;
          renderCodeBlock(ctx, codeLines, codeLang);
          codeLines = [];
          codeLang = "";
        }
        break;
      }

      case "code_line": {
        codeLines.push(classified.text);
        break;
      }

      case "h1": {
        checkPageBreak(ctx, 50);
        const y = doc.y;
        // Full-width colored band
        doc.save().rect(ML - 4, y, CW + 8, 28).fill(C.brandDark).restore();
        doc
          .font("Helvetica-Bold")
          .fontSize(FS.h1)
          .fillColor("#FFFFFF")
          .text(classified.text, ML + 4, y + 5, { width: CW - 8, lineBreak: false });
        doc.y = y + 36;
        break;
      }

      case "h2": {
        checkPageBreak(ctx, 40);
        const y = doc.y + 4;
        doc.save().rect(ML, y, CW, 22).fill(C.brand).restore();
        doc.save().rect(ML, y, 4, 22).fill(C.accent).restore();
        doc
          .font("Helvetica-Bold")
          .fontSize(FS.h2)
          .fillColor("#FFFFFF")
          .text(classified.text, ML + 10, y + 4, { width: CW - 14, lineBreak: false });
        doc.y = y + 30;
        break;
      }

      case "h3": {
        checkPageBreak(ctx, 30);
        doc
          .font("Helvetica-Bold")
          .fontSize(FS.h3)
          .fillColor(C.h3)
          .text(classified.text, ML, doc.y + 6, { width: CW });
        // Underline
        const afterY = doc.y;
        doc.save().moveTo(ML, afterY).lineTo(ML + CW, afterY).strokeColor(C.rule).lineWidth(0.5).stroke().restore();
        doc.y = afterY + 4;
        break;
      }

      case "h4": {
        checkPageBreak(ctx, 20);
        doc
          .font("Helvetica-Bold")
          .fontSize(FS.h4)
          .fillColor(C.brand)
          .text(classified.text, ML, doc.y + 4, { width: CW });
        break;
      }

      case "hr": {
        checkPageBreak(ctx, 12);
        doc.y += 4;
        doc.save().moveTo(ML, doc.y).lineTo(ML + CW, doc.y).strokeColor(C.accent).lineWidth(1).stroke().restore();
        doc.y += 8;
        break;
      }

      case "blank": {
        if (!inTable) doc.y += 4;
        break;
      }

      case "blockquote": {
        checkPageBreak(ctx, 26);
        const qy = doc.y + 4;
        doc.save().rect(ML, qy, 3, 20).fill(C.accent).restore();
        doc.save().rect(ML, qy, CW, 20).fill("#FFFBEB").restore();
        doc
          .font("Helvetica")
          .fontSize(FS.body)
          .fillColor(C.muted)
          .text(stripInline(classified.text), ML + 10, qy + 5, { width: CW - 14, lineBreak: false });
        doc.y = qy + 26;
        break;
      }

      case "li": {
        checkPageBreak(ctx, 14);
        const indent = Math.min(classified.indent, 4) * 6;
        const bullet = classified.indent > 0 ? "◦" : "•";
        const lx = ML + indent;
        const ly = doc.y;
        doc
          .font("Helvetica-Bold")
          .fontSize(FS.body)
          .fillColor(C.brand)
          .text(bullet, lx, ly, { lineBreak: false });
        doc
          .font("Helvetica")
          .fontSize(FS.body)
          .fillColor(C.text)
          .text(stripInline(classified.text), lx + 10, ly, { width: CW - indent - 10 });
        break;
      }

      case "table_sep": {
        // skip separator rows
        inTable = true;
        break;
      }

      case "table_row": {
        inTable = true;
        tableRows.push(classified.cells);
        break;
      }

      case "para": {
        checkPageBreak(ctx, 14);
        doc
          .font("Helvetica")
          .fontSize(FS.body)
          .fillColor(C.text)
          .text(stripInline(classified.text), ML, doc.y, { width: CW });
        break;
      }
    }
  }

  // Flush any remaining table
  if (inTable) flushTable();

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  const stats = fs.statSync(OUT_PATH);
  const sizeMb = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`✓ PDF generated: ${OUT_PATH} (${sizeMb} MB)`);

  // Copy to public/ so Vite serves them at /contractor-docs.md and /contractor-docs.pdf
  fs.copyFileSync(MD_PATH, PUBLIC_MD);
  fs.copyFileSync(OUT_PATH, PUBLIC_PDF);
  console.log(`✓ Published to public/: contractor-docs.md + contractor-docs.pdf`);
}

generatePdf().catch((err) => {
  console.error("PDF generation failed:", err);
  process.exit(1);
});
