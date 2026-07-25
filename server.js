#!/usr/bin/env node

/**
 * LLM API Tester Server
 * 启动后访问 http://localhost:3001 即可使用
 * 服务端转发请求，无 CORS 问题
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.argv[2], 10) || 3001;

// 读取 HTML 文件
const htmlPath = path.join(__dirname, "api-tester.html");
let htmlContent = "";
try {
  htmlContent = fs.readFileSync(htmlPath, "utf-8");
} catch {
  console.error("未找到 api-tester.html，请确保文件在同一目录");
  process.exit(1);
}

function serveStatic(res) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(htmlContent);
}

async function handleProxy(req, res) {
  // 只允许 POST
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  // 读取请求体
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const { url, headers, method = "POST", body: requestBody } = JSON.parse(body);

      if (!url) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "缺少 url 参数" }));
        return;
      }

      console.log(`[PROXY] ${method} ${url}`);

      const targetUrl = new URL(url);
      const isHttps = targetUrl.protocol === "https:";
      const transport = isHttps ? https : http;

      const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: method,
        headers: {
          ...(headers || {}),
          ...(requestBody ? { "Content-Length": Buffer.byteLength(requestBody, "utf-8") } : {}),
        },
        rejectUnauthorized: false,
      };

      const proxyReq = transport.request(options, (proxyRes) => {
        // 收集响应
        let data = "";
        proxyRes.on("data", (chunk) => (data += chunk));
        proxyRes.on("end", () => {
          // 尝试解析 JSON
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch {}

          res.writeHead(proxyRes.statusCode, {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({ status: proxyRes.statusCode, data: parsed }));
        });
      });

      proxyReq.on("error", (err) => {
        res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: `代理请求失败: ${err.message}` }));
      });

      if (requestBody) {
        proxyReq.write(requestBody);
      }
      proxyReq.end();
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: `请求解析失败: ${e.message}` }));
    }
  });
}

const server = http.createServer((req, res) => {
  // CORS 头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/api/proxy") {
    handleProxy(req, res);
  } else {
    serveStatic(res);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("=".repeat(50));
  console.log("  LLM API Tester");
  console.log(`  打开浏览器访问:`);
  console.log(`  → http://127.0.0.1:${PORT}`);
  console.log("=".repeat(50));
  console.log("  按 Ctrl+C 停止");
});