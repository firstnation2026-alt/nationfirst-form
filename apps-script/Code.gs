// Nation First — Google Apps Script backend
// Deploy as: Web App → Execute as: Me → Who has access: Anyone
// After deploying, copy the Web App URL into script.js → APPS_SCRIPT_URL

const SHEET_NAME = 'Registrations';

const HEADERS = [
  'Timestamp', 'Language', 'Name', "Father's Name", 'Gender',
  'Education', 'Occupation', 'Email', 'Phone', 'Pincode',
  'State', 'District', 'MLA Constituency', 'MP Constituency',
  'Address', 'Date of Joining', 'Referred By', 'Develop Plan'
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();

    sheet.appendRow([
      data.timestamp,
      data.language,
      data.name,
      data.father_name,
      data.gender,
      data.education,
      data.occupation,
      data.email,
      data.phone,
      data.pincode,
      data.state,
      data.district,
      data.mla_constituency,
      data.mp_constituency,
      data.address,
      data.doj,
      data.referred_by,
      data.develop_plan,
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Nation First registration endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);

    // Style the header row
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#6a0dad');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, HEADERS.length);
  }

  return sheet;
}
