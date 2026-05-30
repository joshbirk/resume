const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;

// ── Canvas ───────────────────────────────────────────────────────────────────

const W = 816;
const H = 1056;
const M = 44; // margin
const CW = W - M * 2; // content width 728

// ── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg:     '#07050a',
  bg2:    '#0c0916',
  bg3:    '#110d1a',
  ink:    '#f0deb8',
  soft:   '#c8a870',
  muted:  '#5a4a38',
  dim:    '#2e1f10',
  cyan:   '#00e5ff',
  cyan2:  '#80f0ff',
  amber:  '#ffaa00',
  orange: '#ff5500',
  grid:   'rgba(0,229,255,0.022)',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function yearX(yr) {
  return M + ((yr - 1997) / 28) * CW;
}

function gridLines() {
  let s = '';
  for (let x = 0; x < W; x += 28)
    s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${C.grid}" stroke-width="1"/>`;
  for (let y = 0; y < H; y += 28)
    s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${C.grid}" stroke-width="1"/>`;
  return s;
}

function secLabel(x, y, text, color = C.orange) {
  return `
    <text x="${x}" y="${y}" font-family="monospace" font-size="7"
      fill="${color}" letter-spacing="3">${text}</text>
    <line x1="${x}" y1="${y + 3}" x2="${x + text.length * 5.8 + 24}" y2="${y + 3}"
      stroke="${color}" stroke-width="0.5" opacity="0.3"/>`;
}

// ── SVG Defs ─────────────────────────────────────────────────────────────────

const defs = `<defs>
  <filter id="fcyan" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="3.5" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="famber" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="3" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="forange" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="5" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="fsoft" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="2" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <linearGradient id="sfGrad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="${C.cyan}" stop-opacity="0.12"/>
    <stop offset="100%" stop-color="${C.cyan}" stop-opacity="0.38"/>
  </linearGradient>
  <radialGradient id="bgGlowTop" cx="50%" cy="0%" r="55%">
    <stop offset="0%" stop-color="${C.orange}" stop-opacity="0.07"/>
    <stop offset="100%" stop-color="${C.orange}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="bgGlowMid" cx="80%" cy="40%" r="40%">
    <stop offset="0%" stop-color="${C.cyan}" stop-opacity="0.04"/>
    <stop offset="100%" stop-color="${C.cyan}" stop-opacity="0"/>
  </radialGradient>
</defs>`;

// ── HEADER ────────────────────────────────────────────────────────────────────

const header = `
  <text x="${M}" y="62" font-family="monospace" font-size="38"
    font-weight="bold" fill="${C.ink}" letter-spacing="1">Joshua</text>
  <text x="${M + 175}" y="62" font-family="monospace" font-size="38"
    font-weight="bold" fill="${C.cyan}" filter="url(#fcyan)" letter-spacing="1">Birk</text>

  <text x="${M}" y="80" font-family="monospace" font-size="8.5" fill="${C.muted}"
    letter-spacing="2.5">TECHNOLOGY ADVOCATE  ·  DEVELOPER RELATIONS  ·  AI ADVOCACY</text>

  <a href="mailto:joshua.birk@gmail.com">
    <text x="${W - M}" y="56" font-family="monospace" font-size="8" fill="${C.soft}"
      text-anchor="end">joshua.birk@gmail.com  ·  847-687-9839</text>
  </a>
  <a href="https://linkedin.com/in/joshuabirk" target="_blank">
    <text x="${W - M}" y="70" font-family="monospace" font-size="8" fill="${C.soft}"
      text-anchor="end">linkedin.com/in/joshuabirk  ·  Chicago, IL</text>
  </a>

  <line x1="${M}" y1="93" x2="${W - M}" y2="93" stroke="${C.cyan}"
    stroke-width="0.5" opacity="0.25"/>
`;

// ── TAGLINE ───────────────────────────────────────────────────────────────────

const tagline = `
  <text x="${M}" y="112" font-family="monospace" font-size="10.5" fill="${C.soft}">New technology keeps showing up. The habit has been the same for thirty years:</text>
  <text x="${M}" y="128" font-family="monospace" font-size="10.5" fill="${C.soft}"><tspan fill="${C.cyan}" filter="url(#fsoft)">learn it</tspan>, build something real with it, then <tspan fill="${C.cyan}" filter="url(#fsoft)">explain it to everyone else</tspan>.</text>
`;

