const { google } = require('googleapis');

const SHEET_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function normalizePrivateKey(value = '') {
  return String(value).replace(/\\n/g, '\n').trim();
}

function getSheetConfig() {
  const spreadsheetId = String(process.env.GOOGLE_SHEETS_ID || '').trim();
  const sheetName = String(process.env.GOOGLE_SHEETS_TAB || 'GTshirt Revenue').trim();
  const clientEmail = String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const privateKey = normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '');

  return {
    spreadsheetId,
    sheetName,
    clientEmail,
    privateKey,
    enabled: Boolean(spreadsheetId && clientEmail && privateKey)
  };
}

function getSheetsClient() {
  const { clientEmail, privateKey } = getSheetConfig();
  const auth = new google.auth.JWT(clientEmail, undefined, privateKey, SHEET_SCOPES);
  return google.sheets({ version: 'v4', auth });
}

async function ensureSheetTab(sheets, spreadsheetId, sheetName) {
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetsList = Array.isArray(response.data.sheets) ? response.data.sheets : [];
  const existingSheet = sheetsList.find((sheet) => sheet.properties?.title === sheetName);

  if (existingSheet?.properties?.sheetId !== undefined) {
    return existingSheet.properties.sheetId;
  }

  const createResponse = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: { title: sheetName }
          }
        }
      ]
    }
  });

  const createdSheetId = createResponse.data.replies?.[0]?.addSheet?.properties?.sheetId;
  if (createdSheetId !== undefined) return createdSheetId;

  const refreshed = await sheets.spreadsheets.get({ spreadsheetId });
  const refreshedList = Array.isArray(refreshed.data.sheets) ? refreshed.data.sheets : [];
  const refreshedSheet = refreshedList.find((sheet) => sheet.properties?.title === sheetName);
  return refreshedSheet?.properties?.sheetId;
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

function formatRupiah(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

function formatItemsSummary(value = '') {
  const parts = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!parts.length) return '';
  if (parts.length === 1) return parts[0];
  return `• ${parts.join('\n• ')}`;
}

function buildRevenueSheetValues(rows = [], meta = {}) {
  const summaryHeader = [
    'Total Revenue',
    'Total Orders',
    'Total Items',
    'AOV'
  ];

  const summaryValues = [
    formatRupiah(meta.totalRevenue),
    meta.totalOrders || 0,
    meta.totalItems || 0,
    formatRupiah(meta.averageOrderValue)
  ];

  const detailHeader = [
    'Kode Order',
    'Tanggal',
    'Nama',
    'Status',
    'Total',
    'Item (Qty)',
    'Ringkasan Item'
  ];

  const dataRows = rows.map((row) => ([
    row.orderCode || '',
    formatDateTime(row.createdAt),
    row.customerName || '',
    row.status || '',
    formatRupiah(row.totalAmount),
    Number(row.itemCount) || 0,
    formatItemsSummary(row.itemsSummary)
  ]));

  return {
    values: [
      ['GTshirt Revenue Report'],
      [],
      summaryHeader,
      summaryValues,
      [],
      detailHeader,
      ...dataRows
    ],
    dataRowCount: dataRows.length
  };
}

async function applyRevenueSheetFormatting(sheets, spreadsheetId, sheetId, dataRowCount) {
  if (sheetId === undefined) return;

  const detailStartRow = 5;
  const detailHeaderRow = 5;
  const detailDataStartRow = 6;
  const detailDataEndRow = detailDataStartRow + Math.max(0, dataRowCount);
  const detailEndRow = detailDataEndRow;

  const summaryHeaderRow = 2;
  const summaryValueRow = 3;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          unmergeCells: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 26
            }
          }
        },
        {
          mergeCells: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 7
            },
            mergeType: 'MERGE_ALL'
          }
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 7
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                textFormat: { bold: true, fontSize: 20 }
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat)'
          }
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: summaryHeaderRow,
              endRowIndex: summaryHeaderRow + 1,
              startColumnIndex: 0,
              endColumnIndex: 4
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.19, green: 0.36, blue: 0.29 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: detailHeaderRow,
              endRowIndex: detailHeaderRow + 1,
              startColumnIndex: 0,
              endColumnIndex: 7
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.19, green: 0.36, blue: 0.29 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: detailDataStartRow,
              endRowIndex: detailEndRow,
              startColumnIndex: 0,
              endColumnIndex: 7
            },
            cell: {
              userEnteredFormat: {
                verticalAlignment: 'TOP',
                wrapStrategy: 'WRAP'
              }
            },
            fields: 'userEnteredFormat(verticalAlignment,wrapStrategy)'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 7
            },
            properties: {
              pixelSize: 140
            },
            fields: 'pixelSize'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 1,
              endIndex: 2
            },
            properties: {
              pixelSize: 170
            },
            fields: 'pixelSize'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 6,
              endIndex: 7
            },
            properties: {
              pixelSize: 360
            },
            fields: 'pixelSize'
          }
        }
      ]
    }
  });
}

async function syncRevenueReportToSheet({ rows, meta }) {
  const config = getSheetConfig();
  if (!config.enabled) {
    const error = new Error('Spreadsheet integration not configured');
    error.code = 'SHEETS_NOT_CONFIGURED';
    throw error;
  }

  const sheets = getSheetsClient();
  const sheetId = await ensureSheetTab(sheets, config.spreadsheetId, config.sheetName);

  const { values, dataRowCount } = buildRevenueSheetValues(rows, meta);
  const range = `${config.sheetName}!A1`;

  await sheets.spreadsheets.values.clear({
    spreadsheetId: config.spreadsheetId,
    range: config.sheetName
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  });

  await applyRevenueSheetFormatting(
    sheets,
    config.spreadsheetId,
    sheetId,
    dataRowCount
  );

  return {
    spreadsheetId: config.spreadsheetId,
    sheetName: config.sheetName,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
    rowCount: values.length
  };
}

function isSheetsConfigured() {
  return getSheetConfig().enabled;
}

module.exports = {
  syncRevenueReportToSheet,
  isSheetsConfigured
};
