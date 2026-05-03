import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import hljs from "highlight.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(__dirname, "../..");
const OUTPUT_DIR = path.resolve(__dirname, "../output");

const SOURCE_DIRS = ["artifacts", "lib"];
const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".replit-artifact",
  "generated",
  "codegen",
  "__generated__",
  ".next",
  "build",
  "coverage",
  "output",
]);

const EXT_TO_LANG: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
};

const HLJS_COLORS: Record<string, string> = {
  "hljs-comment": "#8b949e",
  "hljs-quote": "#8b949e",
  "hljs-keyword": "#ff7b72",
  "hljs-selector-tag": "#ff7b72",
  "hljs-addition": "#ff7b72",
  "hljs-number": "#79c0ff",
  "hljs-literal": "#79c0ff",
  "hljs-variable": "#79c0ff",
  "hljs-template-variable": "#79c0ff",
  "hljs-string": "#a5d6ff",
  "hljs-doctag": "#a5d6ff",
  "hljs-title": "#d2a8ff",
  "hljs-section": "#d2a8ff",
  "hljs-selector-id": "#d2a8ff",
  "hljs-type": "#ffa657",
  "hljs-name": "#7ee787",
  "hljs-attribute": "#7ee787",
  "hljs-tag": "#7ee787",
  "hljs-regexp": "#56d364",
  "hljs-link": "#56d364",
  "hljs-symbol": "#f8c555",
  "hljs-bullet": "#f8c555",
  "hljs-built_in": "#79c0ff",
  "hljs-builtin-name": "#79c0ff",
  "hljs-meta": "#e3b341",
  "hljs-deletion": "#ffa198",
  DEFAULT: "#c9d1d9",
};

interface Token {
  text: string;
  color: string;
}

function htmlToTokens(html: string): Token[] {
  const tokens: Token[] = [];
  const colorStack: string[] = [HLJS_COLORS.DEFAULT];
  let i = 0;
  while (i < html.length) {
    if (html[i] === "&") {
      const semi = html.indexOf(";", i);
      if (semi !== -1) {
        const entity = html.slice(i, semi + 1);
        let ch = entity;
        if (entity === "&amp;") ch = "&";
        else if (entity === "&lt;") ch = "<";
        else if (entity === "&gt;") ch = ">";
        else if (entity === "&quot;") ch = '"';
        else if (entity === "&#39;") ch = "'";
        tokens.push({ text: ch, color: colorStack[colorStack.length - 1] });
        i = semi + 1;
      } else {
        tokens.push({ text: html[i], color: colorStack[colorStack.length - 1] });
        i++;
      }
    } else if (html[i] === "<") {
      const tagEnd = html.indexOf(">", i);
      if (tagEnd === -1) {
        tokens.push({ text: html[i], color: colorStack[colorStack.length - 1] });
        i++;
        continue;
      }
      const tag = html.slice(i + 1, tagEnd);
      if (tag.startsWith("/")) {
        if (colorStack.length > 1) colorStack.pop();
      } else {
        const classMatch = tag.match(/class="([^"]+)"/);
        if (classMatch) {
          const classes = classMatch[1].split(" ");
          let color = HLJS_COLORS.DEFAULT;
          for (const cls of classes) {
            if (HLJS_COLORS[cls]) { color = HLJS_COLORS[cls]; break; }
          }
          colorStack.push(color);
        } else {
          colorStack.push(colorStack[colorStack.length - 1]);
        }
      }
      i = tagEnd + 1;
    } else {
      tokens.push({ text: html[i], color: colorStack[colorStack.length - 1] });
      i++;
    }
  }
  return tokens;
}

