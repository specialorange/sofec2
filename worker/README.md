# Sound of Fractions logging API

A Cloudflare Worker that receives the interaction logs the app sends to
`specialorange.org/api/logging/` and stores them in a Cloudflare D1 database.
Only `/api/*` is routed here; the app itself is static files on DreamHost.

## What it stores

One row per action in the `logs` table: the browser's random `uid`, the action
text, earlier undelivered actions, a JSON snapshot of the rhythm, the browser's
timestamp, the country Cloudflare reports, and the user agent. No names or IP
addresses are stored.

Limits: 64 KB per request, 120 requests per minute per IP. `/api/login`,
`/api/logout` and `/api/getSongs` answer 501, since accounts are not set up.

## Commands

```sh
npm install
npx wrangler login          # once per machine
npm run migrate:remote      # apply migrations/ to the live database
npm run deploy              # publish the Worker
npm run export              # download all logs to logs-YYYY-MM-DD.csv
npm run dev                 # local Worker + local database on :8787
```

There is no public endpoint that reads logs back; export needs your Cloudflare login.
