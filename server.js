/**
 * Simple local server that:
 * 1. Serves the static frontend files
 * 2. Proxies API requests to data.cms.gov (bypasses CORS)
 *
 * Usage:  node server.js
 * Then open: http://localhost:3000
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.json': 'application/json',
    '.png':  'image/png',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
};

function serveStatic(req, res) {
    let filePath = path.join(__dirname, req.url === '/' ? '/index.html' : req.url);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

function proxyToGov(req, res) {
    // Strip the /api prefix and forward to data.cms.gov
    const targetPath = req.url.replace(/^\/api/, '');
    const targetUrl = `https://data.cms.gov${targetPath}`;

    console.log(`[proxy] ${targetUrl}`);

    https.get(targetUrl, (proxyRes) => {
        let body = '';
        proxyRes.on('data', chunk => body += chunk);
        proxyRes.on('end', () => {
            res.writeHead(proxyRes.statusCode, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            });
            res.end(body);
        });
    }).on('error', (err) => {
        console.error('[proxy] Error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to reach CMS API' }));
    });
}

const server = http.createServer((req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }

    if (req.url.startsWith('/api/')) {
        proxyToGov(req, res);
    } else {
        serveStatic(req, res);
    }
});

server.listen(PORT, () => {
    console.log(`\n  Care Home Rating Tool`);
    console.log(`  ─────────────────────`);
    console.log(`  Server running at:  http://localhost:${PORT}`);
    console.log(`  API proxy:          /api/* → data.cms.gov/*\n`);
});
