import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import scanner from '../../services/scanner.js';
import { BANNER } from '../banner.js';

export const scanCommand = async (directory) => {
    console.log(BANNER);
    
    const targetDir = directory || './cloned_site';
    if (!require('fs').existsSync(targetDir)) {
        console.error(chalk.red(`Directory not found: ${targetDir}`));
        return;
    }

    const spinner = ora(`Scanning ${chalk.bold(targetDir)} for secrets and PII...`).start();

    try {
        const findings = await scanner.scanDirectory(targetDir);
        
        if (findings.length === 0) {
            spinner.succeed(chalk.green('Scan complete: No sensitive information found.'));
        } else {
            spinner.warn(chalk.yellow(`Scan complete: Found ${findings.length} potential leaks.`));
            console.log('\n--- LEAK REPORT ---');
            
            const grouped = findings.reduce((acc, f) => {
                acc[f.rule] = acc[f.rule] || [];
                acc[f.rule].push(f);
                return acc;
            }, {});

            for (const [rule, items] of Object.entries(grouped)) {
                console.log(chalk.bold.red(`\n[!] ${rule}:`));
                items.forEach(i => {
                    console.log(` - ${chalk.cyan(i.match)} in ${chalk.gray(i.source)} at line ${i.line}`);
                });
            }
            console.log('-------------------\n');
        }
    } catch (err) {
        spinner.fail(chalk.red(`Scan failed: ${err.message}`));
        process.exit(1);
    }
};
