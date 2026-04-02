import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import exporter from '../../services/exporter.js';
import { BANNER } from '../banner.js';

export const exportCommand = async (url, options) => {
    console.log(BANNER);
    
    let type = options.type || 'pdf';
    let outputPath = options.output;
    
    if (!outputPath) {
        const u = new URL(url);
        outputPath = `./exports/${u.hostname.replace(/[^a-z0-9]/gi, '_')}.${type}`;
    }

    if (!outputPath.endsWith(`.${type}`)) {
        outputPath += `.${type}`;
    }

    const spinner = ora(`Exporting to ${chalk.bold(type.toUpperCase())}...`).start();

    try {
        await exporter.export(url, type, outputPath, {
            userAgent: options.ua,
            autoScroll: options.scroll,
            wait: isNaN(options.wait) ? 0 : parseInt(options.wait)
        });
        
        spinner.succeed(chalk.green(`Export successful: ${chalk.white.bold(outputPath)}`));
    } catch (err) {
        spinner.fail(chalk.red(`Export failed: ${err.message}`));
        process.exit(1);
    } finally {
        await exporter.close();
    }
};
