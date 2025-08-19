// lib/mcp-bridge.js - Minimal MCP client for Emma server
// CommonJS module to match server runtime

const http = require('http');

function buildOptions(method, path, token, host = 'localhost', port = 8080, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opt = { hostname: host, port, path, method, headers };
  return { opt, payload: body ? JSON.stringify(body) : null };
}

function requestJson(method, path, token, host, port, body) {
  return new Promise((resolve, reject) => {
    const { opt, payload } = buildOptions(method, path, token, host, port, body);
    const req = http.request(opt, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(json);
          reject(Object.assign(new Error(json.error || 'Request failed'), { status: res.statusCode }));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

class EmmaMCPClient {
  constructor({ host = 'localhost', port = 8080, token = null } = {}) {
    this.host = host;
    this.port = port;
    this.token = token;
  }

  async registerAgent({ name, type, capabilities, permissions }) {
    return requestJson('POST', '/mcp/v1/agents/register', null, this.host, this.port, {
      name,
      type,
      capabilities,
      permissions,
    });
  }

  async listAgents() {
    return requestJson('GET', '/mcp/v1/agents', this.token, this.host, this.port);
  }

  async createMemory({ content, metadata = {}, attachments = [], privacy = 'private' }) {
    return requestJson('POST', '/mcp/v1/memories', this.token, this.host, this.port, {
      content,
      metadata,
      attachments,
      privacy,
    });
  }

  async getMemories({ limit = 50, offset = 0 } = {}) {
    const path = `/mcp/v1/memories?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`;
    return requestJson('GET', path, this.token, this.host, this.port);
  }

  async getMemory(id) {
    return requestJson('GET', `/mcp/v1/memories/${encodeURIComponent(id)}`, this.token, this.host, this.port);
  }

  async updateMemory(id, updates) {
    return requestJson('PATCH', `/mcp/v1/memories/${encodeURIComponent(id)}`, this.token, this.host, this.port, { updates });
  }

  async deleteMemory(id) {
    return requestJson('DELETE', `/mcp/v1/memories/${encodeURIComponent(id)}`, this.token, this.host, this.port);
  }

  async search({ query, limit = 10 }) {
    return requestJson('POST', '/mcp/v1/memories/search', this.token, this.host, this.port, { query, limit });
  }

  async relevant({ context, limit = 5 }) {
    return requestJson('POST', '/mcp/v1/memories/relevant', this.token, this.host, this.port, { context, limit });
  }

  async batch(operations) {
    return requestJson('POST', '/mcp/v1/memories/batch', this.token, this.host, this.port, { operations });
  }
}

module.exports = { EmmaMCPClient };


