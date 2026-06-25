const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzfpAVbULiFaHC-JcJbvyUAe7FJzu2sVX99bmPjQBgJ7floYwDuPULBSarFNx7E91y5/exec';

function generateMembershipId(pincode) {
  const pin3   = String(pincode).slice(-3).padStart(3, '0');
  const rand4  = String(Math.floor(1000 + Math.random() * 9000));
  const year   = String(new Date().getFullYear()).slice(-2);
  return `NF-${year}-${pin3}-${rand4}`;
}

let currentLang = 'ta';

// ── Language ─────────────────────────────────────────────────────────────────

function setLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-ta][data-en]').forEach(el => {
    if (!el.children.length) el.textContent = el.dataset[lang];
  });
  // translate hint sub-spans
  document.querySelectorAll('.hint-filled[data-ta], .hint-edit[data-ta]').forEach(el => {
    el.textContent = el.dataset[lang];
  });
  // textarea placeholders
  document.querySelectorAll('[data-ta-placeholder]').forEach(el => {
    el.placeholder = lang === 'ta' ? el.dataset.taPlaceholder : el.dataset.enPlaceholder;
  });
  document.getElementById('btn-ta').classList.toggle('active', lang === 'ta');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
}

// ── Date input — dd/mm/yyyy mask ──────────────────────────────────────────────

const dojInput = document.getElementById('doj');

dojInput.addEventListener('input', (e) => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 4) v = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4);
  else if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2);
  e.target.value = v;
});

dojInput.addEventListener('keydown', (e) => {
  if (e.key === 'Backspace') {
    const val = dojInput.value;
    if (val.endsWith('/')) {
      e.preventDefault();
      dojInput.value = val.slice(0, -1);
    }
  }
});

function parseDMY(str) {
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y || y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (date.getDate() !== d || date.getMonth() !== m - 1) return null;
  return date;
}

