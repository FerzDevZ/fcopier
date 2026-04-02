import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import Engine from '../../core/engine.js';
import { BANNER } from '../banner.js';

export const cloneCommand = async (url, options) => {
    console.log(BANNER);
    console.log(chalk.yellow(`Starting FCopier on: ${chalk.white.bold(url)}`));
    
    const spinner = ora('Initializing environment...').start();

    const fcopier = new Engine(url, {
      downloadDir: options.dir,
      concurrency: options.concurrency,
      maxDepth: options.depth,
      autoScroll: options.scroll,
      screenshot: options.snapshot,
      proxy: options.proxy,
      userAgent: options.ua,
      headers: options.header,
      exclude: options.exclude,
      include: options.include,
      noScripts: !options.js,
      noImages: !options.img,
      wait: isNaN(options.wait) ? options.wait : parseInt(options.wait),
      spinner: spinner
    });
    
    try {
      await fcopier.start();
      spinner.succeed(chalk.green('Cloning task finished!'));
      console.log(chalk.blue(`\nCheck results in: ${path.resolve(options.dir)}`));
    } catch (err) {
      spinner.fail(chalk.red(`Cloning failed: ${err.message}`));
      process.exit(1);
    }
};
