const http = require('http');
const url = require('url');
const fetch = require('node-fetch'); // npm install node-fetch@2

const PORT = 3000;

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const kodi_ip = parsedUrl.query.ip || '192.168.0.14:8080';
    const kodi_url = `http://${kodi_ip}/jsonrpc`;

    let body = '';
    req.on('data', chunk => body += chunk);
    await new Promise(resolve => req.on('end', resolve));

    const kodiHeaders = {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
    };

    console.log('Enviando a Kodi:', kodiHeaders);
    console.log('Cuerpo:', body);

    try {
        const response = await fetch(kodi_url, {
            method: 'POST',
            headers: kodiHeaders,
            body
        });

        const data = await response.text();
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(data);
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    }
});

server.listen(PORT, () => {
    console.log(`kodi_proxy.js escuchando en http://localhost:${PORT}`);
});