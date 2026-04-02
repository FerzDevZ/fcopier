import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';

class DB {
  constructor(dbPath) {
    fs.ensureDirSync(path.dirname(dbPath));
    this.db = new Database(dbPath);
    this.init();
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS urls (
        url TEXT PRIMARY KEY,
        status TEXT DEFAULT 'pending', 
        type TEXT,
        depth INTEGER DEFAULT 0,
        local_path TEXT,
        last_error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS api_responses (
        url TEXT PRIMARY KEY,
        method TEXT,
        content_type TEXT,
        data TEXT, 
        parent_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  addUrl(url, type, depth = 0) {
    if (!url) return;
    try {
      const stmt = this.db.prepare(
        'INSERT OR IGNORE INTO urls (url, type, depth) VALUES (:url, :type, :depth)'
      );
      return stmt.run({ url, type, depth });
    } catch (err) {
      console.error(`Error adding URL ${url}:`, err.message);
    }
  }

  updateStatus(url, status, localPath = null, error = null) {
    if (!url) {
        console.error('CRITICAL: updateStatus called without URL!');
        return;
    }
    try {
      const params = {
        status: status ?? null,
        localPath: localPath ?? null,
        error: error ?? (status === 'failed' ? 'Unknown error' : null),
        url: url
      };

      const stmt = this.db.prepare(
        'UPDATE urls SET status = :status, local_path = :localPath, last_error = :error, updated_at = CURRENT_TIMESTAMP WHERE url = :url'
      );
      return stmt.run(params);
    } catch (err) {
      console.error(`Status update failed for ${url} [${status}]:`, err.message);
      throw err;
    }
  }

  saveApiResponse(url, method, contentType, data, parentUrl) {
    try {
      const stmt = this.db.prepare(
        'INSERT OR REPLACE INTO api_responses (url, method, content_type, data, parent_url) VALUES (:url, :method, :contentType, :data, :parentUrl)'
      );
      return stmt.run({ url, method, contentType, data, parentUrl });
    } catch (err) {
      console.error(`Error saving API response for ${url}:`, err.message);
    }
  }

  getApiResponse(url) {
    return this.db.prepare('SELECT * FROM api_responses WHERE url = ?').get(url);
  }

  getApiResponsesForPage(parentUrl) {
    return this.db.prepare('SELECT * FROM api_responses WHERE parent_url = ?').all(parentUrl);
  }

  getNextPendingUrl() {
    return this.db.prepare("SELECT * FROM urls WHERE status = 'pending' AND type = 'html' ORDER BY depth ASC LIMIT 1").get();
  }

  getPendingAssets() {
    return this.db.prepare("SELECT * FROM urls WHERE status = 'pending' AND type != 'html'").all();
  }

  isVisited(url) {
    if (!url) return false;
    const res = this.db.prepare('SELECT 1 FROM urls WHERE url = ?').get(url);
    return !!res;
  }

  close() {
    this.db.close();
  }
}

export default DB;
