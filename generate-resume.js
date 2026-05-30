const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;

const cvHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:     #07050a;
    --bg2:    #0c0916;
    --ink:    #f0deb8;
    --soft:   #c8a870;
    --muted:  #5a4a38;
    --cyan:   #00e5ff;
    --amber:  #ffaa00;
    --orange: #ff5500;
    --mono:   'Courier New', monospace;
  }

  body {
    width: 8.5in;
    height: 11in;
    background: var(--bg);
    background-image:
      linear-gradient(rgba(0,229,255,0.022) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,229,255,0.022) 1px, transparent 1px),
      radial-gradient(ellipse at 50% 0%, rgba(255,85,0,0.08) 0%, transparent 50%);
    background-size: 28px 28px, 28px 28px, 100% 100%;
    color: var(--ink);
    font-family: var(--mono);
    display: grid;
    grid-template-rows: auto auto 1fr auto auto;
    overflow: hidden;
  }

  /* ── HEADER ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.38in 0.5in 0.22in;
    border-bottom: 1px solid rgba(0,229,255,0.12);
  }

  .header-left h1 {
    font-size: 2rem;
    font-weight: bold;
    letter-spacing: 0.02em;
    line-height: 1;
    color: var(--ink);
  }

  .header-left h1 span {
    color: var(--cyan);
    text-shadow: 0 0 6px var(--cyan), 0 0 20px rgba(0,229,255,0.5);
  }

  .header-left .title {
    font-size: 0.55rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 0.3rem;
  }

  .header-right {
    font-size: 0.58rem;
    color: var(--soft);
    line-height: 1.8;
    text-align: right;
    letter-spacing: 0.04em;
  }

  /* ── TAGLINE ── */
  .tagline {
    padding: 0.18in 0.5in;
    font-size: 0.82rem;
    color: var(--soft);
    line-height: 1.5;
    border-bottom: 1px solid rgba(0,229,255,0.07);
  }

  .tagline em {
    color: var(--cyan);
    font-style: normal;
    text-shadow: 0 0 8px rgba(0,229,255,0.4);
  }

  /* ── MAIN BODY ── */
  .body {
    display: grid;
    grid-template-columns: 1fr 1.1fr 0.9fr;
    padding: 0.22in 0.5in 0;
    gap: 0 0.3in;
    overflow: hidden;
  }

  .col { display: flex; flex-direction: column; gap: 0; }

  .sec-label {
    font-size: 0.5rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 0.28rem;
    margin-top: 0.28in;
    border-bottom: 1px solid rgba(255,85,0,0.2);
    padding-bottom: 0.15rem;
  }

  .sec-label:first-child { margin-top: 0; }

  /* ── TECH TIMELINE (col 1) ── */
  .tech-timeline { display: flex; flex-direction: column; gap: 0; }

  .tech-node {
    display: grid;
    grid-template-columns: 3px 2.2rem 1fr;
    gap: 0 0.5rem;
    padding: 0.2rem 0;
    align-items: stretch;
  }

  .node-line {
    background: rgba(0,229,255,0.15);
    width: 3px;
    position: relative;
  }

  .node-line::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 6px;
    transform: translateX(-50%);
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 6px var(--cyan);
    z-index: 1;
  }

  .tech-node:last-child .node-line::before {
    background: var(--orange);
    box-shadow: 0 0 8px var(--orange), 0 0 20px rgba(255,85,0,0.4);
    width: 11px;
    height: 11px;
  }

  .node-tag {
    font-size: 0.72rem;
    font-weight: bold;
    color: var(--cyan);
    line-height: 1.2;
    padding-top: 0.1rem;
  }

  .tech-node:last-child .node-tag {
    color: var(--orange);
    text-shadow: 0 0 6px rgba(255,85,0,0.5);
  }

  .node-body { padding-top: 0.05rem; }

  .node-year {
    font-size: 0.52rem;
    color: var(--muted);
    letter-spacing: 0.06em;
    line-height: 1;
    margin-bottom: 0.15rem;
  }

  .node-desc {
    font-size: 0.68rem;
    color: var(--soft);
    line-height: 1.4;
  }

  /* ── CAREER BAR (col 1) ── */
  .career-blocks { display: flex; flex-direction: column; gap: 3px; margin-top: 0.1rem; }

  .career-block {
    display: grid;
    grid-template-columns: 3.2rem 1fr auto;
    align-items: center;
    gap: 0.4rem;
  }

  .cb-years {
    font-size: 0.5rem;
    color: var(--muted);
    letter-spacing: 0.04em;
    text-align: right;
  }

  .cb-bar-wrap { position: relative; height: 14px; }

  .cb-bar {
    height: 100%;
    background: rgba(0,229,255,0.12);
    border: 1px solid rgba(0,229,255,0.18);
    position: relative;
    overflow: hidden;
  }

  .cb-fill {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    background: linear-gradient(to right, rgba(0,229,255,0.25), rgba(0,229,255,0.5));
  }

  .cb-name {
    font-size: 0.55rem;
    color: var(--soft);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  /* ── STAT CARDS (col 2) ── */
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
    margin-top: 0.1rem;
  }

  .stat {
    background: var(--bg2);
    border: 1px solid rgba(0,229,255,0.1);
    padding: 0.4rem 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .stat-num {
    font-size: 1.6rem;
    font-weight: bold;
    color: var(--cyan);
    line-height: 1;
    text-shadow: 0 0 10px rgba(0,229,255,0.4);
  }

  .stat-num.amber { color: var(--amber); text-shadow: 0 0 10px rgba(255,170,0,0.4); }
  .stat-num.orange { color: var(--orange); text-shadow: 0 0 10px rgba(255,85,0,0.4); }

  .stat-label {
    font-size: 0.52rem;
    color: var(--muted);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    line-height: 1.3;
  }

  /* ── SELECTED WORK (col 2) ── */
  .work-list { display: flex; flex-direction: column; gap: 0.3rem; }

  .work-item {
    display: grid;
    grid-template-columns: 0.5rem 1fr;
    gap: 0.3rem;
  }

  .work-item::before {
    content: '▸';
    color: var(--amber);
    font-size: 0.6rem;
    margin-top: 0.05rem;
  }

  .work-item p {
    font-size: 0.68rem;
    color: var(--soft);
    line-height: 1.4;
  }

  .work-item strong { color: var(--ink); }

  /* ── SKILLS (col 3) ── */
  .skill-group { margin-bottom: 0.18in; }

  .skill-group h4 {
    font-size: 0.52rem;
    color: var(--amber);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 0.3rem;
  }

  .pills { display: flex; flex-wrap: wrap; gap: 0.2rem; }

  .pill {
    font-size: 0.54rem;
    color: var(--muted);
    border: 1px solid rgba(255,170,0,0.18);
    padding: 0.1rem 0.32rem;
    letter-spacing: 0.04em;
    line-height: 1.5;
  }

  /* ── SPEAKING STRIP ── */
  .speaking-strip {
    padding: 0.14in 0.5in;
    border-top: 1px solid rgba(0,229,255,0.07);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .speaking-label {
    font-size: 0.48rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--orange);
    flex-shrink: 0;
    margin-right: 0.2rem;
  }

  .ev {
    font-size: 0.52rem;
    color: var(--muted);
    border: 1px solid rgba(0,229,255,0.1);
    padding: 0.08rem 0.3rem;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  /* ── FOOTER ── */
  .footer {
    padding: 0.1in 0.5in 0.16in;
    border-top: 1px solid rgba(255,170,0,0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-left {
    font-size: 0.52rem;
    color: var(--muted);
    letter-spacing: 0.06em;
    line-height: 1.7;
  }

  .footer-right {
    font-size: 0.52rem;
    color: var(--muted);
    letter-spacing: 0.06em;
    text-align: right;
    line-height: 1.7;
  }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-left">
    <h1>Joshua <span>Birk</span></h1>
    <div class="title">Technology Advocate &nbsp;·&nbsp; Developer Relations &nbsp;·&nbsp; AI Advocacy</div>
  </div>
  <div class="header-right">
    joshua.birk@gmail.com &nbsp;·&nbsp; 847-687-9839<br/>
    linkedin.com/in/joshuabirk &nbsp;·&nbsp; Chicago, IL
  </div>
</div>

<!-- TAGLINE -->
<div class="tagline">
  New technology keeps showing up. The habit has been the same for thirty years: <em>learn it</em>, build something real with it, then <em>explain it to everyone else</em>.
</div>

<!-- MAIN BODY -->
<div class="body">

  <!-- COL 1: Tech waves + Career bars -->
  <div class="col">

    <div class="sec-label">The Pattern</div>
    <div class="tech-timeline">
      <div class="tech-node">
        <div class="node-line"></div>
        <div class="node-tag">CGI</div>
        <div class="node-body">
          <div class="node-year">1997</div>
          <div class="node-desc">State Farm's first intranet + polling dashboard before AJAX had a name.</div>
        </div>
      </div>
      <div class="tech-node">
        <div class="node-line"></div>
        <div class="node-tag">REST</div>
        <div class="node-body">
          <div class="node-year">2010–14</div>
          <div class="node-desc">Evangelized Salesforce's shift to REST-first APIs — what it meant, what to build with it.</div>
        </div>
      </div>
      <div class="tech-node">
        <div class="node-line"></div>
        <div class="node-tag">IoT</div>
        <div class="node-body">
          <div class="node-year">2014–15</div>
          <div class="node-desc">Ran the Salesforce IoT Zone: demo stations and hands-on workshops for two years.</div>
        </div>
      </div>
      <div class="tech-node">
        <div class="node-line"></div>
        <div class="node-tag">AI+MCP</div>
        <div class="node-body">
          <div class="node-year">2022–now</div>
          <div class="node-desc">Keynotes and workshops on AI agents anchored in real builds — not slides about what AI might do someday.</div>
        </div>
      </div>
    </div>

    <div class="sec-label">Career</div>
    <div class="career-blocks">
      <div class="career-block">
        <div class="cb-years">2010–now</div>
        <div class="cb-bar-wrap" style="flex:1">
          <div class="cb-bar"><div class="cb-fill" style="width:100%"></div></div>
        </div>
        <div class="cb-name">Salesforce</div>
      </div>
      <div class="career-block">
        <div class="cb-years">2007–10</div>
        <div class="cb-bar-wrap" style="flex:1">
          <div class="cb-bar"><div class="cb-fill" style="width:22%"></div></div>
        </div>
        <div class="cb-name">Model Metrics</div>
      </div>
      <div class="career-block">
        <div class="cb-years">2002–07</div>
        <div class="cb-bar-wrap" style="flex:1">
          <div class="cb-bar"><div class="cb-fill" style="width:38%"></div></div>
        </div>
        <div class="cb-name">Crate &amp; Barrel</div>
      </div>
      <div class="career-block">
        <div class="cb-years">1999–01</div>
        <div class="cb-bar-wrap" style="flex:1">
          <div class="cb-bar"><div class="cb-fill" style="width:15%"></div></div>
        </div>
        <div class="cb-name">Organic</div>
      </div>
      <div class="career-block">
        <div class="cb-years">1997–99</div>
        <div class="cb-bar-wrap" style="flex:1">
          <div class="cb-bar"><div class="cb-fill" style="width:14%"></div></div>
        </div>
        <div class="cb-name">State Farm</div>
      </div>
    </div>

  </div>

  <!-- COL 2: Stats + Selected Work -->
  <div class="col">

    <div class="sec-label">By the Numbers</div>
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-num">30</div>
        <div class="stat-label">Years in software</div>
      </div>
      <div class="stat">
        <div class="stat-num">16</div>
        <div class="stat-label">Years at Salesforce</div>
      </div>
      <div class="stat">
        <div class="stat-num amber">66</div>
        <div class="stat-label">Days: idea to Trailhead launch</div>
      </div>
      <div class="stat">
        <div class="stat-num orange">Day 1</div>
        <div class="stat-label">App Store — Expense2GO, 2008</div>
      </div>
      <div class="stat">
        <div class="stat-num">4</div>
        <div class="stat-label">Years hosting the Developer Podcast</div>
      </div>
      <div class="stat">
        <div class="stat-num amber">100s</div>
        <div class="stat-label">Podcast episodes produced</div>
      </div>
    </div>

    <div class="sec-label">Selected Work</div>
    <div class="work-list">
      <div class="work-item"><p><strong>Trailhead prototype</strong> — Built Medals in 2014 to solve a workshop problem. Became Project Trailhead 66 days later.</p></div>
      <div class="work-item"><p><strong>Expense2GO</strong> — Lead developer. Launched July 10, 2008: the day the App Store opened.</p></div>
      <div class="work-item"><p><strong>Salesforce Developer Podcast</strong> — Created, produced, and hosted 2019–2023. Sourced every guest personally.</p></div>
      <div class="work-item"><p><strong>Behind the AI</strong> — Keynote: From Theory to Practice and In Between (Mile High Dreamin' 2025).</p></div>
      <div class="work-item"><p><strong>The Pool At Nowhere</strong> — Closing keynote on mental health and anxiety (Forcelandia 2023).</p></div>
    </div>

  </div>

  <!-- COL 3: Skills -->
  <div class="col">

    <div class="sec-label">Toolkit</div>

    <div class="skill-group">
      <h4>DevRel &amp; Advocacy</h4>
      <div class="pills">
        <span class="pill">Public Speaking</span>
        <span class="pill">Workshop Design</span>
        <span class="pill">Podcast Production</span>
        <span class="pill">Technical Writing</span>
        <span class="pill">Conference Content</span>
        <span class="pill">Community Building</span>
      </div>
    </div>

    <div class="skill-group">
      <h4>AI &amp; Agentforce</h4>
      <div class="pills">
        <span class="pill">Agentforce</span>
        <span class="pill">MCP</span>
        <span class="pill">Prompt Engineering</span>
        <span class="pill">LLM Integration</span>
        <span class="pill">RAG</span>
        <span class="pill">AI Adoption Strategy</span>
      </div>
    </div>

    <div class="skill-group">
      <h4>Salesforce Platform</h4>
      <div class="pills">
        <span class="pill">Apex</span>
        <span class="pill">LWC</span>
        <span class="pill">Flow</span>
        <span class="pill">Metadata API</span>
        <span class="pill">SOQL</span>
        <span class="pill">Salesforce CLI</span>
      </div>
    </div>

    <div class="skill-group">
      <h4>Languages</h4>
      <div class="pills">
        <span class="pill">JavaScript / TS</span>
        <span class="pill">Python</span>
        <span class="pill">Rust</span>
        <span class="pill">Java</span>
        <span class="pill">Perl</span>
        <span class="pill">Objective-C</span>
        <span class="pill">HTML / CSS</span>
      </div>
    </div>

    <div class="sec-label">Education</div>
    <div style="font-size:0.62rem;color:var(--soft);line-height:1.6;">
      Illinois Wesleyan University<br/>
      B.A. Psychology &amp; English<br/>
      1992–1996<br/><br/>
      Crisis Line Operator, PATH<br/>
      Bloomington-Normal, IL · 5 years
    </div>

  </div>

</div>

<!-- SPEAKING STRIP -->
<div class="speaking-strip">
  <span class="speaking-label">Spoken At</span>
  <span class="ev">Dreamforce</span>
  <span class="ev">TDX</span>
  <span class="ev">Agentforce World Tours</span>
  <span class="ev">Mile High Dreamin'</span>
  <span class="ev">Forcelandia</span>
  <span class="ev">True North Dreamin'</span>
  <span class="ev">Dreamin' In Data</span>
  <span class="ev">DevOps Dreamin' London</span>
  <span class="ev">Cactusforce</span>
  <span class="ev">Midwest Dreamin'</span>
  <span class="ev">Snowforce</span>
</div>

<!-- FOOTER -->
<div class="footer">
  <div class="footer-left">
    Illinois Wesleyan University · B.A. Psychology &amp; English · 1992–1996
  </div>
  <div class="footer-right">
    joshbirk.github.io/resume
  </div>
</div>

</body></html>`;

(async () => {
  console.log('Preparing assets...');

  const qrDataUrl = await QRCode.toDataURL('https://joshbirk.github.io/resume/', {
    width: 500,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#4db8ff', light: '#03060e' },
  });

  const animeBytes = fs.readFileSync(path.join(DIR, 'images/meanime.png'));
  const animeDataUrl = 'data:image/png;base64,' + animeBytes.toString('base64');

  const qrHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 8.5in; height: 11in;
    background: linear-gradient(170deg, #0d1f3c 0%, #071020 40%, #020408 100%);
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 0.15rem; overflow: hidden;
  }
  .qr-wrap { position: relative; width: 500px; height: 500px; flex-shrink: 0; }
  .qr-wrap img.qr { position: absolute; top: 0; left: 0; width: 500px; height: 500px; display: block; }
  .qr-wrap img.face {
    position: absolute; width: 130px; height: 130px;
    top: 50%; left: 50%; transform: translate(-50%, -50%);
    object-fit: cover; border-radius: 12px; border: 4px solid #03060e;
  }
  .url a {
    font-family: monospace; font-size: 1.1rem; font-weight: bold;
    letter-spacing: 0.08em; text-transform: uppercase; color: #000;
    text-decoration: none; display: inline-block; padding: 0.55rem 1.6rem;
    border: 2px solid #00e5ff; background: #00e5ff;
    box-shadow: 0 0 10px rgba(0,229,255,0.6), 0 0 30px rgba(0,229,255,0.25);
  }
</style></head>
<body>
  <div class="qr-wrap">
    <img class="qr" src="${qrDataUrl}" />
    <img class="face" src="${animeDataUrl}" />
  </div>
  <div class="url"><a href="https://joshbirk.github.io/resume/">joshbirk.github.io/resume</a></div>
</body></html>`;

  const browser = await puppeteer.launch({ headless: true });

  // Render CV page
  console.log('Rendering CV...');
  const cvPage = await browser.newPage();
  const cvTmp = path.join(DIR, '_cv_tmp.html');
  fs.writeFileSync(cvTmp, cvHtml);
  await cvPage.goto('file://' + cvTmp, { waitUntil: 'networkidle0' });
  const cvPdfBytes = await cvPage.pdf({
    format: 'Letter', printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });
  fs.unlinkSync(cvTmp);

  // Render QR page
  console.log('Rendering QR...');
  const qrPage = await browser.newPage();
  const qrTmp = path.join(DIR, '_qr_tmp.html');
  fs.writeFileSync(qrTmp, qrHtml);
  await qrPage.goto('file://' + qrTmp, { waitUntil: 'networkidle0' });
  const qrPdfBytes = await qrPage.pdf({
    format: 'Letter', printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });
  fs.unlinkSync(qrTmp);

  await browser.close();

  // Merge: CV first, QR second
  console.log('Merging...');
  const merged = await PDFDocument.create();
  const cvDoc = await PDFDocument.load(cvPdfBytes);
  const qrDoc = await PDFDocument.load(qrPdfBytes);
  const [cvP] = await merged.copyPages(cvDoc, [0]);
  merged.addPage(cvP);
  const [qrP] = await merged.copyPages(qrDoc, [0]);
  merged.addPage(qrP);

  const outPath = path.join(DIR, 'joshua-birk-resume.pdf');
  fs.writeFileSync(outPath, await merged.save());
  console.log(`Done → ${outPath}`);
})();
