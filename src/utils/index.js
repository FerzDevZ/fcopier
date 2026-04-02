import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

export const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const sanitizeUrl = (url) => {
    try {
        const u = new URL(url);
        return u.href;
    } catch (e) {
        return null;
    }
};

export const ensureDir = async (dir) => {
    await fs.ensureDir(dir);
};

export const getClonedSites = async (baseDir = './') => {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    const sites = [];
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const dbPath = path.join(baseDir, entry.name, '.fcopier', 'state.sqlite');
            if (await fs.pathExists(dbPath)) {
                sites.push(entry.name);
            }
        }
    }
    return sites;
};
