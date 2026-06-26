/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                                                                     │
 * │   ███╗   ███╗██╗██████╗                                             │
 * │   ████╗ ████║██║██╔══██╗                                            │
 * │   ██╔████╔██║██║██████╔╝                                            │
 * │   ██║╚██╔╝██║██║██╔═══╝                                             │
 * │   ██║ ╚═╝ ██║██║██║                                                 │
 * │   ╚═╝     ╚═╝╚═╝╚═╝                                                 │
 * │                                                                     │
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │                                                                     │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const http2 = require('http2');
const https = require('https');
const axios = require('axios');

class Http2Agent {
  constructor() {
    this.sessions = new Map();
    this.agent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000,
    });
  }

  getSession(hostname) {
    if (!this.sessions.has(hostname)) {
      const session = http2.connect(`https://${hostname}`);
      session.on('error', err => {
        console.error(`HTTP/2 session error: ${err.message}`);
      });
      this.sessions.set(hostname, session);
    }
    return this.sessions.get(hostname);
  }

  async download(url) {
    const startTime = Date.now();

    try {
      // Используем HTTP/2 если возможно
      const urlObj = new URL(url);
      const session = this.getSession(urlObj.hostname);

      const response = await new Promise((resolve, reject) => {
        const req = session.request({
          ':method': 'GET',
          ':path': urlObj.pathname,
          'accept-encoding': 'gzip',
        });

        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        req.on('error', reject);
        req.end();
      });

      const duration = Date.now() - startTime;
      return { data: response, duration };
    } catch (err) {
      // Fallback на HTTP/1.1
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        httpsAgent: this.agent,
        timeout: 30000,
      });

      const duration = Date.now() - startTime;
      return { data: response.data, duration };
    }
  }

  close() {
    for (const session of this.sessions.values()) {
      session.close();
    }
    this.sessions.clear();
  }
}

module.exports = { Http2Agent };
