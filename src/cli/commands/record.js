import chalk from 'chalk';
import Engine from '../../core/engine.js';
import { BANNER } from '../banner.js';

export const recordCommand = async (url, options) => {
    console.log(BANNER);
    console.log(chalk.bold.magenta('\n--- GUIDED RECORD MODE ---'));
    const fcopier = new Engine(url, { downloadDir: options.dir });
    try {
      await fcopier.record(url);
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
};
