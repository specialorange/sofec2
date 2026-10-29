// Download every log row from the live D1 database into a CSV file.
// Usage: npm run export            -> logs-YYYY-MM-DD.csv
//        npm run export -- out.csv
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const out = process.argv[2] || `logs-${new Date().toISOString().slice(0, 10)}.csv`;
const cols = ['id', 'received_at', 'uid', 'user_logged_in', 'action', 'unsaved_actions', 'current_state', 'client_time', 'country', 'user_agent'];

const raw = execFileSync(
  'npx',
  ['wrangler', 'd1', 'execute', 'sof-logs', '--remote', '--json', '--command', `SELECT ${cols.join(', ')} FROM logs ORDER BY id`],
  { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }
);
const rows = JSON.parse(raw)[0].results;

const cell = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n';

writeFileSync(out, csv);
console.log(`Wrote ${rows.length} rows to ${out}`);