function todayDMY() {
  const t = new Date();
  const dd = String(t.getDate()).padStart(2, '0');
  const mm = String(t.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${t.getFullYear()}`;
}

// ── Pincode auto-fill ─────────────────────────────────────────────────────────

const pincodeInput  = document.getElementById('pincode');
const stateInput    = document.getElementById('state');
const districtInput = document.getElementById('district');
const mlaInput      = document.getElementById('mla_constituency');
const mpInput       = document.getElementById('mp_constituency');
const loader        = document.getElementById('pincode-loader');

function showHint(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hideHint(id) { document.getElementById(id)?.classList.add('hidden'); }

function clearLocation() {
  districtInput.value = ''; mlaInput.value = ''; mpInput.value = '';
  ['district', 'mla_constituency', 'mp_constituency'].forEach(id => {
    document.getElementById(id)?.classList.remove('autofilled');
  });
  hideHint('district-hint'); hideHint('mla-hint'); hideHint('mp-hint');
}

function applyAutofill(district, mla, mp) {
  districtInput.value = district;
  districtInput.classList.add('autofilled');
  showHint('district-hint');
  if (mla) {
    mlaInput.value = mla; mlaInput.classList.add('autofilled'); showHint('mla-hint');
    mpInput.value  = mp;  mpInput.classList.add('autofilled');  showHint('mp-hint');
  }
}

let pincodeTimer = null;
pincodeInput.addEventListener('input', () => {
  const val = pincodeInput.value.replace(/\D/g, '');
  pincodeInput.value = val;
  clearTimeout(pincodeTimer);
  stateInput.value = '';
  clearLocation();
  clearErr('pincode');
  if (val.length === 6) pincodeTimer = setTimeout(() => lookupPincode(val), 450);
});

async function lookupPincode(pin) {
  loader.classList.remove('hidden');
  const local = window.TN_PINCODE_MAP?.[pin];
  try {
    const res  = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();
    if (data[0].Status === 'Success' && data[0].PostOffice.length > 0) {
      const po = data[0].PostOffice[0];
      stateInput.value = po.State;
      applyAutofill(local ? local.district : po.District, local?.mla, local?.mp);
    } else {
      setErr('pincode', currentLang === 'ta' ? 'செல்லுபடியாகாத அஞ்சல் குறியீடு' : 'Invalid pincode');
    }
  } catch {
    if (local) {
      stateInput.value = 'Tamil Nadu';
      applyAutofill(local.district, local.mla, local.mp);
    } else {
      setErr('pincode', currentLang === 'ta' ? 'நெட்வொர்க் பிழை — கைமுறையாக உள்ளிடவும்' : 'Network error — fill manually');
    }
  } finally {
    loader.classList.add('hidden');
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

const MSGS = {
  required: { ta: 'இது கட்டாயமான புலம்',                en: 'This field is required' },
  email:    { ta: 'சரியான மின்னஞ்சல் உள்ளிடவும்',       en: 'Enter a valid email' },
  phone:    { ta: '10 இலக்க கைபேசி எண் உள்ளிடவும்',    en: 'Enter a valid 10-digit number' },
  pincode:  { ta: '6 இலக்க அஞ்சல் குறியீடு உள்ளிடவும்', en: 'Enter a valid 6-digit pincode' },
  date:     { ta: 'சரியான தேதி உள்ளிடவும் (DD/MM/YYYY)', en: 'Enter a valid date (DD/MM/YYYY)' },
  agree:    { ta: 'தொடர ஒப்புக்கொள்ளவும்',              en: 'You must agree to continue' },
};

function setErr(id, msg) {
  const el = document.getElementById(`err-${id}`);
  if (el) el.textContent = msg;
  const inp = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
  inp?.classList.add('invalid');
}
function clearErr(id) {
  const el = document.getElementById(`err-${id}`);
  if (el) el.textContent = '';
  const inp = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
  inp?.classList.remove('invalid');
}

function validateForm() {
  let valid = true;
  const L = currentLang;
  const textFields = ['name','father_name','email','phone','pincode',
                      'state','district','mla_constituency','mp_constituency',
                      'address','doj','referred_by','develop_plan'];

  textFields.forEach(id => {
    clearErr(id);
    const el = document.getElementById(id);
    if (!el?.value.trim()) { setErr(id, MSGS.required[L]); valid = false; }
  });

  const emailEl = document.getElementById('email');
  if (emailEl?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
    setErr('email', MSGS.email[L]); valid = false;
  }
  const phoneEl = document.getElementById('phone');
  if (phoneEl?.value && !/^[6-9][0-9]{9}$/.test(phoneEl.value)) {
    setErr('phone', MSGS.phone[L]); valid = false;
  }
  const pinEl = document.getElementById('pincode');
  if (pinEl?.value && !/^[0-9]{6}$/.test(pinEl.value)) {
    setErr('pincode', MSGS.pincode[L]); valid = false;
  }
  const dojVal = document.getElementById('doj')?.value;
  if (dojVal && !parseDMY(dojVal)) {
    setErr('doj', MSGS.date[L]); valid = false;
  }

  ['gender','education','occupation'].forEach(name => {
    clearErr(name);
    if (!document.querySelector(`input[name="${name}"]:checked`)) {
      setErr(name, MSGS.required[L]); valid = false;
    }
  });

  clearErr('agree');
  if (!document.getElementById('agree').checked) {
    setErr('agree', MSGS.agree[L]); valid = false;
  }

  return valid;
}

// ── Submit ────────────────────────────────────────────────────────────────────

document.getElementById('registration-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) {
    document.querySelector('.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn  = document.getElementById('submit-btn');
  const text = document.getElementById('submit-text');
  const spin = document.getElementById('submit-loader');
  btn.disabled = true;
  text.classList.add('hidden');
  spin.classList.remove('hidden');

  const pincode = document.getElementById('pincode').value.trim();
  const membershipId = generateMembershipId(pincode);

  const dojParsed = parseDMY(document.getElementById('doj').value);
  const payload = {
    membership_id:    membershipId,
    timestamp:        new Date().toISOString(),
    language:         currentLang === 'ta' ? 'Tamil' : 'English',
    name:             document.getElementById('name').value.trim(),
    father_name:      document.getElementById('father_name').value.trim(),
    gender:           document.querySelector('input[name="gender"]:checked').value,
    education:        document.querySelector('input[name="education"]:checked').value,
    occupation:       document.querySelector('input[name="occupation"]:checked').value,
    email:            document.getElementById('email').value.trim(),
    phone:            document.getElementById('phone').value.trim(),
    pincode:          document.getElementById('pincode').value.trim(),
    state:            document.getElementById('state').value.trim(),
    district:         document.getElementById('district').value.trim(),
    mla_constituency: document.getElementById('mla_constituency').value.trim(),
    mp_constituency:  document.getElementById('mp_constituency').value.trim(),
    address:          document.getElementById('address').value.trim(),
    doj:              document.getElementById('doj').value.trim(),
    referred_by:      document.getElementById('referred_by').value.trim(),
    develop_plan:     document.getElementById('develop_plan').value.trim(),
  };

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    console.log('Apps Script response:', result);
    document.getElementById('form-card').classList.add('hidden');
    const sm = document.getElementById('success-msg');
    sm.classList.remove('hidden');
    document.getElementById('membership-id-display').textContent = membershipId;
    setLang(currentLang);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {
    btn.disabled = false;
    text.classList.remove('hidden');
    spin.classList.add('hidden');
    alert(currentLang === 'ta'
      ? 'சமர்ப்பிப்பதில் பிழை. மீண்டும் முயற்சிக்கவும்.'
      : 'Submission failed. Please try again.');
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
setLang('en');
dojInput.value = todayDMY();