function mergeTokens(tokens: Token[]): Token[] {
  const merged: Token[] = [];
  for (const tok of tokens) {
    if (merged.length > 0 && merged[merged.length - 1].color === tok.color) {
      merged[merged.length - 1].text += tok.text;
    } else {
      merged.push({ ...tok });
    }
  }
  return merged;
}

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath));
    } else if (ALLOWED_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CODE_FONT_SIZE = 7;
const CODE_LINE_H = CODE_FONT_SIZE * 1.45;
const LN_WIDTH = 28;
const CODE_X = MARGIN + LN_WIDTH;

async function writePdf(files: string[], sectionLabel: string, outputFile: string): Promise<void> {
  const relativePaths = files.map((f) => path.relative(WORKSPACE_ROOT, f));

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: { Title: `Codebase Export — ${sectionLabel}`, CreationDate: new Date() },
  });

  const stream = fs.createWriteStream(outputFile);
  doc.pipe(stream);

  // Cover
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#111111")
    .text(`Codebase Export — ${sectionLabel}`, MARGIN, MARGIN);
  doc.font("Helvetica").fontSize(10).fillColor("#666666")
    .text(`Generated: ${new Date().toISOString()}  •  ${files.length} files`, MARGIN, doc.y + 4);
  doc.fillColor("#000000").moveDown(1.5);

  // TOC
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#111111").text("Table of Contents", MARGIN, doc.y);
  doc.moveDown(0.5);
  for (let i = 0; i < files.length; i++) {
    if (doc.y + 11 > PAGE_H - MARGIN) doc.addPage();
    doc.font("Courier").fontSize(7).fillColor("#1a1a1a")
      .text(`${i + 1}. ${relativePaths[i]}`, MARGIN, doc.y, { width: CONTENT_W, lineBreak: false, ellipsis: true });
    doc.y += 10;
  }

  // File sections
  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const relPath = relativePaths[i];
    const ext = path.extname(filePath);
    const lang = EXT_TO_LANG[ext] ?? "typescript";
    const content = fs.readFileSync(filePath, "utf-8");

    doc.addPage();
    doc.rect(MARGIN, MARGIN, CONTENT_W, 20).fill("#1e3a5f");
    doc.font("Courier-Bold").fontSize(8.5).fillColor("#ffffff")
      .text(`${i + 1}. ${relPath}`, MARGIN + 6, MARGIN + 5, { width: CONTENT_W - 12, lineBreak: false, ellipsis: true });

    doc.y = MARGIN + 26;
    const lines = content.split("\n");

    for (let ln = 0; ln < lines.length; ln++) {
      if (doc.y + CODE_LINE_H > PAGE_H - MARGIN) { doc.addPage(); doc.y = MARGIN; }
      const y = doc.y;

      doc.font("Courier").fontSize(CODE_FONT_SIZE).fillColor("#6b7280")
        .text(String(ln + 1), MARGIN, y, { width: LN_WIDTH - 4, align: "right", lineBreak: false });

      let lineHtml: string;
      try {
        lineHtml = hljs.highlight(lines[ln], { language: lang }).value;
      } catch {
        lineHtml = lines[ln].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }

      const lineTokens = mergeTokens(htmlToTokens(lineHtml));
      let xCursor = CODE_X;
      doc.font("Courier").fontSize(CODE_FONT_SIZE);

      for (const tok of lineTokens) {
        if (!tok.text) continue;
        const text = tok.text.replace(/\t/g, "    ");
        const textWidth = doc.widthOfString(text);
        if (xCursor + textWidth > MARGIN + CONTENT_W) {
          doc.fillColor(tok.color).text(text, xCursor, y, { lineBreak: false, width: MARGIN + CONTENT_W - xCursor, ellipsis: true });
          break;
        }
        doc.fillColor(tok.color).text(text, xCursor, y, { lineBreak: false });
        xCursor += textWidth;
      }

      doc.y = y + CODE_LINE_H;
    }
  }

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  const stats = fs.statSync(outputFile);
  const sizeMb = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`  ✓ ${sectionLabel} — ${files.length} files, ${sizeMb} MB → ${path.basename(outputFile)}`);
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Collect all files grouped by top-level section
  const sectionMap = new Map<string, string[]>();

  for (const srcDir of SOURCE_DIRS) {
    const baseDir = path.join(WORKSPACE_ROOT, srcDir);
    if (!fs.existsSync(baseDir)) continue;

    if (srcDir === "lib") {
      // lib/* — each sub-package is its own section
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
        const files = collectFiles(path.join(baseDir, entry.name));
        if (files.length > 0) {
          const label = `lib/${entry.name}`;
          sectionMap.set(label, files.sort());
        }
      }
    } else {
      // artifacts/* — each artifact is its own section
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
        const files = collectFiles(path.join(baseDir, entry.name));
        if (files.length > 0) {
          const label = `artifacts/${entry.name}`;
          sectionMap.set(label, files.sort());
        }
      }
    }
  }

  const totalFiles = [...sectionMap.values()].reduce((s, f) => s + f.length, 0);
  console.log(`Found ${totalFiles} source files across ${sectionMap.size} sections:\n`);
  for (const [label, files] of sectionMap) {
    console.log(`  ${label} — ${files.length} files`);
  }
  console.log("\nGenerating PDFs...\n");

  for (const [label, files] of sectionMap) {
    const slug = label.replace(/\//g, "-").replace(/[^a-z0-9-]/gi, "_");
    const outputFile = path.join(OUTPUT_DIR, `${slug}.pdf`);
    await writePdf(files, label, outputFile);
  }

  console.log("\nAll PDFs exported to scripts/output/");
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
