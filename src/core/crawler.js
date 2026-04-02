import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import path from 'path';
import fs from 'fs-extra';

// Use stealth plugin
chromium.use(StealthPlugin());

class Crawler {
  constructor(options = {}) {
    this.browser = null;
    this.context = null;
    this.options = {
      headless: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      proxy: options.proxy || null,
      headers: options.headers || {},
      noImages: options.noImages || false,
      ...options
    };

    // Ensure userAgent is a string and not null/undefined from spread
    if (!this.options.userAgent || typeof this.options.userAgent !== 'string') {
        this.options.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }
  }

  async init() {
    const launchOptions = { headless: this.options.headless };
    if (this.options.proxy) {
        launchOptions.proxy = { server: this.options.proxy };
    }
    
    this.browser = await chromium.launch(launchOptions);
    this.context = await this.browser.newContext({
      userAgent: this.options.userAgent,
      extraHTTPHeaders: this.options.headers
    });
  }

  async crawl(url, crawlOptions = {}) {
    const page = await this.context.newPage();
    
    if (this.options.noImages) {
        await page.route('**/*.{png,jpg,jpeg,gif,svg,webp}', route => route.abort());
    }

    const assets = new Set();
    const links = new Set();
    const apiSnapshots = [];

    // Network Interception to catch dynamic assets and API responses
    page.on('response', async response => {
      const respUrl = response.url();
      const status = response.status();
      const headers = response.headers();
      const contentType = headers['content-type'] || '';
      const request = response.request();
      const resourceType = request.resourceType();

      if (status >= 200 && status < 300) {
        // 1. Logic for traditional assets
        if (contentType.includes('image') || 
            contentType.includes('font') || 
            contentType.includes('video') || 
            contentType.includes('audio') ||
            contentType.includes('javascript') || 
            contentType.includes('css')) {
          assets.add(respUrl);
        }

        // 2. Logic for API Snapshots (XHR/Fetch)
        if (resourceType === 'fetch' || resourceType === 'xhr' || contentType.includes('application/json')) {
            try {
                const body = await response.text();
                apiSnapshots.push({
                    url: respUrl,
                    method: request.method(),
                    contentType,
                    data: body
                });
            } catch (e) {
                // Ignore if body cannot be read
            }
        }
      }
    });

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      
      // Intelligent Auto-Scroll (Phase 4)
      if (crawlOptions.autoScroll) {
          await this.autoScroll(page);
          // Wait a bit for final lazy-loaded assets
          await page.waitForTimeout(1000);
      }

      // Visual Snapshotting (Phase 4)
      if (crawlOptions.screenshot && crawlOptions.screenshotPath) {
          await fs.ensureDir(path.dirname(crawlOptions.screenshotPath));
          await page.screenshot({ path: crawlOptions.screenshotPath, fullPage: true });
      }

      if (crawlOptions.wait) {
          if (typeof crawlOptions.wait === 'number') {
              await page.waitForTimeout(crawlOptions.wait);
          } else {
              await page.waitForSelector(crawlOptions.wait);
          }
      }

      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Traditional link extraction
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try {
            const absoluteLink = new URL(href, url).href;
            links.add(absoluteLink);
          } catch (e) {}
        }
      });

      // Traditional asset extraction
      $('img[src], script[src], link[rel="stylesheet"][href]').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('href');
        if (src) {
           try {
            const absoluteAsset = new URL(src, url).href;
            assets.add(absoluteAsset);
          } catch (e) {}
        }
      });

      return { 
          content, 
          links: Array.from(links), 
          assets: Array.from(assets),
          apiSnapshots 
      };
    } catch (err) {
      console.error(`Error crawling ${url}:`, err.message);
      throw err;
    } finally {
      await page.close();
    }
  }

  async autoScroll(page) {
      await page.evaluate(async () => {
          await new Promise((resolve) => {
              let totalHeight = 0;
              let distance = 100;
              let timer = setInterval(() => {
                  let scrollHeight = document.body.scrollHeight;
                  window.scrollBy(0, distance);
                  totalHeight += distance;

                  if (totalHeight >= scrollHeight) {
                      clearInterval(timer);
                      resolve();
                  }
              }, 100);
          });
      });
  }

  async record(url, onSnapshot) {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ userAgent: this.options.userAgent });
    const page = await context.newPage();

    page.on('response', async response => {
      const respUrl = response.url();
      const status = response.status();
      const headers = response.headers();
      const contentType = headers['content-type'] || '';
      const request = response.request();
      const resourceType = request.resourceType();

      if (status >= 200 && status < 300) {
        if (resourceType === 'fetch' || resourceType === 'xhr' || contentType.includes('application/json')) {
            try {
                const body = await response.text();
                onSnapshot({
                    url: respUrl,
                    method: request.method(),
                    contentType,
                    data: body
                });
            } catch (e) {}
        }
      }
    });

    try {
      await page.goto(url, { waitUntil: 'load' });
      console.log('\n--- GUIDED RECORD MODE ACTIVE ---');
      console.log('Interact with the page in the browser window.');
      console.log('Close the browser window when finished to finalize.');
      
      await new Promise(resolve => browser.on('disconnected', resolve));
    } catch (err) {
      console.error(`Error during recording ${url}:`, err.message);
    } finally {
      if (browser.isConnected()) await browser.close();
    }
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

export default Crawler;
