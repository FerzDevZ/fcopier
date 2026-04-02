import archiver from 'archiver';
import fs from 'fs-extra';
import path from 'path';

class Bundler {
  /**
   * Bundles a directory into a .farch (zip) file
   * @param {string} sourceDir 
   * @param {string} outputFile 
   */
  static async bundle(sourceDir, outputFile) {
    if (!outputFile.endsWith('.farch')) {
        outputFile += '.farch';
    }

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputFile);
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      output.on('close', () => {
        resolve(archive.pointer());
      });

      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('[FCopier Bundler] Warning:', err.message);
        } else {
          reject(err);
        }
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      
      // Append files from sourceDir, but do not include the sourceDir itself in paths
      archive.directory(sourceDir, false);

      archive.finalize();
    });
  }
}

export default Bundler;