// ── TIMELINE ──────────────────────────────────────────────────────────────────
//
// Layout:
//   Section label         Y=132
//   Row A cards  top      Y=150   height=60   bottom=210
//   Row B cards  top      Y=232   height=60   bottom=292
//   BAR_TOP               Y=405
//   BAR center            Y=418
//   BAR_BOTTOM            Y=431
//   Company names         Y=447
//   Wave bands  top       Y=460   height=16   bottom=476
//   Year ticks            Y=484
//   Year labels           Y=496
//   Section bottom        Y=510

const BAR_TOP    = 405;
const BAR_H      = 26;
const BAR_BOT    = BAR_TOP + BAR_H;
const BAR_CENTER = BAR_TOP + BAR_H / 2;

const CARD_W = 138;
const CARD_H = 60;
const ROW_A_Y = 170;
const ROW_B_Y = 252;

// milestone: { year, row, color, filter, title, year_label, sub }
const MILESTONES = [
  {
    year: 1998, row: 'A', color: C.muted, filt: 'fsoft',
    title: 'CGI & Perl',
    sub: 'State Farm intranet',
  },
  {
    year: 2000, row: 'B', color: C.muted, filt: 'fsoft',
    title: 'dHTML Interfaces',
    sub: 'Organic — dHTML UI library',
  },
  {
    year: 2004, row: 'A', color: C.soft, filt: 'fsoft',
    title: 'Client + Server',
    sub: 'Client and server integrations',
  },
  {
    year: 2008, row: 'B', color: C.amber, filt: 'famber',
    title: 'App Store Day 1',
    sub: 'Expense2GO — July 10, 2008',
  },
  {
    year: 2014, row: 'A', color: C.cyan, filt: 'fcyan',
    title: 'Trailhead',
    sub: 'Medals → Project Trailhead in 66 days',
    url: 'https://www.youtube.com/watch?v=ad3Zm08TooU',
  },
  {
    year: 2019, row: 'B', color: C.cyan, filt: 'fcyan',
    title: 'Developer Podcast',
    sub: 'Salesforce Developer Podcast, 2019–2023',
    url: 'https://open.spotify.com/episode/5o5XbFRm9ebsAfEuJeMyGR',
  },
  {
    year: 2022, row: 'A', color: C.orange, filt: 'forange',
    title: 'AI Advocacy',
    sub: 'Agentforce · MCP · Keynotes now',
    url: 'https://www.youtube.com/watch?v=pfS9l863pX8',
  },
];

const COMPANIES = [
  { name: 'State Farm',     start: 1997, end: 1999, color: C.muted,  role: 'Data Specialist' },
  { name: 'Organic',        start: 1999, end: 2001, color: C.dim,    role: 'Sr. Interface Eng.' },
  { name: 'Crate & Barrel', start: 2002, end: 2007, color: C.muted,  role: 'Senior Developer' },
  { name: 'Model Metrics',  start: 2007, end: 2010, color: C.soft,   role: 'Senior Developer' },
  { name: 'Salesforce',     start: 2010, end: 2025, color: C.cyan,   role: 'Developer Evangelist → Senior Director' },
];

const WAVES = [
  { label: 'CGI',    start: 1997, end: 2002, color: C.muted  },
  { label: 'REST',   start: 2010, end: 2014, color: C.cyan   },
  { label: 'IoT',    start: 2014, end: 2016, color: C.soft   },
  { label: 'AI+MCP', start: 2022, end: 2025, color: C.orange },
];

