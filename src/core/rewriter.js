import path from 'path';

class Rewriter {
  constructor(baseUrl, downloadDir) {
    this.baseUrl = new URL(baseUrl);
    this.downloadDir = downloadDir;
  }

  getUrlToLocalPath(targetUrl, currentUrl) {
    try {
      const absoluteUrl = new URL(targetUrl, currentUrl);
      
      if (absoluteUrl.hostname === this.baseUrl.hostname) {
        let pathname = absoluteUrl.pathname;
        if (pathname.endsWith('/')) {
          pathname += 'index.html';
        } else if (!path.extname(pathname)) {
          pathname += '.html';
        }
        
        const localPath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
        return localPath;
      } else {
        const externalPath = path.join(
          'external', 
          absoluteUrl.hostname, 
          absoluteUrl.pathname === '/' ? 'index.html' : absoluteUrl.pathname
        );
        return externalPath;
      }
    } catch (e) {
      return targetUrl;
    }
  }

  getRelativePath(fromLocalPath, toLocalPath) {
    const fromDir = path.dirname(fromLocalPath);
    const rel = path.relative(fromDir, toLocalPath);
    return rel;
  }
}

export default Rewriter;
