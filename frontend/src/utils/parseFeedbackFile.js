import * as XLSX from 'xlsx';

const SENSITIVE_COLUMN_PATTERN = /(name|email|phone|mobile|contact|roll|enrol|enroll|reg(istration)?|student id|employee id|address)/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const LONG_ID_PATTERN = /\b[A-Z0-9_-]{8,}\b/gi;

const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';

const cleanValue = (value) => {
  if (isBlank(value)) return '';
  return String(value).replace(/\s+/g, ' ').trim();
};

const redactText = (value) => cleanValue(value)
  .replace(EMAIL_PATTERN, '[redacted-email]')
  .replace(PHONE_PATTERN, '[redacted-number]')
  .replace(LONG_ID_PATTERN, (match) => (/\d/.test(match) ? '[redacted-id]' : match));

const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const normalized = cleanValue(value).replace(/,/g, '');
  if (!normalized || !/^-?\d+(\.\d+)?%?$/.test(normalized)) return null;
  const numeric = Number(normalized.replace('%', ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const getTopValues = (values, limit = 8) => {
  const counts = new Map();
  values.forEach((value) => {
    const cleaned = redactText(value);
    if (!cleaned) return;
    counts.set(cleaned, (counts.get(cleaned) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
};

const summarizeNumericColumn = (values) => {
  const numbers = values.map(toNumber).filter((value) => value !== null);
  if (!numbers.length) return null;

  const sum = numbers.reduce((total, value) => total + value, 0);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);

  return {
    type: 'numeric',
    numericCount: numbers.length,
    average: Number((sum / numbers.length).toFixed(2)),
    min,
    max,
  };
};

const summarizeTextColumn = (values) => {
  const cleanedValues = values.map(redactText).filter(Boolean);
  const longResponses = cleanedValues
    .filter((value) => value.length > 35)
    .slice(0, 10)
    .map((value) => (value.length > 280 ? `${value.slice(0, 277)}...` : value));

  return {
    type: 'text',
    topValues: getTopValues(cleanedValues),
    sampleComments: longResponses,
  };
};

const filterEmptyRows = (rows) => rows.filter((row) => (
  Object.values(row).some((value) => !isBlank(value))
));

export async function parseFeedbackFile(file) {
  if (!file) {
    throw new Error('No file selected');
  }

  const buffer = await file.arrayBuffer();

  try {
    const workbook = XLSX.read(buffer, { type: 'array', raw: false });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error('The uploaded file has no sheets');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = filterEmptyRows(XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }));

    if (!rows.length) {
      throw new Error('The file is empty or has no data rows');
    }

    return rows;
  } catch (error) {
    if (error.message?.includes('empty') || error.message?.includes('no sheets')) {
      throw error;
    }
    throw new Error('Invalid file format. Please upload a valid Excel or CSV file.');
  }
}

export function summarizeFeedbackRows(rows, maxChars = 60000) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No feedback rows found to summarize');
  }

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const visibleColumns = columns.filter((column) => !SENSITIVE_COLUMN_PATTERN.test(column));
  const excludedColumns = columns.filter((column) => SENSITIVE_COLUMN_PATTERN.test(column));

  const columnSummaries = visibleColumns.map((column) => {
    const values = rows.map((row) => row[column]);
    const filledCount = values.filter((value) => !isBlank(value)).length;
    const numericSummary = summarizeNumericColumn(values);

    return {
      column,
      filledCount,
      missingCount: rows.length - filledCount,
      ...(numericSummary && numericSummary.numericCount >= Math.max(3, Math.ceil(filledCount * 0.5))
        ? numericSummary
        : summarizeTextColumn(values)),
    };
  });

  const sampleRows = rows.slice(0, 12).map((row) => (
    Object.fromEntries(visibleColumns.map((column) => [column, redactText(row[column])]))
  ));

  const summary = {
    rowCount: rows.length,
    columnCount: columns.length,
    analyzedColumns: visibleColumns,
    columnsExcludedForPrivacy: excludedColumns,
    columnSummaries,
    sampleRows,
  };

  const serialized = JSON.stringify(summary, null, 2);
  if (serialized.length <= maxChars) return serialized;

  return `${serialized.slice(0, maxChars)}

[Summary truncated to fit the model input limit. The row count and column summaries above are still representative.]`;
}