const timelineSvg = (() => {
  let s = '';

  s += secLabel(M, 152, 'OVER THE YEARS');

  // ── Milestone cards + connecting lines ─────────────────────────────

  MILESTONES.forEach(m => {
    const cx = yearX(m.year);
    const cardY = m.row === 'A' ? ROW_A_Y : ROW_B_Y;
    const cardX = cx - CARD_W / 2;
    const cardBot = cardY + CARD_H;

    const cardOpen  = m.url ? `<a href="${m.url}" target="_blank">` : '';
    const cardClose = m.url ? `</a>` : '';

    s += cardOpen;

    // Card shadow glow
    s += `<rect x="${cardX - 2}" y="${cardY - 2}" width="${CARD_W + 4}" height="${CARD_H + 4}"
      fill="${m.color}" opacity="0.04" rx="3"/>`;

    // Card bg
    s += `<rect x="${cardX}" y="${cardY}" width="${CARD_W}" height="${CARD_H}"
      fill="${C.bg2}" rx="2" stroke="${m.color}" stroke-width="0.5" style="stroke-opacity:0.35"/>`;

    // Left accent bar
    s += `<rect x="${cardX}" y="${cardY}" width="3" height="${CARD_H}"
      fill="${m.color}" rx="1" opacity="0.75" filter="url(#${m.filt})"/>`;

    // Year
    s += `<text x="${cardX + 11}" y="${cardY + 16}" font-family="monospace"
      font-size="7.5" fill="${C.muted}" letter-spacing="1">${m.year}</text>`;

    // Title
    s += `<text x="${cardX + 11}" y="${cardY + 32}" font-family="monospace"
      font-size="10" font-weight="bold" fill="${m.color}"
      filter="url(#${m.filt})">${m.title}</text>`;

    // Sub
    s += `<text x="${cardX + 11}" y="${cardY + 47}" font-family="monospace"
      font-size="7.5" fill="${C.soft}">${m.sub}</text>`;

    s += cardClose;

    // Connecting dotted line from card bottom to bar top
    s += `<line x1="${cx}" y1="${cardBot}" x2="${cx}" y2="${BAR_TOP - 6}"
      stroke="${m.color}" stroke-width="1" stroke-dasharray="4 3" opacity="0.45"/>`;

    // Small diamond at top of bar
    const dx = cx, dy = BAR_TOP - 3;
    s += `<polygon points="${dx},${dy - 5} ${dx + 4},${dy} ${dx},${dy + 5} ${dx - 4},${dy}"
      fill="${m.color}" opacity="0.8" filter="url(#${m.filt})"/>`;

    // Dot on bar
    s += `<circle cx="${cx}" cy="${BAR_CENTER}" r="5"
      fill="${C.bg2}" stroke="${m.color}" stroke-width="1.5"/>`;
    s += `<circle cx="${cx}" cy="${BAR_CENTER}" r="2.5"
      fill="${m.color}" filter="url(#${m.filt})"/>`;
  });

  // ── Company segments ───────────────────────────────────────────────

  COMPANIES.forEach(co => {
    const x1 = yearX(co.start);
    const x2 = yearX(co.end);
    const w  = x2 - x1;
    const isSF = co.name === 'Salesforce';

    if (isSF) {
      // Gradient fill for Salesforce
      s += `<rect x="${x1}" y="${BAR_TOP}" width="${w}" height="${BAR_H}"
        fill="url(#sfGrad)"/>`;
      // Glowing top edge
      s += `<line x1="${x1}" y1="${BAR_TOP}" x2="${x2}" y2="${BAR_TOP}"
        stroke="${C.cyan}" stroke-width="2" opacity="0.7"
        filter="url(#fcyan)"/>`;
      // Right end glow (present day)
      s += `<line x1="${x2}" y1="${BAR_TOP}" x2="${x2}" y2="${BAR_BOT}"
        stroke="${C.cyan}" stroke-width="2" opacity="0.9" filter="url(#fcyan)"/>`;
    } else {
      s += `<rect x="${x1}" y="${BAR_TOP}" width="${w}" height="${BAR_H}"
        fill="${co.color}" opacity="0.12"/>`;
      s += `<line x1="${x1}" y1="${BAR_TOP}" x2="${x2}" y2="${BAR_TOP}"
        stroke="${co.color}" stroke-width="0.75" opacity="0.3"/>`;
    }

    // Vertical dividers between companies
    s += `<line x1="${x1}" y1="${BAR_TOP}" x2="${x1}" y2="${BAR_BOT}"
      stroke="${C.bg}" stroke-width="1.5" opacity="0.8"/>`;

    // Company name above bar
    const labelX = x1 + w / 2;
    const shortName = co.name === 'Crate & Barrel' ? 'Crate&Barrel' : co.name;
    if (w > 30) {
      s += `<text x="${labelX}" y="${BAR_TOP - 8}" font-family="monospace"
        font-size="${isSF ? 9 : 7.5}" fill="${isSF ? C.cyan : C.muted}"
        text-anchor="middle" ${isSF ? 'filter="url(#fsoft)"' : ''}>${shortName}</text>`;
    }
  });

  // Main bar outline
  s += `<rect x="${yearX(1997)}" y="${BAR_TOP}" width="${yearX(2025) - yearX(1997)}"
    height="${BAR_H}" fill="none" stroke="${C.muted}" stroke-width="0.5" opacity="0.3"/>`;

  // "NOW" marker at right end
  const nowX = yearX(2025);
  s += `<text x="${nowX + 4}" y="${BAR_CENTER + 4}" font-family="monospace"
    font-size="7" fill="${C.cyan}" filter="url(#fsoft)" letter-spacing="1">NOW</text>`;

  // ── Tech wave bands ────────────────────────────────────────────────

  const WAVE_TOP = BAR_BOT + 18;
  const WAVE_H   = 16;

  WAVES.forEach(wv => {
    const x1 = yearX(wv.start);
    const x2 = yearX(wv.end);
    const w  = x2 - x1;
    const isCurrent = wv.label === 'AI+MCP';

    s += `<rect x="${x1}" y="${WAVE_TOP}" width="${w}" height="${WAVE_H}"
      fill="${wv.color}" opacity="${isCurrent ? 0.22 : 0.1}" rx="2"
      ${isCurrent ? `filter="url(#forange)"` : ''}/>`;

    s += `<rect x="${x1}" y="${WAVE_TOP}" width="${w}" height="${WAVE_H}"
      fill="none" stroke="${wv.color}" stroke-width="0.75" rx="2"
      opacity="${isCurrent ? 0.7 : 0.3}"/>`;

    if (w > 18) {
      s += `<text x="${x1 + w / 2}" y="${WAVE_TOP + 11}" font-family="monospace"
        font-size="7.5" fill="${wv.color}" text-anchor="middle"
        letter-spacing="1" ${isCurrent ? 'filter="url(#forange)"' : ''}>${wv.label}</text>`;
    }
  });

  // ── Year axis ──────────────────────────────────────────────────────

  const TICK_Y  = WAVE_TOP + WAVE_H + 8;
  const LABEL_Y = TICK_Y + 12;

  [1997, 2000, 2005, 2010, 2015, 2020, 2025].forEach(yr => {
    const tx = yearX(yr);
    s += `<line x1="${tx}" y1="${TICK_Y}" x2="${tx}" y2="${TICK_Y + 5}"
      stroke="${C.muted}" stroke-width="0.75"/>`;
    s += `<text x="${tx}" y="${LABEL_Y}" font-family="monospace"
      font-size="7.5" fill="${C.muted}" text-anchor="middle">${yr}</text>`;
  });

  return s;
})();

