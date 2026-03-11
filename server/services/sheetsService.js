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
      ['SUMMARY'],
      summaryHeader,
      summaryValues,
      [],
      ['ORDER DETAILS'],
      detailHeader,
      ...dataRows
    ],
    dataRowCount: dataRows.length
  };
}

async function applyRevenueSheetFormatting(sheets, spreadsheetId, sheetId, dataRowCount) {
  if (sheetId === undefined) return;

  const titleRow = 0;
  const summaryLabelRow = 1;
  const summaryHeaderRow = 2;
  const summaryValueRow = 3;
  const detailsLabelRow = 5;
  const detailHeaderRow = 6;
  const detailDataStartRow = 7;
  const detailDataEndRow = detailDataStartRow + Math.max(0, dataRowCount);

  let deleteBandingRequests = [];
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets(properties(sheetId),bandedRanges(bandedRangeId,range))'
    });
    const targetSheet = (meta.data.sheets || []).find(
      (sheet) => sheet.properties?.sheetId === sheetId
    );
    if (Array.isArray(targetSheet?.bandedRanges)) {
      deleteBandingRequests = targetSheet.bandedRanges
        .map((bandedRange) => bandedRange?.bandedRangeId)
        .filter((bandedRangeId) => Number.isFinite(bandedRangeId))
        .map((bandedRangeId) => ({ deleteBanding: { bandedRangeId } }));
    }
  } catch {
    deleteBandingRequests = [];
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        ...deleteBandingRequests,
        {
          unmergeCells: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 7,
              startColumnIndex: 0,
              endColumnIndex: 7
            }
          }
        },
        {
          mergeCells: {
            range: {
              sheetId,
              startRowIndex: titleRow,
              endRowIndex: titleRow + 1,
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
              startRowIndex: titleRow,
              endRowIndex: titleRow + 1,
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
          mergeCells: {
            range: {
              sheetId,
              startRowIndex: summaryLabelRow,
              endRowIndex: summaryLabelRow + 1,
              startColumnIndex: 0,
              endColumnIndex: 4
            },
            mergeType: 'MERGE_ALL'
          }
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: summaryLabelRow,
              endRowIndex: summaryLabelRow + 1,
              startColumnIndex: 0,
              endColumnIndex: 4
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.92, green: 0.94, blue: 0.92 },
                textFormat: { bold: true, fontSize: 11 },
                horizontalAlignment: 'LEFT'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
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
              startRowIndex: summaryValueRow,
              endRowIndex: summaryValueRow + 1,
              startColumnIndex: 0,
              endColumnIndex: 4
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'LEFT',
                textFormat: { bold: true }
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment,textFormat)'
          }
        },
        {
          mergeCells: {
            range: {
              sheetId,
              startRowIndex: detailsLabelRow,
              endRowIndex: detailsLabelRow + 1,
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
              startRowIndex: detailsLabelRow,
              endRowIndex: detailsLabelRow + 1,
              startColumnIndex: 0,
              endColumnIndex: 7
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.92, green: 0.94, blue: 0.92 },
                textFormat: { bold: true, fontSize: 11 },
                horizontalAlignment: 'LEFT'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
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
          addBanding: {
            bandedRange: {
              range: {
                sheetId,
                startRowIndex: detailHeaderRow,
                endRowIndex: detailDataEndRow,
                startColumnIndex: 0,
                endColumnIndex: 7
              },
              rowProperties: {
                headerColor: { red: 0.19, green: 0.36, blue: 0.29 },
                firstBandColor: { red: 0.98, green: 0.99, blue: 0.98 },
                secondBandColor: { red: 0.94, green: 0.96, blue: 0.95 }
              }
            }
          }
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: detailDataStartRow,
              endRowIndex: detailDataEndRow,
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
          updateBorders: {
            range: {
              sheetId,
              startRowIndex: summaryHeaderRow,
              endRowIndex: summaryValueRow + 1,
              startColumnIndex: 0,
              endColumnIndex: 4
            },
            top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0.9, green: 0.9, blue: 0.9 } },
            innerVertical: { style: 'SOLID', width: 1, color: { red: 0.9, green: 0.9, blue: 0.9 } }
          }
        },
        {
          updateBorders: {
            range: {
              sheetId,
              startRowIndex: detailHeaderRow,
              endRowIndex: detailDataEndRow,
              startColumnIndex: 0,
              endColumnIndex: 7
            },
            top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0.9, green: 0.9, blue: 0.9 } },
            innerVertical: { style: 'SOLID', width: 1, color: { red: 0.9, green: 0.9, blue: 0.9 } }
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
              pixelSize: 130
            },
            fields: 'pixelSize'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 1
            },
            properties: {
              pixelSize: 180
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
              startIndex: 2,
              endIndex: 3
            },
            properties: {
              pixelSize: 150
            },
            fields: 'pixelSize'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 3,
              endIndex: 4
            },
            properties: {
              pixelSize: 120
            },
            fields: 'pixelSize'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 4,
              endIndex: 5
            },
            properties: {
              pixelSize: 130
            },
            fields: 'pixelSize'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 5,
              endIndex: 6
            },
            properties: {
              pixelSize: 100
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
              pixelSize: 420
            },
            fields: 'pixelSize'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: titleRow,
              endIndex: titleRow + 1
            },
            properties: {
              pixelSize: 42
            },
            fields: 'pixelSize'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: summaryHeaderRow,
              endIndex: summaryValueRow + 1
            },
            properties: {
              pixelSize: 28
            },
            fields: 'pixelSize'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: detailHeaderRow,
              endIndex: detailHeaderRow + 1
            },
            properties: {
              pixelSize: 28
            },
            fields: 'pixelSize'
          }
        },
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: {
                frozenRowCount: detailHeaderRow + 1
              }
            },
            fields: 'gridProperties.frozenRowCount'
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
