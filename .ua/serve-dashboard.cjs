const http = require('http');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = 'D:/program/AiLearning/MyClaudeCode';
const DASHBOARD_DIR = path.join(require('os').homedir(), '.understand-anything-plugin/packages/dashboard');
const DIST_DIR = path.join(DASHBOARD_DIR, 'dist');
const UA_DIR = path.join(PROJECT_DIR, '.ua');
const TOKEN = 'ua-local-dev-token-2026';
const PORT = 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const PROTECTED = new Set(['/knowledge-graph.json', '/meta.json', '/config.json', '/domain-graph.json', '/diff-overlay.json']);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname;
  const token = url.searchParams.get('token');

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Protected API endpoints
  if (PROTECTED.has(pathname)) {
    if (token !== TOKEN) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden: missing or invalid token' }));
      return;
    }
    const filePath = path.join(UA_DIR, pathname.slice(1));
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(data);
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `File not found: ${pathname}` }));
    }
    return;
  }

  // File content endpoint
  if (pathname === '/file-content.json') {
    if (token !== TOKEN) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    const requestedPath = url.searchParams.get('path') || '';
    if (!requestedPath || path.isAbsolute(requestedPath)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid path' }));
      return;
    }
    const absPath = path.resolve(PROJECT_DIR, requestedPath);
    const rel = path.relative(PROJECT_DIR, absPath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Path outside project' }));
      return;
    }
    if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
      const stat = fs.statSync(absPath);
      if (stat.size > 1024 * 1024) {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'File too large' }));
        return;
      }
      const buffer = fs.readFileSync(absPath);
      if (buffer.includes(0)) {
        res.statusCode = 415;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Binary file' }));
        return;
      }
      const content = buffer.toString('utf-8');
      const ext = path.extname(absPath).slice(1).toLowerCase();
      const langMap = { py: 'python', js: 'javascript', ts: 'typescript', tsx: 'tsx', jsx: 'jsx', md: 'markdown', json: 'json', toml: 'toml', sh: 'bash', yaml: 'yaml', yml: 'yaml', html: 'markup', css: 'css' };
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        path: rel.replace(/\\/g, '/'),
        language: langMap[ext] || 'text',
        content,
        sizeBytes: buffer.byteLength,
        lineCount: content.length === 0 ? 0 : content.split(/\r\n|\n|\r/).length
      }));
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'File not found' }));
    }
    return;
  }

  // Static files from dist/
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const fullPath = path.join(DIST_DIR, filePath);

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const ext = path.extname(fullPath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    fs.createReadStream(fullPath).pipe(res);
  } else {
    // SPA fallback — serve index.html for client-side routing
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      fs.createReadStream(indexPath).pipe(res);
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  🔑  Dashboard URL: http://127.0.0.1:${PORT}/?token=${TOKEN}\n`);
  console.log(`  Serving dist from: ${DIST_DIR}`);
  console.log(`  Knowledge graph: ${path.join(UA_DIR, 'knowledge-graph.json')}`);
  console.log(`  Press Ctrl+C to stop.\n`);

  // Auto-open browser
  const { exec } = require('child_process');
  exec(`start "" "http://127.0.0.1:${PORT}/?token=${TOKEN}"`);
});