// ── DIVIDER ───────────────────────────────────────────────────────────────────

function divider(y, color = C.cyan) {
  return `<line x1="${M}" y1="${y}" x2="${W - M}" y2="${y}"
    stroke="${color}" stroke-width="0.5" opacity="0.12"/>`;
}

// ── TOOLKIT ───────────────────────────────────────────────────────────────────

const SKILLS_Y = 630;

const SKILL_GROUPS = [
  {
    label: 'DevRel & Advocacy', color: C.amber,
    items: ['Public Speaking','Workshop Design','Podcast Production','Technical Writing','Community Building','Editorial Direction'],
  },
  {
    label: 'AI & Platform', color: C.cyan,
    items: ['Agentforce','MCP','Prompt Engineering','LLM Integration','RAG','AI Adoption Strategy'],
  },
  {
    label: 'Salesforce', color: C.cyan,
    items: ['Apex','LWC','Flow','Metadata API','SOQL','Salesforce CLI'],
  },
  {
    label: 'Languages', color: C.soft,
    items: ['JS / TS','Python','Rust','Java','Perl','Obj-C','HTML / CSS'],
  },
];

const skillsSvg = (() => {
  let s = '';
  s += secLabel(M, SKILLS_Y - 12, 'TOOLKIT');

  const groupW = CW / SKILL_GROUPS.length;

  SKILL_GROUPS.forEach((g, gi) => {
    const gx = M + gi * groupW;

    s += `<text x="${gx}" y="${SKILLS_Y + 10}" font-family="monospace"
      font-size="8" font-weight="bold" fill="${g.color}" letter-spacing="1">${g.label}</text>`;

    let px = gx;
    let py = SKILLS_Y + 22;

    g.items.forEach(item => {
      const tw = item.length * 5.2 + 14;
      if (px + tw > gx + groupW - 2) { px = gx; py += 18; }

      s += `<rect x="${px}" y="${py}" width="${tw}" height="14"
        fill="${g.color}" opacity="0.12" rx="2"/>`;
      s += `<rect x="${px}" y="${py}" width="${tw}" height="14"
        fill="none" stroke="${g.color}" stroke-width="0.75" rx="2" opacity="0.5"/>`;
      s += `<text x="${px + tw / 2}" y="${py + 10}" font-family="monospace"
        font-size="7" fill="${g.color}" text-anchor="middle" opacity="0.9">${item}</text>`;
      px += tw + 4;
    });
  });

  return s;
})();

