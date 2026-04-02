import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import DB from '../../core/db.js';
import { BANNER } from '../banner.js';

export const statsCommand = async (directory) => {
    const targetDir = directory || './cloned_site';
    const dbPath = path.join(targetDir, '.fcopier', 'state.sqlite');
    
    if (!fs.existsSync(dbPath)) {
        console.log(chalk.red('No FCopier data found in this directory.'));
        return;
    }

    const db = new DB(dbPath);
    
    const totalUrls = db.db.prepare('SELECT COUNT(*) as count FROM urls').get().count;
    const crawledUrls = db.db.prepare("SELECT COUNT(*) as count FROM urls WHERE status = 'crawled'").get().count;
    const assets = db.db.prepare("SELECT COUNT(*) as count FROM urls WHERE type = 'asset'").get().count;
    const apiSnaps = db.db.prepare('SELECT COUNT(*) as count FROM api_responses').get().count;
    const errors = db.db.prepare("SELECT COUNT(*) as count FROM urls WHERE status = 'failed'").get().count;

    console.log(BANNER);
    console.log(chalk.bold(`Statistics for: ${chalk.cyan(targetDir)}`));
    console.log('-------------------------------------------');
    console.log(`Total URLs Discovered: ${totalUrls}`);
    console.log(`Pages Crawled:        ${crawledUrls}`);
    console.log(`Assets Downloaded:    ${assets}`);
    console.log(`API Snapshots:        ${apiSnaps}`);
    console.log(`Failed Tasks:         ${chalk.red(errors)}`);
    console.log('-------------------------------------------');
    
    db.close();
};
