import type { BinaryReader } from "@sevenc-nanashi/binaryseeker";

export type FontDirectory = {
  scalerType: string;
  numTables: number;
  searchRange: number;
  entrySelector: number;
  rangeShift: number;
  tables: Array<Table>;
};
export type Table = {
  tag: string;
  checksum: number;
  offset: number;
  length: number;
};

export function readDirectory(reader: BinaryReader): FontDirectory {
  const scalerType = reader.readChars(4);
  const numTables = reader.readUInt16BE();
  const searchRange = reader.readUInt16BE();
  const entrySelector = reader.readUInt16BE();
  const rangeShift = reader.readUInt16BE();

  const tables: Table[] = [];
  for (let i = 0; i < numTables; i++) {
    const tag = reader.readChars(4);
    const checksum = reader.readUInt32BE();
    const offset = reader.readUInt32BE();
    const length = reader.readUInt32BE();
    tables.push({
      tag,
      checksum,
      offset,
      length,
    });
  }

  return {
    scalerType,
    numTables,
    searchRange,
    entrySelector,
    rangeShift,
    tables,
  };
}

export type MaxpTable = {
  version: number;
  numGlyphs: number;
  maxPoints: number;
  maxContours: number;
  maxCompositePoints: number;
  maxCompositeContours: number;
  maxZones: number;
  maxTwilightPoints: number;
  maxStorage: number;
  maxFunctionDefs: number;
  maxInstructionDefs: number;
  maxStackElements: number;
  maxSizeOfInstructions: number;
  maxComponentElements: number;
  maxComponentDepth: number;
};

export function readMaxp(reader: BinaryReader, offset: number): MaxpTable {
  reader.seek(offset);
  const version = reader.readUInt32BE();
  const numGlyphs = reader.readUInt16BE();
  const maxPoints = reader.readUInt16BE();
  const maxContours = reader.readUInt16BE();
  const maxCompositePoints = reader.readUInt16BE();
  const maxCompositeContours = reader.readUInt16BE();
  const maxZones = reader.readUInt16BE();
  const maxTwilightPoints = reader.readUInt16BE();
  const maxStorage = reader.readUInt16BE();
  const maxFunctionDefs = reader.readUInt16BE();
  const maxInstructionDefs = reader.readUInt16BE();
  const maxStackElements = reader.readUInt16BE();
  const maxSizeOfInstructions = reader.readUInt16BE();
  const maxComponentElements = reader.readUInt16BE();
  const maxComponentDepth = reader.readUInt16BE();

  return {
    version,
    numGlyphs,
    maxPoints,
    maxContours,
    maxCompositePoints,
    maxCompositeContours,
    maxZones,
    maxTwilightPoints,
    maxStorage,
    maxFunctionDefs,
    maxInstructionDefs,
    maxStackElements,
    maxSizeOfInstructions,
    maxComponentElements,
    maxComponentDepth,
  };
}

export type HheaTable = {
  version: number;
  ascent: number;
  descent: number;
  lineGap: number;
  advanceWidthMax: number;
  minLeftSideBearing: number;
  minRightSideBearing: number;
  xMaxExtent: number;
  caretSlopeRise: number;
  caretSlopeRun: number;
  caretOffset: number;
  metricDataFormat: number;
  numberOfHMetrics: number;
};

export function readHhea(reader: BinaryReader, offset: number): HheaTable {
  reader.seek(offset);
  const version = reader.readUInt32BE();
  const ascent = reader.readInt16BE();
  const descent = reader.readInt16BE();
  const lineGap = reader.readInt16BE();
  const advanceWidthMax = reader.readUInt16BE();
  const minLeftSideBearing = reader.readInt16BE();
  const minRightSideBearing = reader.readInt16BE();
  const xMaxExtent = reader.readInt16BE();
  const caretSlopeRise = reader.readInt16BE();
  const caretSlopeRun = reader.readInt16BE();
  const caretOffset = reader.readInt16BE();
  void reader.readInt16BE(); // reserved, not used
  void reader.readInt16BE(); // reserved, not used
  void reader.readInt16BE(); // reserved, not used
  void reader.readInt16BE(); // reserved, not used
  const metricDataFormat = reader.readInt16BE(); // format of the metrics data, usually 0
  const numberOfHMetrics = reader.readUInt16BE(); // number of hMetrics in the Font

  return {
    version,
    ascent,
    descent,
    lineGap,
    advanceWidthMax,
    minLeftSideBearing,
    minRightSideBearing,
    xMaxExtent,
    caretSlopeRise,
    caretSlopeRun,
    caretOffset,
    metricDataFormat,
    numberOfHMetrics,
  };
}