// ── SPEAKING ──────────────────────────────────────────────────────────────────

const SPEAK_Y = 518;

const EVENTS = [
  'Dreamforce','TDX','Agentforce World Tours','Mile High Dreamin\'',
  'Forcelandia','True North Dreamin\'','DevOps Dreamin\' London',
  'Dreamin\' In Data','Cactusforce','Midwest Dreamin\'','Snowforce',
];

const speakingSvg = (() => {
  let s = '';
  s += secLabel(M, SPEAK_Y - 12, 'SPOKEN AT');

  let ex = M, ey = SPEAK_Y + 2;
  EVENTS.forEach(ev => {
    const tw = ev.length * 5.8 + 16;
    if (ex + tw > W - M) { ex = M; ey += 20; }
    s += `<rect x="${ex}" y="${ey}" width="${tw}" height="15"
      fill="rgba(0,229,255,0.05)" stroke="${C.cyan}" stroke-width="0.75" rx="2"
      style="stroke-opacity:0.35"/>`;
    s += `<text x="${ex + tw / 2}" y="${ey + 11}" font-family="monospace"
      font-size="8" fill="${C.cyan2}" text-anchor="middle" opacity="0.85">${ev}</text>`;
    ex += tw + 6;
  });

  return s;
})();

// ── QR CTA — built at render time ────────────────────────────────────────────
// ctaSvg is assembled in the async render function after QR is generated
const CTA_Y = 756;
const QR_SIZE = 160;
const QR_X = W / 2 - QR_SIZE / 2;
const QR_Y = CTA_Y + 10;
const FACE_SIZE = 42;

// ── FOOTER ────────────────────────────────────────────────────────────────────

const FOOTER_Y = H - 38;

const footerSvg = `
  <line x1="${M}" y1="${FOOTER_Y - 8}" x2="${W - M}" y2="${FOOTER_Y - 8}"
    stroke="${C.amber}" stroke-width="0.5" opacity="0.12"/>
  <text x="${M}" y="${FOOTER_Y + 8}" font-family="monospace" font-size="7.5"
    fill="${C.muted}">Illinois Wesleyan University  ·  B.A. Psychology &amp; English  ·  1992–1996  ·  Crisis Line Operator, PATH  ·  5 years</text>
  <a href="https://joshbirk.github.io/resume/" target="_blank">
    <text x="${W - M}" y="${FOOTER_Y + 8}" font-family="monospace" font-size="7.5"
      fill="${C.cyan}" text-anchor="end">Chicago, IL  ·  Available Remotely</text>
  </a>
`;

// ── ASSEMBLE SVG ──────────────────────────────────────────────────────────────

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  ${defs}

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#bgGlowTop)"/>
  <rect width="${W}" height="${H}" fill="url(#bgGlowMid)"/>
  ${gridLines()}

  ${header}
  ${tagline}
  ${timelineSvg}

  ${divider(508)}
  ${speakingSvg}

  ${divider(612)}
  ${skillsSvg}

  ${divider(740)}
  ${'${ctaSvg}'}
  ${footerSvg}
