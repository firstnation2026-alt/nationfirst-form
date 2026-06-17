// Nation First — Google Apps Script backend
// Deploy as: Web App → Execute as: Me → Who has access: Anyone
// After deploying, copy the Web App URL into script.js → APPS_SCRIPT_URL

const SHEET_NAME     = 'Registrations';
const OTP_SHEET_NAME = 'OTP_Store';
const OTP_TTL_MS     = 5 * 60 * 1000; // 5 minutes

const HEADERS = [
  'Membership ID', 'Timestamp', 'Language', 'Name', "Father's Name", 'Gender',
  'Education', 'Occupation', 'Email', 'Phone', 'Pincode',
  'State', 'District', 'MLA Constituency', 'MP Constituency',
  'Address', 'Date of Joining', 'Referred By', 'Develop Plan'
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    let result;

    if (data.action === 'send_otp')        result = handleSendOtp(data.email);
    else if (data.action === 'verify_otp') result = handleVerifyOtp(data.email, data.otp);
    else if (data.action === 'register')   result = handleRegister(data);
    else result = { status: 'error', message: 'Unknown action' };

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Send OTP ──────────────────────────────────────────────────────────────────

function handleSendOtp(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Invalid email address' };
  }

  const otp    = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = Date.now() + OTP_TTL_MS;

  storeOtp(email, otp, expiry);

  MailApp.sendEmail({
    to: email,
    subject: 'Your Nation First OTP',
    body:
      'Your OTP for Nation First registration is: ' + otp + '\n\n' +
      'This OTP is valid for 5 minutes. Do not share it with anyone.\n\n' +
      '— Nation First Team',
  });

  return { status: 'ok' };
}

// ── Verify OTP ────────────────────────────────────────────────────────────────

function handleVerifyOtp(email, otp) {
  if (!email || !otp) return { status: 'error', message: 'Missing email or OTP' };

  const record = getOtp(email);
  if (!record) return { status: 'error', message: 'OTP not found. Please request a new one.' };

  if (Date.now() > record.expiry) {
    deleteOtp(email);
    return { status: 'error', message: 'OTP expired. Please request a new one.' };
  }

  if (record.otp !== String(otp)) {
    return { status: 'error', message: 'Incorrect OTP. Please try again.' };
  }

  deleteOtp(email);
  return { status: 'ok' };
}

// ── Register ──────────────────────────────────────────────────────────────────

function handleRegister(data) {
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
  return { status: 'ok' };
}

// ── OTP store (hidden sheet tab) ──────────────────────────────────────────────

function getOtpSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(OTP_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(OTP_SHEET_NAME);
    sheet.appendRow(['Email', 'OTP', 'Expiry']);
    sheet.hideSheet();
  }
  return sheet;
}

function storeOtp(email, otp, expiry) {
  const sheet = getOtpSheet();
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === email.toLowerCase()) {
      sheet.getRange(i + 1, 2, 1, 2).setValues([[otp, expiry]]);
      return;
    }
  }
  sheet.appendRow([email, otp, expiry]);
}

function getOtp(email) {
  const sheet = getOtpSheet();
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === email.toLowerCase()) {
      return { otp: String(data[i][1]), expiry: Number(data[i][2]) };
    }
  }
  return null;
}

function deleteOtp(email) {
  const sheet = getOtpSheet();
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === email.toLowerCase()) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

// ── Registrations sheet ───────────────────────────────────────────────────────

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);

    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#6a0dad');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, HEADERS.length);
  }

  return sheet;
}

function doGet() {
  return ContentService
    .createTextOutput('Nation First registration endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}
