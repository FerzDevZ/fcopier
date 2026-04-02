import fs from 'fs-extra';
import path from 'path';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';

chromium.use(StealthPlugin());

class Exporter {
    constructor() {
        this.browser = null;
    }

    async init() {
        if (!this.browser) {
            this.browser = await chromium.launch({ headless: true });
        }
    }

    async export(url, type, outputPath, options = {}) {
        await this.init();
        const context = await this.browser.newContext({
            userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
            
            if (options.wait) {
                await page.waitForTimeout(options.wait);
            }

            if (options.autoScroll) {
                await this.autoScroll(page);
            }

            await fs.ensureDir(path.dirname(outputPath));

            if (type === 'pdf') {
                await page.pdf({ 
                    path: outputPath, 
                    format: 'A4', 
                    printBackground: true,
                    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
                });
            } else if (type === 'png') {
                await page.screenshot({ path: outputPath, fullPage: true });
            } else if (type === 'singlefile') {
                const content = await this.generateSingleFile(page, url);
                await fs.writeFile(outputPath, content, 'utf8');
            }

            return outputPath;
        } finally {
            await page.close();
            await context.close();
        }
    }

    async generateSingleFile(page, baseUrl) {
        // Simple SingleFile implementation: Inline images and styles as data URIs
        // For a more robust version, we would use a library or more complex logic
        return await page.evaluate(async () => {
            const toDataURL = async (url) => {
                try {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    return url;
                }
            };

            // Inline Images
            const images = document.querySelectorAll('img');
            for (const img of images) {
                if (img.src && !img.src.startsWith('data:')) {
                    img.src = await toDataURL(img.src);
                }
            }

            // Inline external stylesheets (simplified)
            const links = document.querySelectorAll('link[rel="stylesheet"]');
            for (const link of links) {
                try {
                    const response = await fetch(link.href);
                    const css = await response.text();
                    const style = document.createElement('style');
                    style.textContent = css;
                    link.parentNode.replaceChild(style, link);
                } catch (e) {}
            }

            return document.documentElement.outerHTML;
        });
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

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

export default new Exporter();
