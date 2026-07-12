/**
 * KIND App API — parent login + child attendance, over the goDs University sheet.
 *
 * Follows the same pattern as the site's Form Hub (Apps Script web app, Sheets storage).
 * Deploy: Extensions → Apps Script on the goDs University spreadsheet (or standalone with
 * SHEET_ID script property) → Deploy → Web app → Execute as: Me · Access: Anyone.
 * See SETUP.md in this folder.
 *
 * Script properties required:
 *   SHEET_ID     — the goDs University spreadsheet id (omit if container-bound)
 *   APP_NAME     — e.g. "KIND App" (used in OTP emails)
 *
 * Tabs used (created automatically if missing):
 *   parents        parent_email | phone | children_codes | parent_name | created
 *   kind_otp       email | code | expires
 *   kind_sessions  token | email | created | expires
 *   kind_checkins  ts | email | day | streak | gems
 * Tabs read (must exist — part of goDs University workbook):
 *   students       kin_no | code | code_full | first_name | middle_name | last_name | dob | pathway | whatsapp | fees_balance
 *   gpa_records    week | week_date | god_code | student_name | pathway | weekly_report | time_sheet | pathway_score | activity | attendance | invested_minutes
 *   report_records week | week_date | god_code | student_name | pathway | instructor_note | parent_action | growth_area | celebration | follow_up_status
 */

const OTP_TTL_MIN = 15;
const SESSION_TTL_DAYS = 60;

function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name, headers) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}

function rows_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const head = values[0].map((h) => String(h).trim());
  return values.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function norm_(s) { return String(s || '').trim().toLowerCase(); }

/* ------------------------------------------------------------------ auth -- */

function requestCode_(email) {
  email = norm_(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'invalid_email' };
  const parent = rows_('parents').find((p) => norm_(p.parent_email) === email);
  if (!parent) return { ok: false, error: 'unknown_email' };

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const sh = sheet_('kind_otp', ['email', 'code', 'expires']);
  sh.appendRow([email, code, new Date(Date.now() + OTP_TTL_MIN * 60000)]);
  const app = PropertiesService.getScriptProperties().getProperty('APP_NAME') || 'KIND App';
  MailApp.sendEmail({
    to: email,
    subject: `${code} — your ${app} sign-in code`,
    htmlBody:
      `<p>Hello${parent.parent_name ? ' ' + parent.parent_name : ''},</p>` +
      `<p>Your ${app} sign-in code is</p>` +
      `<p style="font-size:32px;font-weight:800;letter-spacing:6px">${code}</p>` +
      `<p>It expires in ${OTP_TTL_MIN} minutes. Raising goDs, building nations. 🌿</p>`,
  });
  return { ok: true };
}

function verifyCode_(email, code) {
  email = norm_(email);
  const now = new Date();
  const valid = rows_('kind_otp').some(
    (r) => norm_(r.email) === email && String(r.code) === String(code).trim() && new Date(r.expires) > now,
  );
  if (!valid) return { ok: false, error: 'bad_code' };
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  sheet_('kind_sessions', ['token', 'email', 'created', 'expires']).appendRow([
    token, email, now, new Date(now.getTime() + SESSION_TTL_DAYS * 864e5),
  ]);
  return { ok: true, token };
}

function sessionEmail_(token) {
  if (!token) return null;
  const now = new Date();
  const s = rows_('kind_sessions').find((r) => r.token === token && new Date(r.expires) > now);
  return s ? norm_(s.email) : null;
}

/* ---------------------------------------------------------------- family -- */

function family_(token) {
  const email = sessionEmail_(token);
  if (!email) return { ok: false, error: 'unauthorized' };
  const parent = rows_('parents').find((p) => norm_(p.parent_email) === email);
  if (!parent) return { ok: false, error: 'unknown_email' };

  const codes = String(parent.children_codes || '').split(/[,;\s]+/).filter(Boolean);
  const students = rows_('students');
  const gpa = rows_('gpa_records');
  const reports = rows_('report_records');

  const children = codes.map((code) => {
    const stu = students.find((s) => String(s.code) === code || String(s.code_full) === code) || {};
    const att = gpa
      .filter((g) => String(g.god_code) === code)
      .map((g) => ({
        week: g.week, week_date: g.week_date, attendance: Number(g.attendance) || 0,
        invested_minutes: Number(g.invested_minutes) || 0, activity: g.activity, pathway_score: g.pathway_score,
      }));
    const reps = reports
      .filter((r) => String(r.god_code) === code)
      .map((r) => ({
        week: r.week, week_date: r.week_date, parent_action: r.parent_action,
        celebration: r.celebration, growth_area: r.growth_area, follow_up_status: r.follow_up_status,
      }));
    const present = att.filter((a) => a.attendance === 1).length;
    return {
      code,
      name: [stu.first_name, stu.last_name].filter(Boolean).join(' ') || code,
      pathway: stu.pathway || '',
      kin_no: stu.kin_no || '',
      summary: {
        weeks: att.length, present,
        rate: att.length ? Math.round((100 * present) / att.length) : null,
        minutes: att.reduce((t, a) => t + a.invested_minutes, 0),
      },
      attendance: att.slice(-12),
      reports: reps.slice(-6),
    };
  });

  return { ok: true, parent: { email, name: parent.parent_name || '' }, children };
}

/* --------------------------------------------------------------- checkin -- */

function checkin_(p) {
  const email = sessionEmail_(p.token);
  if (!email) return { ok: false, error: 'unauthorized' };
  sheet_('kind_checkins', ['ts', 'email', 'day', 'streak', 'gems']).appendRow([
    new Date(), email, p.day || '', p.streak || '', p.gems || '',
  ]);
  return { ok: true };
}

/* ------------------------------------------------------------ dispatchers -- */

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    switch (p.action) {
      case 'family': return json_(family_(p.token));
      case 'ping': return json_({ ok: true, service: 'KIND App API' });
      default: return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  try {
    switch (p.action) {
      case 'request_code': return json_(requestCode_(p.email));
      case 'verify_code': return json_(verifyCode_(p.email, p.code));
      case 'checkin': return json_(checkin_(p));
      default: return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
