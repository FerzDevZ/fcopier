import path from 'path';
import PQueue from 'p-queue';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import DB from './db.js';
import Crawler from './crawler.js';
import Downloader from './downloader.js';
import Rewriter from './rewriter.js';
import scanner from '../services/scanner.js';
import chalk from 'chalk';

class FCopier {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.downloadDir = options.downloadDir || path.join(process.cwd(), 'cloned_site');
    this.db = new DB(path.join(this.downloadDir, '.fcopier', 'state.sqlite'));
    
    this.options = {
      concurrency: options.concurrency || 5,
      maxDepth: options.maxDepth || 3,
      autoScroll: options.autoScroll || false,
      screenshot: options.screenshot || false,
      proxy: options.proxy || null,
      headers: options.headers || {},
      userAgent: options.userAgent || null,
      exclude: options.exclude || [],
      include: options.include || [],
      noScripts: options.noScripts || false,
      noImages: options.noImages || false,
      wait: options.wait || 0,
      scan: options.scan || false,
      spinner: options.spinner
    };

    this.crawler = new Crawler({
      headless: true,
      proxy: this.options.proxy,
      userAgent: this.options.userAgent,
      headers: this.options.headers,
      noImages: this.options.noImages
    });

    this.downloader = new Downloader(this.downloadDir);
    this.rewriter = new Rewriter(baseUrl, this.downloadDir);
    this.queue = new PQueue({ concurrency: this.options.concurrency });
    this.spinner = this.options.spinner;
  }

  async start() {
    await this.crawler.init();
    this.db.addUrl(this.baseUrl, 'html', 0);

    let currentTask;
    while ((currentTask = this.db.getNextPendingUrl())) {
      if (currentTask.depth > this.options.maxDepth) {
        this.db.updateStatus(currentTask.url, 'ignored');
        continue;
      }

      if (this.shouldExclude(currentTask.url)) {
        this.db.updateStatus(currentTask.url, 'excluded');
        continue;
      }

      if (this.spinner) this.spinner.text = `Crawling: ${currentTask.url}`;
      else console.log(`Crawling: ${currentTask.url}`);
      
      this.db.updateStatus(currentTask.url, 'crawling');

      try {
        const crawlOptions = {
            autoScroll: this.options.autoScroll,
            screenshot: this.options.screenshot,
            wait: this.options.wait,
            screenshotPath: this.options.screenshot ? path.join(this.downloadDir, '.fcopier', 'snapshots', `${encodeURIComponent(currentTask.url)}.png`) : null
        };

        const { content, assets: interceptedAssets, links, apiSnapshots } = await this.crawler.crawl(currentTask.url, crawlOptions);
        
        // 1. Save API Snapshots (Phase 3)
        for (const snap of apiSnapshots) {
            this.db.saveApiResponse(snap.url, snap.method, snap.contentType, snap.data, currentTask.url);
            
            // NEW: Real-time scan for API responses
            if (this.options.scan) {
                const results = scanner.scanContent(snap.data, `API: ${snap.url}`);
                if (results.length > 0) {
                    console.log(chalk.bold.red(`\n[!] LEAK DETECTED in API response: ${snap.url}`));
                    results.forEach(r => console.log(` - ${r.rule}: ${chalk.yellow(r.match)}`));
                }
            }
        }

        const $ = cheerio.load(content);
        
        // NEW: Real-time scan for HTML content
        if (this.options.scan) {
            const results = scanner.scanContent(content, currentTask.url);
            if (results.length > 0) {
                console.log(chalk.bold.red(`\n[!] LEAK DETECTED in page: ${currentTask.url}`));
                results.forEach(r => console.log(` - ${r.rule}: ${chalk.yellow(r.match)}`));
            }
        }
        
        // 2. Neutralize Scripts (Phase 3 Optimization)
        if (this.options.noScripts) {
            this.neutralizeScripts($);
        }

        // 3. Process intercepted assets (Super Power feature)
        for (const assetUrl of interceptedAssets) {
            this.addAssetToQueue(assetUrl, currentTask.url, currentTask.depth);
        }

        // 4. Traditional asset rewriting in HTML
        $('img[src], script[src], link[rel="stylesheet"][href]').each((i, el) => {
          const attr = $(el).attr('src') ? 'src' : 'href';
          const assetUrlStr = $(el).attr(attr);
          if (assetUrlStr) {
            try {
                const absoluteAssetUrl = new URL(assetUrlStr, currentTask.url).href;
                const localAssetPath = this.rewriter.getUrlToLocalPath(absoluteAssetUrl, currentTask.url);
                
                this.addAssetToQueue(absoluteAssetUrl, currentTask.url, currentTask.depth);

                const relPath = this.rewriter.getRelativePath(this.rewriter.getUrlToLocalPath(currentTask.url, currentTask.url), localAssetPath);
                $(el).attr(attr, relPath);
            } catch (e) {}
          }
        });

        // 5. Process links and rewrite them
        for (const link of links) {
            try {
                const absoluteLink = new URL(link, currentTask.url).href;
                if (absoluteLink.startsWith(this.baseUrl)) {
                  this.db.addUrl(absoluteLink, 'html', currentTask.depth + 1);
                  
                  const localLinkPath = this.rewriter.getUrlToLocalPath(absoluteLink, currentTask.url);
                  const relPath = this.rewriter.getRelativePath(this.rewriter.getUrlToLocalPath(currentTask.url, currentTask.url), localLinkPath);
                  
                  $(`a[href="${link}"]`).attr('href', relPath);
                }
            } catch (e) {}
        }

        // 6. Inject Mock Service (Phase 3 - Placeholder implementation)
        // In a real scenario, this would inject a script that uses the data from DB
        this.injectMockService($, currentTask.url);

        const rewrittenContent = $.html();
        const localHtmlPath = this.rewriter.getUrlToLocalPath(currentTask.url, currentTask.url);
        await this.downloader.saveHtml(rewrittenContent, localHtmlPath);
        
        this.db.updateStatus(currentTask.url, 'crawled', localHtmlPath);
      } catch (err) {
        this.db.updateStatus(currentTask.url, 'failed', null, err.message);
      }
    }

    await this.queue.onIdle();
    await this.crawler.close();
    this.db.close();
  }

  async record(url) {
      await this.crawler.record(url, (snap) => {
          this.db.saveApiResponse(snap.url, snap.method, snap.contentType, snap.data, url);
      });
      console.log('\n--- RECORDING FINALIZED ---');
      console.log(`Captured API responses have been saved to the database.`);
      this.db.close();
  }

  async analyze(url) {
      await this.crawler.init();
      console.log(`\nAnalyzing: ${url}...`);
      try {
          const { links, assets, apiSnapshots } = await this.crawler.crawl(url, { 
              autoScroll: true,
              wait: 2000
          });
          
          console.log(`\n--- Analysis Results for ${url} ---`);
          console.log(`Total Links Found: ${links.length}`);
          console.log(`Total Assets Detected: ${assets.length}`);
          console.log(`API Snapshots Captured: ${apiSnapshots.length}`);
          
          const internalLinks = links.filter(l => l.startsWith(this.baseUrl));
          console.log(`Internal Links: ${internalLinks.length}`);
          console.log(`External Links: ${links.length - internalLinks.length}`);
          
          if (apiSnapshots.length > 0) {
              console.log('\nDetected API Endpoints:');
              apiSnapshots.slice(0, 10).forEach(s => console.log(` - [${s.method}] ${s.url}`));
              if (apiSnapshots.length > 10) console.log(` ... and ${apiSnapshots.length - 10} more`);
          }
      } catch (err) {
          console.error(`Analysis failed: ${err.message}`);
      } finally {
          await this.crawler.close();
      }
  }

  shouldExclude(url) {
      if (this.options.include.length > 0) {
          return !this.options.include.some(pattern => url.includes(pattern));
      }
      return this.options.exclude.some(pattern => url.includes(pattern));
  }

  neutralizeScripts($) {
      const blacklist = [
          'google-analytics.com',
          'googletagmanager.com',
          'facebook.net',
          'recaptcha.net',
          'gstatic.com/recaptcha'
      ];

      $('script[src]').each((i, el) => {
          const src = $(el).attr('src');
          if (blacklist.some(b => src.includes(b))) {
              $(el).remove();
          }
      });

      // Remove common tracking iframes
      $('iframe[src*="google.com/recaptcha"]').remove();
  }

  injectMockService($, currentUrl) {
      // For now, just add a marker. In a real final version, 
      // we'd inject a script that fetches the snapshots from the DB
      $('head').append(`<!-- FCopier Mock Service Active for ${currentUrl} -->`);
  }

  addAssetToQueue(assetUrl, currentUrl, depth) {
    if (this.db.isVisited(assetUrl)) return;
    
    const localAssetPath = this.rewriter.getUrlToLocalPath(assetUrl, currentUrl);
    this.db.addUrl(assetUrl, 'asset', depth);
    
    this.queue.add(async () => {
      try {
        await this.downloader.download(assetUrl, localAssetPath);
        this.db.updateStatus(assetUrl, 'downloaded', localAssetPath);
        
        const fullLocalPath = path.join(this.downloadDir, localAssetPath);
        const manifestPath = fullLocalPath + '.assets.json';
        if (await fs.pathExists(manifestPath)) {
            const nestedAssets = await fs.readJson(manifestPath);
            for (const nestedUrl of nestedAssets) {
                this.addAssetToQueue(nestedUrl, assetUrl, depth);
            }
            await fs.remove(manifestPath);
        }
      } catch (err) {
        this.db.updateStatus(assetUrl, 'failed', null, err.message);
      }
    });
  }
}

export default FCopier;
