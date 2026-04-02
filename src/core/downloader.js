import axios from 'axios';
import axiosRetry from 'axios-retry';
import fs from 'fs-extra';
import path from 'path';
import * as csstree from 'css-tree';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Configure axios with retry
axiosRetry(axios, { 
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
  }
});

class Downloader {
  constructor(downloadDir, options = {}) {
    this.downloadDir = downloadDir;
    this.proxy = options.proxy || null;
    this.headers = {
      'User-Agent': options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...(options.headers || {})
    };
    
    this.agent = this.proxy ? new HttpsProxyAgent(this.proxy) : null;
  }

  async download(url, localPath) {
    const fullPath = path.join(this.downloadDir, localPath);
    await fs.ensureDir(path.dirname(fullPath));

    try {
      // Intelligent Sync: Check if file exists and headers match
      if (await fs.pathExists(fullPath)) {
          try {
              const headResponse = await axios({
                  method: 'head',
                  url: url,
                  headers: this.headers,
                  timeout: 10000,
                  httpsAgent: this.agent,
                  proxy: false
              });

              const remoteEtag = headResponse.headers['etag'];
              const remoteLastModified = headResponse.headers['last-modified'];
              const stats = await fs.stat(fullPath);

              // Simple heuristic: if we have an ETag and it's same, or if size and last-modified match
              // (Note: this is simplified, a production version might store ETags in DB)
              if (remoteEtag && remoteEtag.includes(stats.size.toString())) {
                  return; // Skip download
              }
          } catch (e) {
              // If HEAD fails, proceed with download
          }
      }

      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        headers: this.headers,
        timeout: 20000,
        httpsAgent: this.agent,
        proxy: false // prevent axios from using env proxies if we provide one
      });

      const writer = fs.createWriteStream(fullPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', async () => {
             // 1. Process CSS for nested assets
             if (url.endsWith('.css')) {
                 await this.processCss(fullPath, url, localPath);
             }
             // 2. Process JS for endpoints (Phase 4)
             else if (url.endsWith('.js')) {
                 await this.processJs(fullPath, url, localPath);
             }
             resolve();
        });
        writer.on('error', reject);
      });
    } catch (err) {
      throw err;
    }
  }

  async processCss(filePath, originalUrl, localPath) {
    try {
      let content = await fs.readFile(filePath, 'utf8');
      const ast = csstree.parse(content);
      const assets = [];

      csstree.walk(ast, (node) => {
        if (node.type === 'Url') {
          let urlValue = node.value;
          if (urlValue.type === 'String') {
            urlValue = urlValue.value.replace(/['"]/g, '');
          } else if (urlValue.type === 'Raw') {
            urlValue = urlValue.value;
          }

          if (urlValue && !urlValue.startsWith('data:') && !urlValue.startsWith('blob:')) {
            try {
              const absoluteAssetUrl = new URL(urlValue, originalUrl).href;
              assets.push(absoluteAssetUrl);
            } catch (e) {}
          }
        }
      });

      if (assets.length > 0) {
          const manifestPath = filePath + '.assets.json';
          await fs.writeJson(manifestPath, assets);
      }
    } catch (err) {
      console.error(`Error processing CSS ${filePath}:`, err.message);
    }
  }

  async processJs(filePath, originalUrl, localPath) {
      try {
          const content = await fs.readFile(filePath, 'utf8');
          // Complex regex to find potential URLs/endpoints in JS
          const urlRegex = /(?:https?:\/\/[\w.-]+(?:\/[\w./-]*)?|\/(?:[\w.-]+\/)+[\w.-]+(?:\?[\w.%&=-]*)?)/g;
          const matches = content.match(urlRegex) || [];
          const discovered = [];

          for (let match of matches) {
              // Sanitize matches that might have trailing chars
              const cleanMatch = match.replace(/[),;'">\s]+$/, '');
              if (cleanMatch.length < 5) continue;

              try {
                  const absoluteUrl = new URL(cleanMatch, originalUrl).href;
                  if (absoluteUrl !== originalUrl) {
                      discovered.push(absoluteUrl);
                  }
              } catch (e) {}
          }

          if (discovered.length > 0) {
              const manifestPath = filePath + '.assets.json';
              await fs.writeJson(manifestPath, [...new Set(discovered)]);
          }
      } catch (err) {
        console.error(`Error processing JS ${filePath}:`, err.message);
      }
  }

  async saveHtml(content, localPath) {
    const fullPath = path.join(this.downloadDir, localPath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf8');
  }
}

export default Downloader;
