import path from 'path';
import fs from 'fs-extra';

class Scanner {
    constructor() {
        this.rules = [
            { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g },
            { name: 'AWS Secret Key', regex: /aws(.{0,20})?['"][0-9a-zA-Z/+]{40}['"]/gi },
            { name: 'GitHub Personal Token', regex: /ghp_[0-9a-zA-Z]{36}/g },
            { name: 'Google API Key', regex: /AIza[0-9A-Za-z\-_]{35}/g },
            { name: 'Slack Token', regex: /xox[baprs]-([0-9a-zA-Z]{10,48})?/g },
            { name: 'Stripe Secret Key', regex: /sk_live_[0-9a-zA-Z]{24}/g },
            { name: 'Email Address', regex: /\b[\w\-\.]+@([\w\-]+\.)+[\w\-]{2,4}\b/g },
            { name: 'Internal IP', regex: /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|\b192\.168\.\d{1,3}\.\d{1,3}\b|\b172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}\b/g },
            { name: 'Private Key', regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g }
        ];
    }

    async scanFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return this.scanContent(content, filePath);
        } catch (e) {
            return [];
        }
    }

    scanContent(content, sourceLabel = 'content') {
        const findings = [];
        for (const rule of this.rules) {
            let match;
            while ((match = rule.regex.exec(content)) !== null) {
                findings.push({
                    rule: rule.name,
                    match: match[0],
                    source: sourceLabel,
                    line: this.getLineNumber(content, match.index)
                });
            }
        }
        return findings;
    }

    getLineNumber(content, index) {
        return content.substring(0, index).split('\n').length;
    }

    async scanDirectory(dirPath) {
        const allFindings = [];
        const files = await this.getAllFiles(dirPath);
        
        for (const file of files) {
            // Skip binary files/known large dirs
            if (file.includes('.fcopier') || file.includes('node_modules')) continue;
            const ext = path.extname(file);
            if (['.js', '.html', '.json', '.css', '.txt', '.xml'].includes(ext)) {
                const findings = await this.scanFile(file);
                allFindings.push(...findings);
            }
        }
        return allFindings;
    }

    async getAllFiles(dirPath, arrayOfFiles = []) {
        const files = await fs.readdir(dirPath);
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            if ((await fs.stat(fullPath)).isDirectory()) {
                await this.getAllFiles(fullPath, arrayOfFiles);
            } else {
                arrayOfFiles.push(fullPath);
            }
        }
        return arrayOfFiles;
    }
}

export default new Scanner();