</svg>`;

const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; background: ${C.bg}; }
  svg { display: block; }
</style>
</head><body>${svg}</body></html>`;

// ── RENDER ────────────────────────────────────────────────────────────────────

(async () => {
  console.log('Preparing assets...');

  const qrDataUrl = await QRCode.toDataURL('https://joshbirk.github.io/resume/', {
    width: QR_SIZE,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#4db8ff', light: '#03060e' },
  });

  const animeBytes = fs.readFileSync(path.join(DIR, 'images/meanime.png'));
  const animeDataUrl = 'data:image/png;base64,' + animeBytes.toString('base64');

  const ctaSvg = `
    <line x1="${M}" y1="${CTA_Y - 8}" x2="${W - M}" y2="${CTA_Y - 8}"
      stroke="${C.cyan}" stroke-width="0.5" opacity="0.12"/>

    <text x="${W / 2}" y="${CTA_Y + 4}" font-family="monospace" font-size="7"
      fill="${C.orange}" text-anchor="middle" letter-spacing="3">FOR THE FULL PICTURE</text>

    <!-- QR code image -->
    <a href="https://joshbirk.github.io/resume/" target="_blank">
      <image href="${qrDataUrl}" x="${QR_X}" y="${QR_Y}"
        width="${QR_SIZE}" height="${QR_SIZE}"/>
    </a>

    <!-- Anime image centered over QR -->
    <image href="${animeDataUrl}"
      x="${W / 2 - FACE_SIZE / 2}" y="${QR_Y + QR_SIZE / 2 - FACE_SIZE / 2}"
      width="${FACE_SIZE}" height="${FACE_SIZE}"
      clip-path="url(#faceClip)"/>

    <!-- Clip path for rounded corners on face -->
    <clipPath id="faceClip">
      <rect x="${W / 2 - FACE_SIZE / 2}" y="${QR_Y + QR_SIZE / 2 - FACE_SIZE / 2}"
        width="${FACE_SIZE}" height="${FACE_SIZE}" rx="6"/>
    </clipPath>

    <!-- Border around face -->
    <rect x="${W / 2 - FACE_SIZE / 2 - 2}" y="${QR_Y + QR_SIZE / 2 - FACE_SIZE / 2 - 2}"
      width="${FACE_SIZE + 4}" height="${FACE_SIZE + 4}" rx="7"
      fill="${C.bg}" stroke="${C.cyan}" stroke-width="1.5" opacity="0.6"/>
    <image href="${animeDataUrl}"
      x="${W / 2 - FACE_SIZE / 2}" y="${QR_Y + QR_SIZE / 2 - FACE_SIZE / 2}"
      width="${FACE_SIZE}" height="${FACE_SIZE}"
      clip-path="url(#faceClip)"/>

    <!-- URL below QR -->
    <a href="https://joshbirk.github.io/resume/" target="_blank">
      <text x="${W / 2}" y="${QR_Y + QR_SIZE + 18}" font-family="monospace"
        font-size="9" font-weight="bold" fill="${C.cyan}" text-anchor="middle"
        letter-spacing="1" filter="url(#fcyan)">joshbirk.github.io/resume</text>
    </a>
  `;

  const finalSvg = svg
    .replace('${ctaSvg}', ctaSvg);

  console.log('Rendering infographic...');
  const tmpPath = path.join(DIR, '_infographic_tmp.html');
  const finalHtml = html.replace('${ctaSvg}', ctaSvg);
  fs.writeFileSync(tmpPath, finalHtml);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto('file://' + tmpPath, { waitUntil: 'networkidle0' });
  const pdfBytes = await page.pdf({
    width: `${W}px`,
    height: `${H}px`,
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });
  await browser.close();
  fs.unlinkSync(tmpPath);

  const outPath = path.join(DIR, 'joshua-birk-infographic.pdf');
  fs.writeFileSync(outPath, pdfBytes);
  console.log(`Done → ${outPath}`);
})();
