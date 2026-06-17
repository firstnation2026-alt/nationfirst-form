// Nation First — Google Apps Script backend
// Deploy as: Web App → Execute as: Me → Who has access: Anyone
// After deploying, copy the Web App URL into script.js → APPS_SCRIPT_URL

const SHEET_NAME     = 'Registrations';
const OTP_SHEET_NAME = 'OTP_Store';
const FAST2SMS_KEY   = 'YOUR_FAST2SMS_API_KEY_HERE'; // paste your key here
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

    if (data.action === 'send_otp')   result = handleSendOtp(data.phone);
    else if (data.action === 'verify_otp') result = handleVerifyOtp(data.phone, data.otp);
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

function handleSendOtp(phone) {
  if (!phone || !/^[6-9][0-9]{9}$/.test(phone)) {
    return { status: 'error', message: 'Invalid phone number' };
  }

  const otp     = String(Math.floor(100000 + Math.random() * 900000));
  const expiry  = Date.now() + OTP_TTL_MS;

  storeOtp(phone, otp, expiry);

  const message = `Your Nation First OTP is ${otp}. Valid for 5 minutes. Do not share this with anyone.`;
  const sent    = sendSms(phone, message);

  if (!sent.ok) return { status: 'error', message: sent.error };
  return { status: 'ok' };
}

function sendSms(phone, message) {
  try {
    const url = 'https://www.fast2sms.com/dev/bulkV2';
    const payload = {
      route: 'otp',
      variables_values: message.match(/\d{6}/)[0],
      flash: 0,
      numbers: phone,
    };
    const options = {
      method: 'post',
      headers: {
        authorization: FAST2SMS_KEY,
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };
    const res  = UrlFetchApp.fetch(url, options);
    const body = JSON.parse(res.getContentText());
    if (body.return === true) return { ok: true };
    return { ok: false, error: body.message || 'SMS failed' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Verify OTP ────────────────────────────────────────────────────────────────

function handleVerifyOtp(phone, otp) {
  if (!phone || !otp) return { status: 'error', message: 'Missing phone or OTP' };

  const record = getOtp(phone);
  if (!record) return { status: 'error', message: 'OTP not found. Please request a new one.' };

  if (Date.now() > record.expiry) {
    deleteOtp(phone);
    return { status: 'error', message: 'OTP expired. Please request a new one.' };
  }

  if (record.otp !== String(otp)) {
    return { status: 'error', message: 'Incorrect OTP. Please try again.' };
  }

  deleteOtp(phone);
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

// ── OTP store (separate sheet tab) ───────────────────────────────────────────

function getOtpSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(OTP_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(OTP_SHEET_NAME);
    sheet.appendRow(['Phone', 'OTP', 'Expiry']);
    sheet.hideSheet();
  }
  return sheet;
}

function storeOtp(phone, otp, expiry) {
  const sheet = getOtpSheet();
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(phone)) {
      sheet.getRange(i + 1, 2, 1, 2).setValues([[otp, expiry]]);
      return;
    }
  }
  sheet.appendRow([phone, otp, expiry]);
}

function getOtp(phone) {
  const sheet = getOtpSheet();
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(phone)) {
      return { otp: String(data[i][1]), expiry: Number(data[i][2]) };
    }
  }
  return null;
}

function deleteOtp(phone) {
  const sheet = getOtpSheet();
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(phone)) {
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
