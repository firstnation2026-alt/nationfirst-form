# Setup Guide — Nation First Form

## Step 1 — Google Account & Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a **new blank spreadsheet**
2. Name it: `Nation First Registrations`
3. Leave it open — you'll need it in Step 2

---

## Step 2 — Deploy Google Apps Script

1. In the spreadsheet, click **Extensions → Apps Script**
2. Delete any existing code in the editor
3. Copy the entire contents of `apps-script/Code.gs` and paste it
4. Click **Save** (💾 icon), name the project `NationFirstForm`
5. Click **Deploy → New deployment**
6. Click the gear icon ⚙️ next to "Type" and select **Web app**
7. Set:
   - **Description**: Nation First Form v1
   - **Execute as**: Me
   - **Who has access**: Anyone
8. Click **Deploy**
9. If prompted, click **Authorize access** → choose your Google account → Allow
10. **Copy the Web app URL** — it looks like:
    `https://script.google.com/macros/s/XXXXXXXX/exec`

---

## Step 3 — Connect the form to the sheet

Open `script.js` and replace line 2:

```js
const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';
```

with:

```js
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

---

## Step 4 — Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. In this folder, run: `vercel`
3. Follow the prompts (create a new project, defaults are fine)
4. Your form is live at the URL Vercel gives you

**Or** drag-and-drop this folder to [vercel.com/new](https://vercel.com/new)

---

## How data flows

```
User fills form → submits → POST to Apps Script URL
                            → Apps Script appends row to Google Sheet
                            → You can download as Excel anytime:
                              File → Download → Microsoft Excel (.xlsx)
```

---

## Pincode coverage

- **Auto-fill (MLA + MP + District)**: Chennai (600001–600119), Coimbatore (641001–641062), Madurai (625001–625025)
- **Auto-fill (District only)**: All other TN pincodes via `api.postalpincode.in`
- **Manual entry**: MLA/MP fields remain editable for users to correct or fill in

To add more pincodes, edit `data/constituencies.js`.
