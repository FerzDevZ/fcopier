import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import DB from '../core/db.js';
import chalk from 'chalk';

class ProxyServer {
  constructor(downloadDir, port = 3000, host = 'localhost') {
    this.downloadDir = downloadDir;
    this.port = port;
    this.host = host;
    this.app = express();
    this.db = new DB(path.join(this.downloadDir, '.fcopier', 'state.sqlite'));
    this.setup();
  }

  setup() {
    // 1. API Mock Endpoint
    this.app.get('/fcopier-api-mock', (req, res) => {
      const targetUrl = req.query.url;
      if (!targetUrl) return res.status(400).send('Missing url parameter');

      const response = this.db.getApiResponse(targetUrl);
      if (response) {
        res.set('Content-Type', response.content_type);
        res.send(response.data);
      } else {
        res.status(404).send('Mock not found');
      }
    });
    
    // 2. Real-time Dashboard
    this.app.get('/fcopier-dashboard', (req, res) => {
        const stats = this.getStats();
        const findings = this.db.db.prepare('SELECT * FROM api_responses LIMIT 20').all(); // Simplified for dashboard
        res.send(this.generateDashboardHtml(stats, findings));
    });

    // 3. Dynamic Injection Middleware for HTML files
    this.app.use(async (req, res, next) => {
      if (req.path.endsWith('.html') || req.path === '/' || !path.extname(req.path)) {
        let filePath = path.join(this.downloadDir, req.path);
        if (req.path === '/' || !path.extname(req.path)) {
            filePath = path.join(this.downloadDir, 'index.html');
        }

        if (await fs.pathExists(filePath)) {
          let content = await fs.readFile(filePath, 'utf8');
          content = this.injectMockScript(content);
          return res.send(content);
        }
      }
      next();
    });

    // 3. Static File Serving
    this.app.use(express.static(this.downloadDir));
  }

  injectMockScript(html) {
      const mockScript = `
<script>
(function() {
  console.log('[FCopier] Mock Service Initialized');
  const originalFetch = window.fetch;

  // Intercept Fetch
  window.fetch = async (...args) => {
    const url = args[0] instanceof Request ? args[0].url : args[0];
    try {
      const mockRes = await originalFetch("/fcopier-api-mock?url=" + encodeURIComponent(url));
      if (mockRes.status === 200) {
        console.log('[FCopier] Serving Mock for:', url);
        return mockRes;
      }
    } catch (e) {}
    return originalFetch(...args);
  };
})();
</script>
      `;
      return html.replace('</head>', mockScript + "\n</head>");
  }

  start(openBrowser = false) {
    this.app.listen(this.port, this.host, () => {
      // Print beautiful server initialization banner
      console.log(`
   _____                      _           
  |  ___|                    (_)          
  | |__   ___  ___   _ __   _   ___  _ __ 
  |  __| / __|/ _ \\ | '_ \\ | | / _ \\| '__|
  | |   | (__| (_) || |_) || ||  __/| |   
  |_|    \\___|\\___/ | .__/ |_| \\___||_|   
                    | |                   
                    |_|                   
      `);
      const url = `http://${this.host}:${this.port}`;
      console.log(chalk.bold.green("FCopier Proxy Server running at ") + chalk.cyan(url));
      console.log(chalk.bold.yellow("Dashboard available at: ") + chalk.cyan(url + '/fcopier-dashboard'));
      console.log("Serving content from: " + this.downloadDir);
      console.log('API Simulation / Mocking system is ACTIVE.');

      if (openBrowser) {
          const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
          import('child_process').then(({ exec }) => exec(start + ' ' + url + '/fcopier-dashboard'));
      }
    });
  }

  getStats() {
      try {
          const totalUrls = this.db.db.prepare('SELECT COUNT(*) as count FROM urls').get().count;
          const crawledUrls = this.db.db.prepare("SELECT COUNT(*) as count FROM urls WHERE status = 'crawled'").get().count;
          const assets = this.db.db.prepare("SELECT COUNT(*) as count FROM urls WHERE type = 'asset'").get().count;
          return { totalUrls, crawledUrls, assets };
      } catch (e) {
          return { totalUrls: 0, crawledUrls: 0, assets: 0 };
      }
  }

  generateDashboardHtml(stats, findings) {
      return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FCopier Enterprise Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #00f2fe;
            --secondary: #4facfe;
            --bg: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.7);
            --text: #f8fafc;
        }
        body {
            font-family: 'Outfit', sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: var(--text);
            margin: 0;
            display: flex;
            min-height: 100vh;
        }
        .container {
            flex: 1;
            padding: 40px;
            max-width: 1200px;
            margin: 0 auto;
        }
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
        }
        .logo {
            font-size: 2rem;
            font-weight: 600;
            background: linear-gradient(to right, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .card {
            background: var(--card-bg);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 25px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: transform 0.3s ease;
        }
        .card:hover {
            transform: translateY(-5px);
        }
        .stat-value {
            font-size: 2.5rem;
            font-weight: 600;
            color: var(--primary);
        }
        .stat-label {
            color: #94a3b8;
            margin-top: 5px;
        }
        .table-container {
            background: var(--card-bg);
            border-radius: 20px;
            padding: 20px;
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            text-align: left;
            padding: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        th {
            color: #94a3b8;
            font-weight: 400;
        }
        .badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate {
            animation: fadeIn 0.6s ease forwards;
        }
    </style>
</head>
<body>
    <div class="container animate">
        <header>
            <div class="logo">FCopier Enterprise</div>
            <div class="badge">Server Running</div>
        </header>

        <div class="stats-grid">
            <div class="card">
                <div class="stat-value">${stats.totalUrls}</div>
                <div class="stat-label">Total URLs Discovered</div>
            </div>
            <div class="card">
                <div class="stat-value">${stats.crawledUrls}</div>
                <div class="stat-label">Pages Cloned</div>
            </div>
            <div class="card">
                <div class="stat-value">${stats.assets}</div>
                <div class="stat-label">Assets Captured</div>
            </div>
        </div>

        <div class="table-container">
            <h3>Recent API Snapshots</h3>
            <table>
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>URL</th>
                        <th>Type</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${findings.map(f => `
                        <tr>
                            <td><span class="badge" style="background: rgba(79, 172, 254, 0.2); color: #4facfe">${f.method}</span></td>
                            <td>${f.url.length > 60 ? f.url.substring(0, 57) + '...' : f.url}</td>
                            <td>${f.content_type.split(';')[0]}</td>
                            <td><span class="badge">Intercepted</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
      `;
  }
}

export default ProxyServer;
