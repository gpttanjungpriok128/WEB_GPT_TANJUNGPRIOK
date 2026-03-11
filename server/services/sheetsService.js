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
  const exists = sheetsList.some((sheet) => sheet.properties?.title === sheetName);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
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
  }
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

function buildRevenueSheetValues(rows = [], meta = {}, filters = {}) {
  const nowLabel = formatDateTime(new Date());
  const statusLabel = String(filters.status || 'all');
  const periodLabel = filters.startDate || filters.endDate
    ? `${filters.startDate || '-'} s/d ${filters.endDate || '-'}`
    : 'Semua periode';

  const summaryRows = [
    ['Total Revenue', formatRupiah(meta.totalRevenue)],
    ['Total Orders', meta.totalOrders || 0],
    ['Total Items', meta.totalItems || 0],
    ['AOV', formatRupiah(meta.averageOrderValue)]
  ];

  const header = [
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

  return [
    ['GTshirt Revenue Report'],
    ['Last Sync', nowLabel],
    ['Filter Status', statusLabel],
    ['Periode', periodLabel],
    [],
    ...summaryRows,
    [],
    header,
    ...dataRows
  ];
}

async function syncRevenueReportToSheet({ rows, meta, filters }) {
  const config = getSheetConfig();
  if (!config.enabled) {
    const error = new Error('Spreadsheet integration not configured');
    error.code = 'SHEETS_NOT_CONFIGURED';
    throw error;
  }

  const sheets = getSheetsClient();
  await ensureSheetTab(sheets, config.spreadsheetId, config.sheetName);

  const values = buildRevenueSheetValues(rows, meta, filters);
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
