# KIND App

The Kids Inspiring Nation daily family devotional — an installable PWA built from the
gDx Monthly Devotional markdown in this repository.

## Develop

```bash
cd kind-app
npm install
npm run dev        # parses ../series markdown → series.json, starts Vite on :5183
```

## Content pipeline

- `scripts/build-content.mjs` — parses `../series/secrets-of-longevity/` into `src/content/series.json` (runs automatically on `dev`/`build`). New month = new series folder + update the constants at the top.
- `scripts/videos.json` — hand-maintained map of calendar day → YouTube videoId (episodes) and daily Shorts. Update as each night's premiere is published, then rebuild.
- `scripts/make-icons.mjs` — regenerates PNG icons from `public/icon.svg` (only needed if the icon changes).

## Deploy (GitHub Pages)

Push to `main` — `.github/workflows/deploy.yml` builds and publishes `kind-app/dist`
to GitHub Pages. The app uses a relative base path, so it works at the domain root,
`https://<account>.github.io/<repo>/`, or a subpath like `kidsinspiringnation.org/app/`.

To serve it on the main site, either point a custom domain/subdomain (e.g.
`app.kidsinspiringnation.org`) at this repo's Pages, or add a link from the site nav to
the Pages URL.

## Android (Google Play)

The app is a PWA, so Android users can already install it from Chrome
("Add to Home Screen") once it is hosted. For a Play Store listing:

1. Host the app at its final public HTTPS URL (Pages deploy above).
2. Go to https://www.pwabuilder.com, enter the URL, and generate the **Android (Trusted
   Web Activity)** package. It produces an `.aab` (for Play) plus an
   `assetlinks.json`.
3. Put the generated `assetlinks.json` at `public/.well-known/assetlinks.json` in this
   repo and redeploy (this proves domain ownership so the app opens full-screen).
4. Create a Google Play Console account (one-time $25), create the app, upload the
   `.aab`, fill the listing (use `public/icon-512.png`), and submit for review.

Content rating note: select "no user-generated content, no ads"; the app links out to
YouTube for videos.
