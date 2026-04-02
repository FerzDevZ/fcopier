import chalk from 'chalk';
import ora from 'ora';
import Bundler from '../../services/bundler.js';
import { formatSize } from '../../utils/index.js';

export const bundleCommand = async (directory, options) => {
    const sourceDir = directory || './cloned_site';
    const spinner = ora(`Bundling ${sourceDir}...`).start();
    try {
        const size = await Bundler.bundle(sourceDir, options.output);
        spinner.succeed(chalk.green(`Bundling complete: ${options.output} (${formatSize(size)})`));
    } catch (err) {
        spinner.fail(err.message);
    }
};
