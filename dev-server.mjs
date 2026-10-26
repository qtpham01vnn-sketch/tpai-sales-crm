import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import commandHandler from './api/orchestrator/command.js';
import cronHandler from './api/orchestrator/cron.js';
import bookingHandler from './api/booking.js';
import sendEmailHandler from './api/send-email.js';
import sepayHandler from './api/sepay-webhook.js';
import leadHandler from './api/webhook/lead.js';
import provisionHandler from './api/webhook/provision.js';

const __filename = fileURLToPath(import.meta.url);
const APP_DIR = path.dirname(__filename);
const PORT = process.env.PORT || 3333;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf': 'application/pdf'
};

const API_ROUTES = {
  '/api/orchestrator/command': commandHandler,
  '/api/orchestrator/cron': cronHandler,
  '/api/booking': bookingHandler,
  '/api/send-email': sendEmailHandler,
  '/api/sepay-webhook': sepayHandler,
  '/api/webhook/lead': leadHandler,
  '/api/webhook/provision': provisionHandler
};

const REWRITES = {
  '/': '/index.html',
  '/crm': '/crm.html',
  '/dat-lich': '/dat-lich.html',
  '/survey': '/survey.html',
  '/ung-tuyen': '/survey.html',
  '/thank-you': '/thank-you.html',
  '/not-a-fit': '/not-a-fit.html'
};

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = urlObj.pathname;

    if (API_ROUTES[pathname]) {
      let rawBody = '';
      req.on('data', chunk => { rawBody += chunk; });
      req.on('end', async () => {
        try {
          req.body = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          req.body = {};
        }
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (obj) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(obj));
        };
        await API_ROUTES[pathname](req, res);
      });
      return;
    }

    const mappedPath = REWRITES[pathname] || pathname;
    const fullPath = path.join(APP_DIR, mappedPath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const ext = path.extname(fullPath).toLowerCase();
      const stat = fs.statSync(fullPath);

      // Support Range requests for smooth MP4 Video Reels playback
      if (ext === '.mp4' && req.headers.range) {
        const range = req.headers.range;
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(fullPath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        });
        file.pipe(res);
        return;
      }

      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Content-Length': stat.size
      });
      fs.createReadStream(fullPath).pipe(res);
    } else {
      res.statusCode = 404;
      res.end('404 Not Found: ' + pathname);
    }
  } catch (err) {
    res.statusCode = 500;
    res.end('Internal Server Error: ' + err.message);
  }
});

server.listen(PORT, () => {
  console.log(`TPAI Local Server running at:`);
  console.log(`- CRM & AI Command Center: http://localhost:${PORT}/crm (PIN: 2026)`);
  console.log(`- Sales Landing Page V2.0: http://localhost:${PORT}/`);
  console.log(`- Booking Funnel 1:1:      http://localhost:${PORT}/dat-lich`);
});
