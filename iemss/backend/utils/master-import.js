const zlib = require('zlib');

function readUInt32LE(buf, off) {
  return buf.readUInt32LE(off);
}

function readUInt16LE(buf, off) {
  return buf.readUInt16LE(off);
}

/**
 * Read XLSX ZIP structure
 */
function parseZip(buffer) {
  let eocd = -1;

  for (
    let i = buffer.length - 22;
    i >= Math.max(0, buffer.length - 0x10000 - 22);
    i--
  ) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }

  if (eocd < 0) {
    throw new Error(
      'ملف Excel غير صالح أو ليس ملف XLSX.'
    );
  }

  const cdSize = readUInt32LE(buffer, eocd + 12);
  const cdOffset = readUInt32LE(buffer, eocd + 16);

  const files = new Map();

  let p = cdOffset;
  const end = cdOffset + cdSize;

  while (p < end) {
    if (readUInt32LE(buffer, p) !== 0x02014b50) {
      throw new Error(
        'تعذر قراءة بنية ملف Excel.'
      );
    }

    const method = readUInt16LE(buffer, p + 10);
    const compressedSize = readUInt32LE(buffer, p + 20);
    const uncompressedSize = readUInt32LE(buffer, p + 24);

    const nameLen = readUInt16LE(buffer, p + 28);
    const extraLen = readUInt16LE(buffer, p + 30);
    const commentLen = readUInt16LE(buffer, p + 32);

    const localOffset = readUInt32LE(buffer, p + 42);

    const name = buffer
      .slice(p + 46, p + 46 + nameLen)
      .toString('utf8');

    const localNameLen = readUInt16LE(
      buffer,
      localOffset + 26
    );

    const localExtraLen = readUInt16LE(
      buffer,
      localOffset + 28
    );

    const dataStart =
      localOffset +
      30 +
      localNameLen +
      localExtraLen;

    const compressed = buffer.slice(
      dataStart,
      dataStart + compressedSize
    );

    let data;

    if (method === 0) {
      data = compressed;
    } else if (method === 8) {
      data = zlib.inflateRawSync(compressed);
    } else {
      throw new Error(
        `ضغط Excel غير مدعوم: ${method}`
      );
    }

    if (
      uncompressedSize &&
      data.length !== uncompressedSize
    ) {
      throw new Error(
        `ملف Excel تالف: ${name}`
      );
    }

    files.set(name, data);

    p +=
      46 +
      nameLen +
      extraLen +
      commentLen;
  }

  return files;
}

/**
 * XML entity decoding
 */
function xmlUnescape(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#([0-9]+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10))
    )
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Read XML attribute
 */
function getAttr(attrs, name) {
  const escapedName = name.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

  const regex = new RegExp(
    `\\b${escapedName}="([^"]*)"`
  );

  const match = attrs.match(regex);

  return match
    ? xmlUnescape(match[1])
    : null;
}

/**
 * Convert Excel column letters to number
 * A = 1
 * B = 2
 * ...
 */
function colToNumber(col) {
  let n = 0;

  for (const ch of col) {
    n =
      n * 26 +
      ch.charCodeAt(0) -
      64;
  }

  return n;
}

/**
 * Parse Shared Strings
 */
function parseSharedStrings(xml) {
  if (!xml) return [];

  const result = [];

  const siRegex =
    /<si\b[^>]*>([\s\S]*?)<\/si>/g;

  let match;

  while ((match = siRegex.exec(xml))) {
    const texts = [];

    const tRegex =
      /<t\b[^>]*>([\s\S]*?)<\/t>/g;

    let tMatch;

    while ((tMatch = tRegex.exec(match[1]))) {
      texts.push(
        xmlUnescape(tMatch[1])
      );
    }

    result.push(texts.join(''));
  }

  return result;
}

/**
 * Parse workbook relationships
 */
