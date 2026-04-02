import { program } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

import { cloneCommand } from './commands/clone.js';
import { analyzeCommand } from './commands/analyze.js';
import { recordCommand } from './commands/record.js';
import { serveCommand } from './commands/serve.js';
import { statsCommand } from './commands/stats.js';
import { bundleCommand } from './commands/bundle.js';
import { cleanCommand } from './commands/clean.js';
import { exportCommand } from './commands/export.js';
import { scanCommand } from './commands/scan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));

export const runCLI = () => {
  program
    .name('fcopier')
    .description('Super Powerfull Website Cloner & API Snapper')
    .version(packageJson.version);

  program
    .command('clone <url>')
    .description('Clone a website with advanced options')
    .option('-d, --dir <directory>', 'Destination directory', './cloned_site')
    .option('-c, --concurrency <number>', 'Number of concurrent downloads', (val) => parseInt(val), 5)
    .option('--depth <number>', 'Maximum crawl depth', (val) => parseInt(val), 3)
    .option('--scroll', 'Enable intelligent auto-scroll', false)
    .option('--snapshot', 'Enable full-page screenshots', false)
    .option('--proxy <url>', 'Proxy server URL (e.g. http://proxy:8080)')
    .option('--ua <string>', 'Custom User-Agent string')
    .option('--header <key:value>', 'Custom HTTP headers (can be repeated)', (val, memo) => {
      const [key, value] = val.split(':');
      if (key && value) memo[key.trim()] = value.trim();
      return memo;
    }, {})
    .option('--exclude <pattern>', 'Exclude URLs containing pattern (can be repeated)', (val, memo) => {
      memo.push(val);
      return memo;
    }, [])
    .option('--include <pattern>', 'Only include URLs containing pattern (can be repeated)', (val, memo) => {
      memo.push(val);
      return memo;
    }, [])
    .option('--no-js', 'Disable JavaScript execution/scripts', false)
    .option('--no-img', 'Skip image downloads', false)
    .option('--wait <selector|number>', 'Wait for selector or ms before capture')
    .option('--scan', 'Enable real-time secret scanning during clone', false)
    .action(cloneCommand);

  program
    .command('analyze <url>')
    .description('Analyze a URL structure and potential assets without downloading')
    .action(analyzeCommand);

  program
    .command('record <url>')
    .description('Interactive recording mode: capture API snapshots while you browse')
    .option('-d, --dir <directory>', 'Destination directory', './cloned_site')
    .action(recordCommand);

  program
    .command('serve [directory]')
    .description('Serve a cloned website with active API simulation')
    .option('-p, --port <number>', 'Port to run on', (val) => parseInt(val), 3000)
    .option('--host <host>', 'Host to bind to', 'localhost')
    .option('--open', 'Automatically open in browser', false)
    .action(serveCommand);

  program
    .command('stats [directory]')
    .description('Show statistics of a cloned website')
    .action(statsCommand);

  program
    .command('bundle [directory]')
    .description('Bundle a cloned website into a .farch file')
    .option('-o, --output <file>', 'Output filename', 'cloned_site.farch')
    .action(bundleCommand);

  program
    .command('clean [directory]')
    .description('Delete cloned data and temporary files')
    .option('--all', 'Clean all cloned sites in the current directory')
    .action(cleanCommand);

  program
    .command('export <url>')
    .description('Export a page to PDF, PNG, or SingleFile')
    .option('-t, --type <type>', 'Export type: pdf, png, singlefile', 'pdf')
    .option('-o, --output <file>', 'Output filename')
    .option('--ua <string>', 'Custom User-Agent string')
    .option('--scroll', 'Enable auto-scroll before export', false)
    .option('--wait <number>', 'Wait ms before export', (val) => parseInt(val), 0)
    .action(exportCommand);

  program
    .command('scan [directory]')
    .description('Scan captured content for secrets, API keys, and PII')
    .action(scanCommand);

  program.parse(process.argv);
};
