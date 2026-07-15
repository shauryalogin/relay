import puppeteer from 'puppeteer-core';
import path from 'path';

const TARGET = process.argv[2] || 'http://localhost:5173';

(async () => {
  let browser;
  try {
    console.log("Launching system Chrome...");
    browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Listen to console logs
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
    });

    // Listen to page errors
    page.on('pageerror', err => {
      console.error('[BROWSER RUNTIME ERROR]:', err.toString());
    });

    // Log failed requests with their URLs
    page.on('requestfailed', req => {
      console.error(`[REQUEST FAILED]: ${req.url()} — ${req.failure()?.errorText}`);
    });
    page.on('response', resp => {
      if (resp.status() >= 400) {
        console.error(`[HTTP ${resp.status()}]: ${resp.url()}`);
      }
    });

    console.log(`Navigating to ${TARGET}...`);
    await page.goto(TARGET, { waitUntil: 'networkidle0', timeout: 10000 });

    console.log("Waiting 2 seconds for rendering...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    const screenshotPath = path.resolve('C:\\Users\\administrator\\.gemini\\antigravity-ide\\brain\\ca2f2cfa-2d74-4155-81ff-d05855e004bd\\debug_screenshot.png');
    console.log(`Capturing screenshot to ${screenshotPath}...`);
    await page.screenshot({ path: screenshotPath });

    const title = await page.title();
    console.log(`Page Title: "${title}"`);

  } catch (err) {
    console.error("Script error:", err);
  } finally {
    if (browser) {
      console.log("Closing browser.");
      await browser.close();
    }
  }
})();
