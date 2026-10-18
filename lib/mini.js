// Tiny dependency-free web framework (replaces Express for this portal)
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.html': 'text/html; charset=utf-8'
};

function app(publicDir) {
  const middleware = [];
  const routes = [];
  const flat = a => a.flat(Infinity);

  const add = method => (pattern, ...handlers) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
    routes.push({ method, re, keys, handlers: flat(handlers) });
  };

  function run(list, req, res, done) {
    let i = 0;
    const next = err => {
      if (err) return fail(res, err);
      const fn = list[i++];
      if (!fn) return done && done();
      try { fn(req, res, next); } catch (e) { fail(res, e); }
    };
    next();
  }

  function fail(res, err) {
    console.error(err);
    if (!res.headersSent) { res.statusCode = 500; res.setHeader('Content-Type', 'text/plain'); }
    res.end('Server error');
  }

  function handle(req, res) {
    const u = new URL(req.url, 'http://localhost');
    req.path = decodeURIComponent(u.pathname);
    req.query = Object.fromEntries(u.searchParams);
    req.params = {};
    req.body = {};

    res.status = c => { res.statusCode = c; return res; };
    res.type = t => { res.setHeader('Content-Type', t === 'html' ? 'text/html; charset=utf-8' : t); return res; };
    res.send = b => { if (!res.getHeader('Content-Type')) res.type('text/plain; charset=utf-8'); res.end(b); };
    res.redirect = loc => { res.statusCode = 302; res.setHeader('Location', loc); res.end(); };

    // static files
    if (req.method === 'GET') {
      const file = path.join(publicDir, path.normalize(req.path));
      if (file.startsWith(publicDir) && req.path !== '/' && fs.existsSync(file) && fs.statSync(file).isFile()) {
        res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return fs.createReadStream(file).pipe(res);
      }
    }

    const dispatch = () => {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(req.path);
        if (!m) continue;
        r.keys.forEach((k, i) => (req.params[k] = decodeURIComponent(m[i + 1])));
        return run(r.handlers, req, res, () => res.status(404).send('Not found'));
      }
      res.status(404).send('Page not found');
    };

    const start = () => run(middleware, req, res, dispatch);

    if (req.method === 'POST') {
      let size = 0; const chunks = [];
      req.on('data', c => { size += c.length; if (size > 5e6) req.destroy(); else chunks.push(c); });
      req.on('end', () => {
        req.body = Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString()));
        start();
      });
    } else start();
  }

  return {
    use: fn => middleware.push(fn),
    get: add('GET'),
    post: add('POST'),
    listen: (port, cb) => http.createServer(handle).listen(port, '0.0.0.0', cb)
  };
}

module.exports = app;