function parseRelationships(xml) {
  const map = new Map();

  if (!xml) return map;

  const regex =
    /<Relationship\b([^>]+?)\/>/g;

  let match;

  while ((match = regex.exec(xml))) {
    const attrs = {};

    for (
      const attr of match[1].matchAll(
        /([A-Za-z_:][\w:.-]*)="([^"]*)"/g
      )
    ) {
      attrs[attr[1]] =
        xmlUnescape(attr[2]);
    }

    if (attrs.Id && attrs.Target) {
      map.set(
        attrs.Id,
        attrs.Target
      );
    }
  }

  return map;
}

/**
 * Parse worksheet
 */
function parseSheet(xml, sharedStrings) {
  const rows = new Map();

  const rowRegex =
    /<row\b([^>]*)>([\s\S]*?)<\/row>/g;

  let rowMatch;

  while ((rowMatch = rowRegex.exec(xml))) {
    const rowNum = Number(
      getAttr(rowMatch[1], 'r')
    );

    if (!rowNum) continue;

    const cells = {};

    const cellRegex =
      /<c\b([^>]*?)(?:>([\s\S]*?)<\/c>|\s*\/>)/g;

    let cellMatch;

    while (
      (cellMatch = cellRegex.exec(
        rowMatch[2]
      ))
    ) {
      const attrs = cellMatch[1];

      const ref = getAttr(
        attrs,
        'r'
      );

      if (!ref) continue;

      const colLetters =
        ref.replace(/\d+$/, '');

      const col =
        colToNumber(colLetters);

      const type =
        getAttr(attrs, 't');

      const body =
        cellMatch[2] || '';

      let value = null;

      // Inline string
      if (type === 'inlineStr') {
        const textMatch =
          body.match(
            /<is>[\s\S]*?<t\b[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/
          );

        value = textMatch
          ? xmlUnescape(
              textMatch[1]
            )
          : '';
      }

      // Normal value
      else {
        const valueMatch =
          body.match(
            /<v>([\s\S]*?)<\/v>/
          );

        const raw =
          valueMatch
            ? xmlUnescape(
                valueMatch[1]
              )
            : null;

        if (
          raw === null ||
          raw === ''
        ) {
          value = null;
        }

        // Shared string
        else if (type === 's') {
          value =
            sharedStrings[
              Number(raw)
            ] ?? '';
        }

        // Boolean
        else if (type === 'b') {
          value = raw === '1';
        }

        // Number / text
        else {
          const number =
            Number(raw);

          value =
            Number.isFinite(number) &&
            raw.trim() !== ''
              ? number
              : raw;
        }
      }

      cells[col] = value;
    }

    rows.set(
      rowNum,
      cells
    );
  }

  return rows;
}

/**
 * Convert Excel serial date to YYYY-MM-DD
 */
function excelSerialToDate(serial) {
  const n = Number(serial);

  if (!Number.isFinite(n)) {
    return null;
  }

  const ms =
    Math.round(
      (n - 25569) *
      86400 *
      1000
    );

  const date =
    new Date(ms);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date
    .toISOString()
    .slice(0, 10);
}

/**
 * Clean text
 */
function cleanText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text =
    String(value)
      .replace(/\s+/g, ' ')
      .trim();

  return text === ''
    ? null
    : text;
}

function normalizeSummaryNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value).trim()
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/,/g, '.');
  const n = Number(text);
  return Number.isFinite(n) ? n : value;
}

/**
 * Normalize employee ID
 */
function normalizeId(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? Math.trunc(number)
    : null;
}

/**
 * Normalize Arabic stage names
 */
