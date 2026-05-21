import * as XLSX from 'xlsx';

export async function parseFeedbackFile(file) {
  if (!file) {
    throw new Error('No file selected');
  }

  const buffer = await file.arrayBuffer();

  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error('The uploaded file has no sheets');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

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

export function summarizeFeedbackRows(rows, maxChars = 1000000) {
  return JSON.stringify(rows).slice(0, maxChars);
}
