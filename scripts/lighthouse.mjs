import fs from 'node:fs';
import path from 'node:path';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

// Audita Início e Detalhe em mobile e desktop, 3x cada, e reporta a mediana.
// Uso: node scripts/lighthouse.mjs [baseUrl]
const BASE = (process.argv[2] || process.env.LH_BASE_URL || 'http://localhost:4173').replace(/\/$/, '');
const PAGES = [
  { name: 'inicio', path: '/' },
  { name: 'detalhe', path: '/nfts/nft-001' },
];
const PROFILES = [
  { name: 'mobile', config: undefined },
  { name: 'desktop', config: desktopConfig },
];
const RUNS = 3;
const CATS = ['performance', 'accessibility', 'best-practices', 'seo'];
const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 };
const OUT = 'lighthouse-reports';

const median = (nums) => {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const results = [];
for (const page of PAGES) {
  for (const prof of PROFILES) {
    const url = `${BASE}${page.path}`;
    const scores = Object.fromEntries(CATS.map((c) => [c, []]));
    for (let run = 1; run <= RUNS; run++) {
      const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] });
      try {
        const runner = await lighthouse(
          url,
          { port: chrome.port, output: ['html', 'json'], onlyCategories: CATS, logLevel: 'error' },
          prof.config,
        );
        const lhr = runner.lhr;
        for (const c of CATS) scores[c].push(Math.round((lhr.categories[c].score ?? 0) * 100));
        const file = path.join(OUT, `${page.name}-${prof.name}-run${run}`);
        fs.writeFileSync(`${file}.html`, runner.report[0]);
        fs.writeFileSync(`${file}.json`, runner.report[1]);
        console.log(`${page.name}/${prof.name} run ${run}: ${CATS.map((c) => `${c} ${scores[c][run - 1]}`).join(' · ')}`);
      } finally {
        await chrome.kill();
      }
    }
    const medians = Object.fromEntries(CATS.map((c) => [c, median(scores[c])]));
    results.push({ page: page.name, profile: prof.name, url, medians, scores });
  }
}

let md = `# Lighthouse\n\nBase: \`${BASE}\` — 3 medições por página/perfil, valores são a mediana. Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.\n\n`;
md += '| Página | Perfil | Performance | Accessibility | Best Practices | SEO |\n|---|---|---:|---:|---:|---:|\n';
for (const r of results) {
  const cell = (c) => `${r.medians[c]}${r.medians[c] >= TARGETS[c] ? '' : ' ⚠️'}`;
  md += `| ${r.page} | ${r.profile} | ${cell('performance')} | ${cell('accessibility')} | ${cell('best-practices')} | ${cell('seo')} |\n`;
}

fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ base: BASE, targets: TARGETS, results }, null, 2));
fs.writeFileSync(path.join(OUT, 'summary.md'), `${md}\n`);
console.log(`\n${md}`);

const below = results.flatMap((r) => CATS.filter((c) => r.medians[c] < TARGETS[c]).map((c) => `${r.page}/${r.profile} ${c}=${r.medians[c]}`));
if (below.length) {
  console.log(`Abaixo da meta: ${below.join(', ')}`);
  process.exitCode = 1;
}