export type HmtxTable = {
  advanceWidth: number[];
  leftSideBearing: number[];
};

export function readHmtx(
  reader: BinaryReader,
  offset: number,
  numGlyphs: number,
  numberOfHMetrics: number,
): HmtxTable {
  reader.seek(offset);
  const advanceWidth: number[] = [];
  const leftSideBearing: number[] = [];

  for (let i = 0; i < numberOfHMetrics; i++) {
    advanceWidth.push(reader.readUInt16BE());
    leftSideBearing.push(reader.readInt16BE());
  }

  // If there are more glyphs than hMetrics, the remaining glyphs have a left side bearing of 0
  for (let i = numberOfHMetrics; i < numGlyphs; i++) {
    advanceWidth.push(reader.readUInt16BE());
    leftSideBearing.push(0);
  }

  return {
    advanceWidth,
    leftSideBearing,
  };
}

export type CmapTable = {
  version: number;
  encodingRecords: EncodingRecord[];
};

export type EncodingRecord = {
  platformId: number;
  encodingId: number;
  offset: number;

  subTable: CmapSubTable | null;
};

export type CmapSubTable = {
  format: number;
  glyphIndexMap: Map<string, number> | null;
};

export function readCmap(reader: BinaryReader, offset: number): CmapTable {
  reader.seek(offset);
  const version = reader.readUInt16BE();
  const numTables = reader.readUInt16BE();
  const encodingRecords: EncodingRecord[] = [];

  for (let i = 0; i < numTables; i++) {
    const platformId = reader.readUInt16BE();
    const encodingId = reader.readUInt16BE();
    const offset = reader.readUInt32BE();
    encodingRecords.push({ platformId, encodingId, offset, subTable: null });
  }

  for (const record of encodingRecords) {
    reader.seek(offset + record.offset);
    const subTableFormat = reader.readUInt16BE();
    let glyphMap: Map<string, number> | null = null;

    if (subTableFormat === 4) {
      glyphMap = parseCmapSubtableFormat4(reader);
    } else if (subTableFormat === 6) {
      glyphMap = parseCmapSubtableFormat6(reader);
    } else if (subTableFormat === 12) {
      glyphMap = parseCmapSubtableFormat12(reader);
    } else {
      console.warn(
        `Unsupported cmap subtable format: ${subTableFormat}. Skipping.`,
      );
      continue;
    }

    record.subTable = {
      format: subTableFormat,
      glyphIndexMap: glyphMap,
    };
  }
  return {
    version,
    encodingRecords,
  };
}
function parseCmapSubtableFormat4(reader: BinaryReader): Map<string, number> {
  const _format = 4;
  const _length = reader.readUInt16BE();
  const _language = reader.readUInt16BE();
  const segCountX2 = reader.readUInt16BE();
  const segCount = segCountX2 / 2;
  void reader.readUInt16BE(); // searchRange
  void reader.readUInt16BE(); // entrySelector
  void reader.readUInt16BE(); // rangeShift

  const endCode: number[] = [];
  for (let i = 0; i < segCount; i++) {
    endCode.push(reader.readUInt16BE());
  }

  void reader.readUInt16BE(); // reservedPad

  const startCode: number[] = [];
  for (let i = 0; i < segCount; i++) {
    startCode.push(reader.readUInt16BE());
  }

  const idDelta: number[] = [];
  for (let i = 0; i < segCount; i++) {
    idDelta.push(reader.readInt16BE());
  }

  const idRangeOffset_offset = reader.offset;
  const idRangeOffset: number[] = [];
  for (let i = 0; i < segCount; i++) {
    idRangeOffset.push(reader.readUInt16BE());
  }

  const glyphIndexMap = new Map<string, number>();
  // The last segment is a dummy segment to mark the end of the table
  for (let i = 0; i < segCount - 1; i++) {
    const start = startCode[i];
    const end = endCode[i];
    const delta = idDelta[i];
    const rangeOffset = idRangeOffset[i];

    for (let charCode = start; charCode <= end; charCode++) {
      let glyphIndex = 0;
      if (rangeOffset === 0) {
        glyphIndex = (charCode + delta) & 0xffff;
      } else {
        const glyphIndexOffset =
          idRangeOffset_offset + i * 2 + rangeOffset + (charCode - start) * 2;
        reader.seek(glyphIndexOffset);
        glyphIndex = reader.readUInt16BE();
        if (glyphIndex !== 0) {
          glyphIndex = (glyphIndex + delta) & 0xffff;
        }
      }
      glyphIndexMap.set(String.fromCodePoint(charCode), glyphIndex);
    }
  }

  return glyphIndexMap;
}

