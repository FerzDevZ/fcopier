import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import { getClonedSites } from '../../utils/index.js';

export const cleanCommand = async (directory, options) => {
    if (options.all) {
        const sites = await getClonedSites();
        if (sites.length === 0) {
            console.log(chalk.gray('No cloned sites found.'));
            return;
        }
        const confirm = ora(`Cleaning ${sites.length} sites...`).start();
        for (const site of sites) {
            await fs.remove(site);
        }
        confirm.succeed(chalk.green('Workspace cleaned.'));
    } else {
        const target = directory || './cloned_site';
        if (await fs.pathExists(target)) {
            await fs.remove(target);
            console.log(chalk.green(`Cleaned: ${target}`));
        } else {
            console.log(chalk.yellow(`Nothing to clean at ${target}`));
        }
    }
};
