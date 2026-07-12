# KIND App API — setup (10 minutes, one time)

The API is a Google Apps Script web app over the **goDs University** spreadsheet — the
same pattern as the site's Form Hub, so nothing new to learn or pay for.

## 1. Add the script

1. Open the **goDs University** Google Sheet → **Extensions → Apps Script**.
2. New script file → paste the contents of `KindAppApi.gs` → Save.
   (Or create a standalone project and set Script Property `SHEET_ID` to the sheet's id.)
3. Project Settings → Script properties → add `APP_NAME` = `KIND App`.

## 2. Add the `parents` tab

Create a sheet tab named `parents` with header row:

| parent_email | phone | children_codes | parent_name | created |
|---|---|---|---|---|
| mama.ehimen@gmail.com | +2348032930572 | gAEM, gRLE | Mrs Ehimen | 2026-07-10 |

- `children_codes` = the child `god_code`s from the `students` tab, comma-separated.
- Tip: sort `students` by `whatsapp` — children sharing a phone number are one family;
  one row per parent email.

## 3. Deploy

Deploy → New deployment → **Web app** → Execute as **Me**, Who has access **Anyone** →
Deploy → copy the `/exec` URL.

## 4. Point the app at it

In `kind-app/src/config.js` set:

```js
export const KIND_API = "https://script.google.com/macros/s/XXXX/exec";
```

Rebuild/push. Without this URL the app still works fully — login simply shows
"coming soon" messaging (demo mode).

## Endpoints (for reference)

- `POST action=request_code&email=…` → emails a 6-digit code (only to addresses in `parents`)
- `POST action=verify_code&email=…&code=…` → `{token}` (60-day session)
- `GET  ?action=family&token=…` → parent + children with attendance (`gpa_records`) and
  teacher reports (`report_records`)
- `POST action=checkin&token=…&day=…&streak=…&gems=…` → logs family devotional completion
  to a `kind_checkins` tab

Security tier: matches the rest of the org's stack (random 64-char bearer tokens in a
sheet, 15-minute OTPs, no passwords stored). Attendance data never ships inside the app
bundle — it is only served to a logged-in parent's own children.