function parseCmapSubtableFormat12(reader: BinaryReader): Map<string, number> {
  // format: 12
  void reader.readUInt16BE(); // reserved
  const _length = reader.readUInt32BE();
  const _language = reader.readUInt32BE();
  const numGroups = reader.readUInt32BE();

  const glyphIndexMap = new Map<string, number>();

  for (let i = 0; i < numGroups; i++) {
    const startCharCode = reader.readUInt32BE();
    const endCharCode = reader.readUInt32BE();
    const startGlyphID = reader.readUInt32BE();

    for (let charCode = startCharCode; charCode <= endCharCode; charCode++) {
      glyphIndexMap.set(
        String.fromCodePoint(charCode),
        startGlyphID + (charCode - startCharCode),
      );
    }
  }

  return glyphIndexMap;
}

function parseCmapSubtableFormat6(reader: BinaryReader): Map<string, number> {
  // format: 6
  const _length = reader.readUInt16BE();
  const _language = reader.readUInt16BE();
  const firstCode = reader.readUInt16BE();
  const entryCount = reader.readUInt16BE();

  const glyphIndexMap = new Map<string, number>();

  for (let i = 0; i < entryCount; i++) {
    const charCode = firstCode + i;
    const glyphIndex = reader.readUInt16BE();
    glyphIndexMap.set(String.fromCodePoint(charCode), glyphIndex);
  }

  return glyphIndexMap;
}

export type NameTable = {
  format: number;
  count: number;
  stringOffset: number;
  records: NameRecord[];
};

export type NameRecord = {
  platformId: number;
  encodingId: number;
  languageId: number;
  nameId: number;
  length: number;
  offset: number;

  string: string;
};

export function readName(reader: BinaryReader, offset: number): NameTable {
  reader.seek(offset);
  const format = reader.readUInt16BE();
  const count = reader.readUInt16BE();
  const stringOffset = reader.readUInt16BE();

  const records: NameRecord[] = [];
  for (let i = 0; i < count; i++) {
    const platformId = reader.readUInt16BE();
    const encodingId = reader.readUInt16BE();
    const languageId = reader.readUInt16BE();
    const nameId = reader.readUInt16BE();
    const length = reader.readUInt16BE();
    const recordOffset = reader.readUInt16BE();

    records.push({
      platformId,
      encodingId,
      languageId,
      nameId,
      length,
      offset: recordOffset,
      string: "",
    });
  }

  for (const record of records) {
    if (!(record.platformId === 0 || (record.platformId === 3 && record.encodingId === 1))) {
      // Skip records that are not in the desired platform/encoding
      continue;
    }
    reader.seek(offset + record.offset + stringOffset);
    const nameBytes = reader.readBytes(record.length);
    record.string = new TextDecoder("utf-16be").decode(nameBytes);
  }

  return {
    format,
    count,
    stringOffset,
    records,
  };
}