function normalizeStage(value) {
  const text =
    cleanText(value);

  if (!text) return null;

  return text
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize Arabic header text for loose matching:
 * strips tashkeel/diacritics, unifies alef/ya/ta-marbuta variants,
 * collapses whitespace, lowercases (for any latin chars).
 */
function normalizeHeader(value) {
  const text = cleanText(value);
  if (!text) return '';
  return text
    .replace(/[\u064B-\u0652\u0670]/g, '') // diacritics
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Column matchers for the "Emp Summary" sheet. Each field is matched against
 * the normalized header text using "all of / none of" keyword rules so the
 * sheet's exact column order doesn't matter.
 */
const EMP_SUMMARY_FIELD_RULES = [
  { field: 'id', any: ['id', 'كود', 'رقم الموظف'] },
  { field: 'name', any: ['اسم'] },
  { field: 'monthly_target', all: ['تارجت'], anyExtra: ['شهري'] },
  { field: 'total_present_days', any: ['اجمالي الحضور', 'إجمالي الحضور', 'ايام الحضور', 'أيام الحضور', 'total present', 'present days', 'total attendance', 'attendance total'] },
  { field: 'total_absence_days', any: ['اجمالي الغياب', 'إجمالي الغياب', 'ايام الغياب', 'أيام الغياب'], none: ['بدون', 'اذن', 'إذن'] },
  { field: 'casual_leave', any: ['عارضه', 'عارضة'] },
  { field: 'leave_with_permission', any: ['اجازه باذن', 'اجازه بإذن', 'اذن', 'إذن'], none: ['بدون'] },
  { field: 'leave_without_permission', any: ['اجازه بدون', 'اجازة بدون', 'غياب بدون', 'بدون اذن', 'بدون إذن'] },
  { field: 'sick_leave', any: ['مرضي', 'مرضي'] },
  { field: 'late_days', all: ['تاخير'], anyExtra: ['يوم', 'ايام'] },
  { field: 'late_hours', all: ['تاخير'], anyExtra: ['ساعه', 'ساعات'] },
  { field: 'overtime_days', all: ['اضافي'], anyExtra: ['يوم', 'ايام'] },
  { field: 'overtime_hours', all: ['اضافي'], anyExtra: ['ساعه', 'ساعات'] },
  { field: 'special_bonus_days', all: ['مكافاه'], anyExtra: ['خاصه'] },
  { field: 'special_deductions', all: ['خصوم'] },
];

function matchEmpSummaryField(headerNormalized, usedFields) {
  for (const rule of EMP_SUMMARY_FIELD_RULES) {
    if (usedFields.has(rule.field)) continue;
    if (rule.all && !rule.all.every(k => headerNormalized.includes(k))) continue;
    if (rule.any && !rule.any.some(k => headerNormalized.includes(k))) continue;
    if (rule.anyExtra && !rule.anyExtra.some(k => headerNormalized.includes(k))) continue;
    if (rule.none && rule.none.some(k => headerNormalized.includes(k))) continue;
    return rule.field;
  }
  return null;
}

/**
 * Parse the optional "Emp Summary" sheet (name variants: "Emp Summary",
 * "Emp Summery", "Employee Summary", etc.) into a map keyed by employee id
 * (falling back to employee name when no id column/value is present).
 */
function parseEmpSummarySheet(files, sharedStrings, workbookXml, rels) {
  const sheetRegex = /<sheet\b([^>]+?)\/>/g;
  let match;
  let rid = null;
  while ((match = sheetRegex.exec(workbookXml))) {
    const name = normalizeHeader(getAttr(match[1], 'name'));
    if (name && name.replace(/\s+/g, '') .match(/^emp\s*summ?e?ry$/i)) {
      rid = getAttr(match[1], 'r:id');
      break;
    }
    if (name && name.includes('summary') && name.includes('emp')) {
      rid = getAttr(match[1], 'r:id');
      break;
    }
  }
  if (!rid) return new Map();

  let target = rels.get(rid);
  if (!target) return new Map();
  target = target.replace(/^\//, '').replace(/^xl\//, '');
  const sheetXml = files.get(`xl/${target}`)?.toString('utf8');
  if (!sheetXml) return new Map();

  const rows = parseSheet(sheetXml, sharedStrings);
  const sortedRows = [...rows.entries()].sort((a, b) => a[0] - b[0]);
  if (!sortedRows.length) return new Map();

  const [, headerRow] = sortedRows[0];
  const fieldByCol = {};
  const usedFields = new Set();
  for (const [col, raw] of Object.entries(headerRow)) {
    const normalized = normalizeHeader(raw);
    if (!normalized) continue;
    const field = matchEmpSummaryField(normalized, usedFields);
    if (field) { fieldByCol[col] = field; usedFields.add(field); }
  }

  const result = new Map();
  for (const [rowNum, cells] of sortedRows) {
    if (rowNum === sortedRows[0][0]) continue; // header row
    const record = {};
    for (const [col, field] of Object.entries(fieldByCol)) {
      record[field] = cells[col] ?? null;
    }
    const id = normalizeId(record.id);
    const name = cleanText(record.name);
    if (id === null && !name) continue;
    const key = id !== null ? `id:${id}` : `name:${name}`;
    result.set(key, record);
  }
  return result;
}

/**
 * Locate a sheet's XML by exact (trimmed, case-insensitive) name and return
 * its parsed rows (Map<rowNum, {col:value}>), or null if not found.
 */
function findSheetRowsByName(files, sharedStrings, workbookXml, rels, targetName) {
  const sheetRegex = /<sheet\b([^>]+?)\/>/g;
  let match;
  let rid = null;
  const wanted = targetName.trim().toLowerCase();
  while ((match = sheetRegex.exec(workbookXml))) {
    const name = getAttr(match[1], 'name');
    if (name && name.trim().toLowerCase() === wanted) {
      rid = getAttr(match[1], 'r:id');
      break;
    }
  }
  if (!rid) return null;
  let target = rels.get(rid);
  if (!target) return null;
  target = target.replace(/^\//, '').replace(/^xl\//, '');
  const sheetXml = files.get(`xl/${target}`)?.toString('utf8');
  if (!sheetXml) return null;
  return parseSheet(sheetXml, sharedStrings);
}

/** Parse a date cell that may be an Excel serial number or a 'DD/MM/YYYY' text string. */
function parseFlexibleDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return excelSerialToDate(value);
  const text = String(value).trim();
  const m = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = `20${y}`;
    return `${y.padStart(4, '0')}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const asNum = Number(text);
  if (Number.isFinite(asNum) && asNum > 0) return excelSerialToDate(asNum);
  return null;
}

/**
 * Parse the supervisor-target sheets: "OPP A", "OPP B", "QC", "File Trail".
 *
 * Each sheet is laid out as one or more side-by-side blocks. Within a block:
 *   - the header row (row containing 'اسم المشرف') has that label in one
 *     column ("snCol"); the column right before it is the day name, and the
 *     one before that is the date.
 *   - the row directly above the header row holds the block/section title in
 *     the same column as snCol (e.g. "اشراف الاستلام A").
 *   - columns after snCol are metric columns, terminated by a "التارجت
 *     اليومي" column and then a "التارجت الشهري" column.
 *
 * Returns an array of { section, supervisorName, entryDate, targetDaily,
 * targetMonthly, metrics } records, one per (block, date) with a non-empty
 * supervisor name.
 */
function parseSupervisorTargetSheet(rows, sheetLabel) {
  if (!rows || !rows.size) return [];
  const rowNums = [...rows.keys()].sort((a, b) => a - b);

  // Find the header row: the first row containing a cell that normalizes to
  // 'اسم المشرف'.
  let headerRowNum = null;
  for (const rn of rowNums) {
    const row = rows.get(rn);
    for (const val of Object.values(row)) {
      if (normalizeHeader(val) === normalizeHeader('اسم المشرف')) {
        headerRowNum = rn;
        break;
      }
    }
    if (headerRowNum) break;
  }
  if (!headerRowNum) return [];

  const headerRow = rows.get(headerRowNum) || {};
  const titleRow = rows.get(headerRowNum - 1) || {};

  // Find every block's supervisor-name column.
  const snCols = [];
  for (const [col, val] of Object.entries(headerRow)) {
    if (normalizeHeader(val) === normalizeHeader('اسم المشرف')) {
      snCols.push(Number(col));
    }
  }
  snCols.sort((a, b) => a - b);

  const records = [];

  snCols.forEach((snCol, idx) => {
    const nextSn = snCols[idx + 1] ?? Infinity;
    const dateCol = snCol - 2;
    const dayCol = snCol - 1;
    const section = cleanText(titleRow[snCol]) || `${sheetLabel} ${idx + 1}`;

    // Find target-daily / target-monthly columns to the right of snCol,
    // bounded by the next block's start.
    let targetDailyCol = null;
    let targetMonthlyCol = null;
    const scanEnd = Number.isFinite(nextSn) ? nextSn : snCol + 30; // bound unbounded (last) block
    for (let c = snCol + 1; c < scanEnd; c++) {
      const h = normalizeHeader(headerRow[c]);
      if (!h) continue;
      if (!targetDailyCol && h.includes('تارجت') && h.includes('يومي')) targetDailyCol = c;
      else if (targetDailyCol && !targetMonthlyCol && h.includes('تارجت') && h.includes('شهري')) {
        targetMonthlyCol = c;
        break;
      }
    }

    // Metric columns: everything strictly between snCol and targetDailyCol
    // (fall back to just before targetMonthlyCol, or the block end).
    const metricEnd = targetDailyCol ?? targetMonthlyCol ?? scanEnd;
    const metricCols = [];
    for (let c = snCol + 1; c < metricEnd; c++) {
      if (headerRow[c] !== undefined) metricCols.push(c);
    }

    for (const rn of rowNums) {
      if (rn <= headerRowNum) continue;
      const row = rows.get(rn);
      if (!row) continue;
      const supervisorName = cleanText(row[snCol]);
      const entryDate = parseFlexibleDate(row[dateCol]);
      if (!supervisorName || !entryDate) continue;

      const metrics = {};
      for (const c of metricCols) {
        const label = cleanText(headerRow[c]);
        if (!label) continue;
        const v = row[c];
        metrics[label] = typeof v === 'number' && Number.isFinite(v) ? v : (v ?? null);
      }

      const targetDaily = targetDailyCol !== null ? row[targetDailyCol] : null;
      const targetMonthly = targetMonthlyCol !== null ? row[targetMonthlyCol] : null;

      records.push({
        section,
        supervisorName,
        entryDate,
        targetDaily: typeof targetDaily === 'number' && Number.isFinite(targetDaily) ? targetDaily : null,
        targetMonthly: typeof targetMonthly === 'number' && Number.isFinite(targetMonthly) ? targetMonthly : null,
        metrics,
      });
    }
  });

  return records;
}

const SUPERVISOR_SHEET_NAMES = ['OPP A', 'OPP B', 'QC', 'File Trail'];

/**
 * Parse all four supervisor-target sheets (OPP A, OPP B, QC, File Trail) if
 * present in the workbook. Returns a flat array of records (see
 * parseSupervisorTargetSheet for shape); sheets that don't exist are skipped
 * silently since they are optional.
 */
function parseSupervisorTargets(files, sharedStrings, workbookXml, rels) {
  const all = [];
  for (const sheetName of SUPERVISOR_SHEET_NAMES) {
    const rows = findSheetRowsByName(files, sharedStrings, workbookXml, rels, sheetName);
    if (!rows) continue;
    all.push(...parseSupervisorTargetSheet(rows, sheetName));
  }
  return all;
}

/**
 * Sheet names accepted for the "leavers" list (employees who left the
 * company). Matched exactly (trimmed, case-insensitive) via
 * findSheetRowsByName.
 */
const LEAVERS_SHEET_NAME = 'المغادرين';

/**
 * Extract employee identities (id + name only) from a sheet that follows the
 * same per-employee block layout as Master (each employee's block starts at
 * the row where column H = 'الحضور', name in column B, id in column C).
 * Used for the "leavers" sheet, where we only need to know *who* is listed,
 * not their daily attendance data.
 */
function extractEmployeeIdentities(rows) {
  const result = [];
  if (!rows) return result;

  const sortedRows = [...rows.entries()].sort((a, b) => a[0] - b[0]);

  for (const [, cells] of sortedRows) {
    const stage = normalizeStage(cells[8]);
    const name = cleanText(cells[2]);

    if (stage !== 'الحضور' || !name) continue;

    const rawId = normalizeId(cells[3]);
    const generatedId = rawId === null || rawId === 0;

    result.push({
      id: generatedId ? null : rawId,
      generatedId,
      name
    });
  }

  return result;
}

/**
 * Parse Master workbook
 */
function parseMasterWorkbook(buffer) {
  const files =
    parseZip(buffer);

  const workbookXml =
    files
      .get('xl/workbook.xml')
      ?.toString('utf8');

  const relsXml =
    files
      .get(
        'xl/_rels/workbook.xml.rels'
      )
      ?.toString('utf8');

  if (
    !workbookXml ||
    !relsXml
  ) {
    throw new Error(
      'ملف XLSX لا يحتوي على Workbook صالح.'
    );
  }

  const rels =
    parseRelationships(
      relsXml
    );

  let masterRid = null;

  const sheetRegex =
    /<sheet\b([^>]+?)\/>/g;

  let sheetMatch;

  while (
    (sheetMatch =
      sheetRegex.exec(
        workbookXml
      ))
  ) {
    const name =
      getAttr(
        sheetMatch[1],
        'name'
      );

    const rid =
      getAttr(
        sheetMatch[1],
        'r:id'
      );

    if (
      name &&
      name.trim().toLowerCase() ===
        'master'
    ) {
      masterRid = rid;
      break;
    }
  }

  if (!masterRid) {
    throw new Error(
      'لم يتم العثور على Sheet باسم Master داخل ملف Excel.'
    );
  }

  let target =
    rels.get(masterRid);

  if (!target) {
    throw new Error(
      'تعذر تحديد ملف Sheet Master.'
    );
  }

  target =
    target
      .replace(/^\//, '')
      .replace(/^xl\//, '');

  const sheetPath =
    `xl/${target}`;

  const sheetXml =
    files
      .get(sheetPath)
      ?.toString('utf8');

  if (!sheetXml) {
    throw new Error(
      'ملف Sheet Master غير موجود داخل Excel.'
    );
  }

  const sharedStrings =
    parseSharedStrings(
      files
        .get(
          'xl/sharedStrings.xml'
        )
        ?.toString('utf8')
    );

  const rows =
    parseSheet(
      sheetXml,
      sharedStrings
    );

  const empSummaryMap = parseEmpSummarySheet(files, sharedStrings, workbookXml, rels);

  /**
   * Master layout
   *
   * B  = Employee Name
   * C  = ID
   * D  = Education
   * E  = Residence
   * F  = Company
   * G  = Shift
   * H  = Stage / Attendance
   *
   * I:AM = Daily dates
   *
   * AN = Total Achievement
   * AO = Total Target
   * AP = Percentage
   * AQ = Bonus Tier
   * AR = Unauthorized Absence
   * AS = Total Absence
   * AT = Work Nature Allowance
   * AU = Department
   */

  const header =
    rows.get(1) || {};

  const dateCols = [];

  // I:AM
  for (
    let col = 9;
    col <= 39;
    col++
  ) {
    const raw =
      header[col];

    const date =
      typeof raw === 'number'
        ? excelSerialToDate(raw)
        : cleanText(raw);

    if (
      date &&
      /^\d{4}-\d{2}-\d{2}$/.test(
        date
      )
    ) {
      dateCols.push({
        col,
        date
      });
    }
  }

  if (!dateCols.length) {
    throw new Error(
      'لم يتم العثور على تواريخ I:AM في الصف الأول من Master.'
    );
  }

  const employees = [];

  let tempId = 900000;

  const sortedRows =
    [...rows.entries()]
      .sort(
        (a, b) =>
          a[0] - b[0]
      );

  for (
    const [rowNum, cells] of
      sortedRows
  ) {
    const stage =
      normalizeStage(
        cells[8]
      );

    const name =
      cleanText(
        cells[2]
      );

    /**
     * Employee block starts from
     * the row where H = الحضور
     */
    if (
      stage !== 'الحضور' ||
      !name
    ) {
      continue;
    }

    let id =
      normalizeId(
        cells[3]
      );

    const generatedId =
      id === null ||
      id === 0;

    if (generatedId) {
      id = tempId++;
    }

    const employee = {
      id,
      generatedId,

      emp_num:
        normalizeId(
          cells[3]
        ) || id,

      name,

      education:
        cleanText(
          cells[4]
        ),

      residence:
        cleanText(
          cells[5]
        ),

      company:
        cleanText(
          cells[6]
        ),

      shift:
        cleanText(
          cells[7]
        ),

      department:
        cleanText(
          cells[47]
        ),

      stages: [],

      summary: {
        total_achievement:
          cells[40] ?? null,

        total_target:
          cells[41] ?? null,

        percentage:
          cells[42] ?? null,

        bonus_tier:
          cells[43] ?? null,

        unauthorized_absence:
          cells[44] ?? null,

        total_absence:
          cells[45] ?? null,

        work_nature_allowance:
          cells[46] ?? null,

        department:
          cleanText(
            cells[47]
          ),

        monthly_target: null,
        total_present_days: null,
        total_absence_days: null,
        casual_leave: null,
        leave_with_permission: null,
        leave_without_permission: null,
        sick_leave: null,
        late_days: null,
        late_hours: null,
        overtime_days: null,
        overtime_hours: null,
        special_bonus_days: null,
        special_deductions: null,
      }
    };

    // Merge in "Emp Summary" sheet fields, matched by employee id first,
    // falling back to matching by name.
    const empSummaryRecord =
      empSummaryMap.get(`id:${employee.id}`) ||
      empSummaryMap.get(`name:${name}`);
    if (empSummaryRecord) {
      for (const key of [
        'monthly_target', 'total_present_days', 'total_absence_days',
        'casual_leave', 'leave_with_permission', 'leave_without_permission',
        'sick_leave', 'late_days', 'late_hours', 'overtime_days',
        'overtime_hours', 'special_bonus_days', 'special_deductions',
      ]) {
        if (empSummaryRecord[key] !== undefined && empSummaryRecord[key] !== null) {
          employee.summary[key] = normalizeSummaryNumber(empSummaryRecord[key]);
        }
      }
    }

    /**
     * Each employee occupies
     * 17 rows.
     */
    for (
      let r = rowNum;
      r <= rowNum + 16;
      r++
    ) {
      const row =
        rows.get(r);

      if (!row) continue;

      const stageName =
        normalizeStage(
          row[8]
        );

      if (!stageName) {
        continue;
      }

      const daily = {};

      for (
        const { col, date } of
          dateCols
      ) {
        const value =
          row[col];

        if (
          value !== null &&
          value !== undefined &&
          value !== ''
        ) {
          daily[date] =
            value;
        }
      }

      employee.stages.push({
        role: stageName,
        daily
      });
    }

    employees.push(
      employee
    );
  }

  if (!employees.length) {
    throw new Error(
      'لم يتم العثور على أي موظفين في Sheet Master. تأكد أن صف بداية كل موظف يحتوي على "الحضور" في العمود H.'
    );
  }

  const supervisorTargets = parseSupervisorTargets(files, sharedStrings, workbookXml, rels);

  // Optional "leavers" sheet (المغادرين): if present, lists employees who
  // left the company. Used by the caller to mark employee status
  // (active / left / archive) — never fails the import if missing/malformed.
  let leavers = [];
  try {
    const leaverRows = findSheetRowsByName(files, sharedStrings, workbookXml, rels, LEAVERS_SHEET_NAME);
    leavers = extractEmployeeIdentities(leaverRows);
  } catch (e) { /* non-fatal: leavers sheet is optional */ }

  return {
    employees,
    dates:
      dateCols.map(
        item => item.date
      ),
    supervisorTargets,
    leavers
  };
}

module.exports = {
  parseMasterWorkbook
};
