// Google Apps Script Web App URL — replace after deploying your Apps Script
const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';

let currentLang = 'ta';

// ── Language toggle ──────────────────────────────────────────────────────────

function setLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-ta][data-en]').forEach(el => {
    el.textContent = el.dataset[lang];
  });

  document.getElementById('btn-ta').classList.toggle('active', lang === 'ta');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
}

// ── Pincode auto-fill ────────────────────────────────────────────────────────

const pincodeInput   = document.getElementById('pincode');
const stateInput     = document.getElementById('state');
const districtInput  = document.getElementById('district');
const mlaInput       = document.getElementById('mla_constituency');
const mpInput        = document.getElementById('mp_constituency');
const loader         = document.getElementById('pincode-loader');

function showHint(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}
function hideHint(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}
function clearConstituency() {
  districtInput.value = '';
  mlaInput.value = '';
  mpInput.value = '';
  districtInput.classList.remove('autofilled', 'editable');
  mlaInput.classList.remove('autofilled', 'editable');
  mpInput.classList.remove('autofilled', 'editable');
  hideHint('district-hint');
  hideHint('mla-hint');
  hideHint('mp-hint');
}

let pincodeTimer = null;

pincodeInput.addEventListener('input', () => {
  const val = pincodeInput.value.replace(/\D/g, '');
  pincodeInput.value = val;

  clearTimeout(pincodeTimer);
  stateInput.value = '';
  clearConstituency();

  if (val.length === 6) {
    pincodeTimer = setTimeout(() => lookupPincode(val), 400);
  }
});

async function lookupPincode(pin) {
  loader.classList.remove('hidden');

  // 1. Try local constituency map first
  const local = window.TN_PINCODE_MAP && window.TN_PINCODE_MAP[pin];

  // 2. Fetch state + district from postal API
  try {
    const res  = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();

    if (data[0].Status === 'Success' && data[0].PostOffice.length > 0) {
      const po = data[0].PostOffice[0];
      stateInput.value    = po.State;
      districtInput.value = local ? local.district : po.District;
      districtInput.classList.add('autofilled', 'editable');
      showHint('district-hint');

      if (local) {
        mlaInput.value = local.mla;
        mpInput.value  = local.mp;
        mlaInput.classList.add('autofilled', 'editable');
        mpInput.classList.add('autofilled', 'editable');
        showHint('mla-hint');
        showHint('mp-hint');
      }
    } else {
      setErr('pincode', currentLang === 'ta'
        ? 'செல்லுபடியாகாத அஞ்சல் குறியீடு'
        : 'Invalid pincode');
    }
  } catch {
    // Offline fallback — use local map if available
    if (local) {
      stateInput.value    = 'Tamil Nadu';
      districtInput.value = local.district;
      mlaInput.value      = local.mla;
      mpInput.value       = local.mp;
      districtInput.classList.add('autofilled', 'editable');
      mlaInput.classList.add('autofilled', 'editable');
      mpInput.classList.add('autofilled', 'editable');
      showHint('district-hint');
      showHint('mla-hint');
      showHint('mp-hint');
    } else {
      setErr('pincode', currentLang === 'ta'
        ? 'நெட்வொர்க் பிழை — கைமுறையாக உள்ளிடவும்'
        : 'Network error — please fill manually');
    }
  } finally {
    loader.classList.add('hidden');
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

const MSGS = {
  required: { ta: 'இது கட்டாயமான புலம்',               en: 'This field is required' },
  email:    { ta: 'சரியான மின்னஞ்சல் முகவரி உள்ளிடவும்', en: 'Enter a valid email address' },
  phone:    { ta: '10 இலக்க கைபேசி எண் உள்ளிடவும்',     en: 'Enter a valid 10-digit mobile number' },
  pincode:  { ta: '6 இலக்க அஞ்சல் குறியீடு உள்ளிடவும்', en: 'Enter a valid 6-digit pincode' },
  agree:    { ta: 'தொடர ஒப்புக்கொள்ளவும்',               en: 'You must agree to continue' },
};

function setErr(fieldId, msg) {
  const el = document.getElementById(`err-${fieldId}`);
  if (el) el.textContent = msg;
  const input = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);
  if (input) input.classList.add('invalid');
}
function clearErr(fieldId) {
  const el = document.getElementById(`err-${fieldId}`);
  if (el) el.textContent = '';
  const input = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);
  if (input) input.classList.remove('invalid');
}

function validateForm() {
  let valid = true;
  const L = currentLang;

  const textFields = ['name', 'father_name', 'email', 'phone', 'pincode',
                      'state', 'district', 'mla_constituency', 'mp_constituency',
                      'address', 'doj', 'referred_by', 'develop_plan'];

  textFields.forEach(id => {
    clearErr(id);
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      setErr(id, MSGS.required[L]);
      valid = false;
    }
  });

  // Email format
  const emailEl = document.getElementById('email');
  if (emailEl && emailEl.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
    setErr('email', MSGS.email[L]);
    valid = false;
  }

  // Phone format
  const phoneEl = document.getElementById('phone');
  if (phoneEl && phoneEl.value && !/^[6-9][0-9]{9}$/.test(phoneEl.value)) {
    setErr('phone', MSGS.phone[L]);
    valid = false;
  }

  // Pincode format
  const pinEl = document.getElementById('pincode');
  if (pinEl && pinEl.value && !/^[0-9]{6}$/.test(pinEl.value)) {
    setErr('pincode', MSGS.pincode[L]);
    valid = false;
  }

  // Radio groups
  ['gender', 'education', 'occupation'].forEach(name => {
    clearErr(name);
    if (!document.querySelector(`input[name="${name}"]:checked`)) {
      setErr(name, MSGS.required[L]);
      valid = false;
    }
  });

  // Checkbox
  clearErr('agree');
  if (!document.getElementById('agree').checked) {
    setErr('agree', MSGS.agree[L]);
    valid = false;
  }

  return valid;
}

// ── Form submission ───────────────────────────────────────────────────────────

document.getElementById('registration-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    document.querySelector('.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn    = document.getElementById('submit-btn');
  const text   = document.getElementById('submit-text');
  const spin   = document.getElementById('submit-loader');
  btn.disabled = true;
  text.classList.add('hidden');
  spin.classList.remove('hidden');

  const payload = {
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
    doj:              document.getElementById('doj').value,
    referred_by:      document.getElementById('referred_by').value.trim(),
    develop_plan:     document.getElementById('develop_plan').value.trim(),
  };

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',  // Apps Script requires no-cors
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // no-cors means we can't read the response — assume success if no throw
    document.getElementById('registration-form').classList.add('hidden');
    document.getElementById('success-msg').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (err) {
    btn.disabled = false;
    text.classList.remove('hidden');
    spin.classList.add('hidden');
    alert(currentLang === 'ta'
      ? 'சமர்ப்பிப்பதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.'
      : 'Submission failed. Please try again.');
  }
});

// ── Init ─────────────────────────────────────────────────────────────────────
setLang('ta');
document.getElementById('doj').valueAsDate = new Date();
