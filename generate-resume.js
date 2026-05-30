const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;

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

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    width: 8.5in;
    height: 11in;
    background: linear-gradient(170deg, #0d1f3c 0%, #071020 40%, #020408 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    overflow: hidden;
  }

  .qr-wrap {
    position: relative;
    width: 500px;
    height: 500px;
    flex-shrink: 0;
  }
  .qr-wrap img.qr {
    position: absolute;
    top: 0; left: 0;
    width: 500px;
    height: 500px;
    display: block;
  }
  .qr-wrap img.face {
    position: absolute;
    width: 130px;
    height: 130px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    object-fit: cover;
    border-radius: 12px;
    border: 4px solid #03060e;
  }

  .url a {
    font-family: monospace;
    font-size: 1.1rem;
    font-weight: bold;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #000000;
    text-decoration: none;
    display: inline-block;
    padding: 0.55rem 1.6rem;
    border: 2px solid #00e5ff;
    background: #00e5ff;
    text-shadow: none;
    box-shadow:
      0 0 10px rgba(0,229,255,0.6),
      0 0 30px rgba(0,229,255,0.25);
  }
</style>
</head>
<body>

  <div class="qr-wrap">
    <img class="qr" src="${qrDataUrl}" />
    <img class="face" src="${animeDataUrl}" />
  </div>

  <div class="url"><a href="https://joshbirk.github.io/resume/">joshbirk.github.io/resume</a></div>

</body></html>`;

  const tmpPath = path.join(DIR, '_qr_tmp.html');
  fs.writeFileSync(tmpPath, html);

  console.log('Rendering...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('file://' + tmpPath, { waitUntil: 'networkidle0' });
  const pdfBytes = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });
  await browser.close();
  fs.unlinkSync(tmpPath);

  const merged = await PDFDocument.create();
  const doc = await PDFDocument.load(pdfBytes);
  const [p] = await merged.copyPages(doc, [0]);
  merged.addPage(p);

  const outPath = path.join(DIR, 'joshua-birk-resume.pdf');
  fs.writeFileSync(outPath, await merged.save());
  console.log(`Done → ${outPath}`);
})();
