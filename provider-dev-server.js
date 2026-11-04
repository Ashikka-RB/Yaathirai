
'use strict';

// STANDALONE DEV SERVER for the provider module
// Serves ./public statically plus /api/provider.
// Replace with the team's server when it exists.

// Run: node provider-dev-server.js
// URL: http://localhost:3000/provider/dashboard.html

const http = require('http');
const fs = require('fs');
const path = require('path');

const { handleProviderRequest } = require('./src/modules/provider');

const ROOT = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

// MIME types for different file extensions
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
};

http.createServer(async (req, res) => {

    // Handle provider API requests
    if (await handleProviderRequest(req, res)) {
        return;
    }

    // Extract the URL path
    let p = decodeURIComponent(
        new URL(req.url, 'http://x').pathname
    );

    // Redirect /provider to the dashboard
    if (p === '/provider' || p === '/provider/') {
        res.writeHead(302, {
            Location: '/provider/dashboard.html'
        });

        return res.end();
    }

    // Load index.html for directory requests
    if (p.endsWith('/')) {
        p += 'index.html';
    }

    // Construct the file path
    const file = path.normalize(
        path.join(ROOT, p)
    );

    // Prevent access outside the public directory
    if (!file.startsWith(ROOT)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    // Read and serve the requested file
    fs.readFile(file, (err, buf) => {

        if (err) {
            res.writeHead(404, {
                'Content-Type': 'text/plain'
            });

            return res.end('Not found');
        }

        res.writeHead(200, {
            'Content-Type':
                MIME[path.extname(file)] ||
                'application/octet-stream'
        });

        res.end(buf);
    });

}).listen(PORT, () => {

    console.log(
        `Yaathirai provider module: http://localhost:${PORT}/provider/dashboard.html (MOCK in-memory data)`
    );

});
