const { generateLatex } = require('./latexGenerator');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
      continue;
    }
    args[key] = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const spreadsheetId = args.spreadsheetId || process.env.SPREADSHEET_ID;
  const docId = args.docId || process.env.DOC_ID;
  const token = args.token || process.env.GOOGLE_TOKEN;
  const concurrencyRaw = args.concurrency || process.env.TABLE_FETCH_CONCURRENCY;
  const concurrency = Number.isFinite(Number(concurrencyRaw)) ? Math.max(1, Math.floor(Number(concurrencyRaw))) : 4;

  if (!spreadsheetId || !docId || !token) {
    console.error('Uso: node verify-tables.js --spreadsheetId <id> --docId <id> --token <oauth_token> [--concurrency <n>]');
    process.exitCode = 1;
    return;
  }

  const result = await generateLatex(spreadsheetId, docId, token, { tableFetchConcurrency: concurrency });
  const report = result.tableFetchReport || {};

  console.log(JSON.stringify(report, null, 2));

  const errors = Array.isArray(report.errors) ? report.errors : [];
  if (errors.length > 0) {
    console.error('Tablas con error:');
    errors.slice(0, 50).forEach(e => {
      console.error(`- ${e.titulo} | ${e.range} | ${e.type}${e.status ? ` ${e.status}` : ''} | ${e.message}`);
    });
    if (errors.length > 50) console.error(`... (${errors.length - 50} más)`);
  }

  const empty = Number.isFinite(report.empty) ? report.empty : 0;
  if (errors.length > 0 || empty > 0) {
    process.exitCode = 2;
    return;
  }

  console.log('OK: todas las tablas con rango devolvieron datos.');
}

main().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  process.exitCode = 1;
});

