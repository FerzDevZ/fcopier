import chalk from 'chalk';
import fs from 'fs-extra';
import ProxyServer from '../../services/server.js';

export const serveCommand = async (directory, options) => {
    const downloadDir = directory || './cloned_site';
    if (!fs.existsSync(downloadDir)) {
        console.error(chalk.red(`Directory not found: ${downloadDir}`));
        return;
    }
    const server = new ProxyServer(downloadDir, options.port, options.host);
    server.start(options.open);
};
