// Nation First — Google Apps Script backend
// Deploy as: Web App → Execute as: Me → Who has access: Anyone
// After deploying, copy the Web App URL into script.js → APPS_SCRIPT_URL

const SHEET_NAME = 'Registrations';

// Notifications are sent here. Change to whichever inbox should be alerted.
const NOTIFY_EMAIL = 'firstnation2026@gmail.com';

const HEADERS = [
  'Membership ID', 'Timestamp', 'Language', 'Name', "Father's Name", 'Gender',
  'Education', 'Occupation', 'Email', 'Phone', 'Pincode',
  'State', 'District', 'MLA Constituency', 'MP Constituency',
  'Address', 'Date of Joining', 'Referred By', 'Develop Plan'
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();

    sheet.appendRow([
      data.membership_id,
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

    notifySuccess(data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    notifyError(err, e);
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

// ── Notifications ─────────────────────────────────────────────────────────────
// Personal details are intentionally kept OUT of these emails — they live in the
// sheet. The alert only carries the Membership ID, time, and a link to the sheet.
// Mail failures are swallowed so they can never break a registration.

function notifySuccess(data) {
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'New Nation First registration — ' + data.membership_id,
      body:
        'A new member just registered.\n\n' +
        'Membership ID: ' + data.membership_id + '\n' +
        'Submitted: ' + data.timestamp + '\n\n' +
        'View full details in the sheet:\n' + getSheetUrl(),
    });
  } catch (mailErr) {
    // Never let an email failure affect the registration response.
  }
}

function notifyError(err, e) {
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'Nation First form — submission FAILED',
      body:
        'A registration submission could not be saved.\n\n' +
        'Error: ' + (err && err.message ? err.message : String(err)) + '\n' +
        'Time: ' + new Date().toISOString() + '\n\n' +
        'Open the Apps Script editor → Executions to see the full log.',
    });
  } catch (mailErr) {
    // Swallow — nothing more we can do if mail itself fails.
  }
}

function getSheetUrl() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet().getUrl();
  } catch (e) {
    return '(sheet URL unavailable)';
  }
}
