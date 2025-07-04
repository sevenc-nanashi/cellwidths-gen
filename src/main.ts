import * as fs from "node:fs/promises";
import { BinaryReader } from "@sevenc-nanashi/binaryseeker";
import { renderFilled } from "oh-my-logo";
import yargs from "yargs";
import * as parser from "./parser.ts";
import templateVim from "./template.vim.ts";

export async function main(): Promise<number> {
  await showLogo();
  const { fontFilePath, outputPath } = await parseArgs();

  console.log(`Reading font file: ${fontFilePath}`);
  const buffer = await fs.readFile(fontFilePath);
  const arrayBuffer = buffer.buffer.slice();
  const reader = new BinaryReader(arrayBuffer);

  const { hmtxTable, cmapTable, nameTable } = await readFontData(reader);
  const name = nameTable.records.find(
    (n) => n.nameId === 1 && n.string,
  )?.string;
  if (!name) {
    console.error("Font name not found in the 'name' table.");
    return 1;
  }
  console.log(`Font name: ${name}`);
  const { charToGlyphId } = processCmapTable(cmapTable);

  console.log(`Found ${charToGlyphId.size} characters.`);
  const advanceWidths = calculateAdvanceWidths(charToGlyphId, hmtxTable);
  if (advanceWidths.size < 2) {
    console.error(
      `Expected more than 2 advance widths, found ${advanceWidths.size}.`,
    );
    return 1;
  } else if (advanceWidths.size > 2) {
    console.warn(
      `Found more than 2 advance widths (${advanceWidths.size}), using only the two most common.`,
    );
  }

  const vimScriptContent = generateVimScript(advanceWidths, name);
  console.log(`Writing Vim script to ${outputPath}`);
  await fs.writeFile(outputPath, vimScriptContent);

  return 0;
}

async function showLogo() {
  await renderFilled("cellwidths-gen", {
    palette: ["#3fe702", "#009933", "#006b05"],
  });
}

async function parseArgs() {
  const parsed = await yargs(process.argv.slice(2))
    .usage("Usage: $0 <path-to-font-file>")
    .demandCommand(1, "You must provide a path to a font file.")
    .option("output", {
      alias: "o",
      type: "string",
      description: "Path to output Vim script file",
      default: "./cellwidths.vim",
    })
    .help()
    .alias("h", "help").argv;
  return {
    fontFilePath: parsed._[0] as string,
    outputPath: parsed.output as string,
  };
}

function findOffset(tables: parser.Table[], tag: string): number {
  const table = tables.find((t) => t.tag === tag);
  if (!table) {
    throw new Error(`Table with tag ${tag} not found`);
  }
  return table.offset;
}

async function readFontData(reader: BinaryReader) {
  const fontDir = parser.readDirectory(reader);
  const hheaOffset = findOffset(fontDir.tables, "hhea");
  const hheaTable = parser.readHhea(reader, hheaOffset);
  const maxpOffset = findOffset(fontDir.tables, "maxp");
  const maxpTable = parser.readMaxp(reader, maxpOffset);
  const hmtxOffset = findOffset(fontDir.tables, "hmtx");
  const hmtxTable = parser.readHmtx(
    reader,
    hmtxOffset,
    maxpTable.numGlyphs,
    hheaTable.numberOfHMetrics,
  );
  const cmapOffset = findOffset(fontDir.tables, "cmap");
  const cmapTable = parser.readCmap(reader, cmapOffset);
  const nameOffset = findOffset(fontDir.tables, "name");
  const nameTable = parser.readName(reader, nameOffset);

  return { fontDir, hheaTable, maxpTable, hmtxTable, cmapTable, nameTable };
}

function processCmapTable(cmapTable: parser.CmapTable) {
  const charToGlyphId = new Map<string, number>();
  const glyphIdToChar = new Map<number, string>();
  for (const record of cmapTable.encodingRecords) {
    if (!record.subTable || !record.subTable.glyphIndexMap) {
      continue;
    }

    for (const [key, value] of record.subTable.glyphIndexMap.entries()) {
      charToGlyphId.set(key, value);
      glyphIdToChar.set(value, key);
    }
  }
  return { charToGlyphId, glyphIdToChar };
}
function calculateAdvanceWidths(
  charToGlyphId: Map<string, number>,
  hmtxTable: parser.HmtxTable,
): Map<number, Set<string>> {
  const advanceWidths = new Map<number, Set<string>>();
  for (const [char, glyphId] of charToGlyphId.entries()) {
    const advanceWidth =
      hmtxTable.advanceWidth[
        Math.min(glyphId, hmtxTable.advanceWidth.length - 1)
      ];
    const charCode = char.charCodeAt(0);
    const ASCII_MAX_CODE = 0x80;

    // ... (inside calculateAdvanceWidths function)
    if (charCode < ASCII_MAX_CODE) {
      continue; // setcellwidths does not support ASCII characters
    }
    if (advanceWidth === 0) {
      continue;
    }
    if (!advanceWidths.has(advanceWidth)) {
      advanceWidths.set(advanceWidth, new Set());
    }
    advanceWidths.get(advanceWidth)?.add(char);
  }
  return advanceWidths;
}

function generateVimScript(
  advanceWidths: Map<number, Set<string>>,
  fontName: string,
): string {
  const widths = Array.from(advanceWidths.entries());
  widths.sort((a, b) => b[1].size - a[1].size);
  const allowedWidths = [widths[0][0], widths[1][0]];
  allowedWidths.sort((a, b) => a - b);
  const smallerWidth = allowedWidths[0];
  const _largerWidth = allowedWidths[1];

  let numAddedChars = 0;
  const allSegments: [number, number, number][] = [];
  for (const width of allowedWidths) {
    const chars = advanceWidths.get(width);
    if (!chars) {
      throw new Error(`Unreachable: ${width} not found in advanceWidths`);
    }
    numAddedChars += chars.size;
    const charCodes = Array.from(chars).map((c) => c.codePointAt(0) || 0);
    charCodes.sort((a, b) => a - b);
    const segments = [[charCodes[0], charCodes[0]]];
    for (const charCode of charCodes.slice(1)) {
      const lastSegment = segments[segments.length - 1];
      if (charCode === lastSegment[1] + 1) {
        lastSegment[1] = charCode; // Extend the segment
      } else {
        segments.push([charCode, charCode]); // Start a new segment
      }
    }

    for (const segment of segments) {
      const start = segment[0];
      const end = segment[1];
      const widthValue = width === smallerWidth ? 1 : 2;
      allSegments.push([start, end, widthValue]);
    }
  }
  console.log(
    `Added ${numAddedChars} characters with widths: ${allowedWidths.join(", ")}`,
  );
  const nonce = Math.random().toString(36).substring(2, 15);
  return templateVim
    .replaceAll("NONCE", nonce)
    .replaceAll("FONT_NAME", fontName)
    .replaceAll("JSON", JSON.stringify(allSegments));
}
