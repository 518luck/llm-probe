import { jsxRenderer } from 'hono/jsx-renderer'
import { Script } from 'honox/server'

export default jsxRenderer(({ children }) => {
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>LLM API Tester</title>
        <Script src="/app/client.ts" />
        <style>{`
          :root {
            --bg: #f5f5f5;
            --card: #fff;
            --border: #e0e0e0;
            --text: #333;
            --primary: #4f46e5;
            --success: #10b981;
            --error: #ef4444;
            --muted: #888;
            --input-bg: #fff;
            --chip-bg: #eef2ff;
            --chip-border: #c7d2fe;
            --result-bg: #1e1e2e;
            --result-text: #cdd6f4;
            --hover-bg: #eef2ff;
            --preset-bg: #fafafa;
          }
          [data-theme="dark"] {
            --bg: #1a1b26;
            --card: #24283b;
            --border: #414868;
            --text: #c0caf5;
            --primary: #7aa2f7;
            --success: #9ece6a;
            --error: #f7768e;
            --muted: #565f89;
            --input-bg: #1a1b26;
            --chip-bg: #1f2335;
            --chip-border: #3b4261;
            --result-bg: #0f0f1a;
            --result-text: #a9b1d6;
            --hover-bg: #1f2335;
            --preset-bg: #1f2335;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            padding: 20px;
          }
          .container { max-width: 900px; margin: 0 auto; }
          h1 { font-size: 22px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
          h1 small { font-size: 13px; color: var(--muted); font-weight: normal; }

          .card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .card-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--muted); }

          .form-row {
            display: flex;
            gap: 8px;
            margin-bottom: 10px;
            align-items: center;
            flex-wrap: wrap;
          }
          .form-row label { font-size: 13px; min-width: 70px; font-weight: 500; }
          .form-row .flex-1 { flex: 1; min-width: 150px; }

          input, textarea, select {
            padding: 8px 12px;
            border: 1px solid var(--border);
            border-radius: 6px;
            font-size: 13px;
            font-family: inherit;
            background: var(--input-bg);
            color: var(--text);
            outline: none;
            transition: border-color 0.15s;
            width: 100%;
          }
          input:focus, textarea:focus, select:focus { border-color: var(--primary); }
          textarea { resize: vertical; font-family: 'SF Mono', Monaco, monospace; font-size: 12px; }

          .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            font-weight: 500;
            transition: opacity 0.15s;
            white-space: nowrap;
          }
          .btn:hover { opacity: 0.85; }
          .btn-primary { background: var(--primary); color: #fff; }
          .btn-success { background: var(--success); color: #fff; }
          .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text); }

          .headers-list { margin: 8px 0; }
          .header-item { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
          .header-item input { flex: 1; }
          .header-item .btn-remove {
            background: none; border: none; color: var(--error); cursor: pointer; font-size: 18px; padding: 4px;
          }
          .btn-add-header { font-size: 12px; color: var(--primary); cursor: pointer; background: none; border: none; }

          .tabs { display: flex; gap: 4px; margin-bottom: 12px; border-bottom: 1px solid var(--border); }
          .tab {
            padding: 8px 16px; cursor: pointer; font-size: 13px; border: none;
            background: none; color: var(--muted); border-bottom: 2px solid transparent;
            transition: all 0.15s;
          }
          .tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }
          .tab-content { display: none; }
          .tab-content.active { display: block; }

          .msg-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start; }
          .msg-row .role-select { width: 100px; }
          .msg-row textarea { flex: 1; }
          .msg-row .btn-remove { background: none; border: none; color: var(--error); cursor: pointer; font-size: 18px; padding: 4px; margin-top: 4px; }

          .result-box {
            background: var(--result-bg);
            color: var(--result-text);
            border-radius: 8px;
            padding: 14px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 12px;
            line-height: 1.6;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 500px;
            overflow-y: auto;
            margin-top: 8px;
          }
          .result-box .success { color: #a6e3a1; }
          .result-box .error { color: #f38ba8; }
          .result-box .key { color: #89b4fa; }
          .result-box .string { color: #a6e3a1; }
          .result-box .number { color: #fab387; }
          .result-box .bool { color: #cba6f7; }
          .result-box .null { color: #6c7086; }

          .status-bar { display: flex; gap: 12px; align-items: center; margin-top: 8px; font-size: 12px; }
          .status-bar .spinner { display: none; width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .status-bar.loading .spinner { display: inline-block; }
          .status-text { color: var(--muted); }
          .status-text.success { color: var(--success); }
          .status-text.error { color: var(--error); }

          .model-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
          .model-chip {
            padding: 4px 10px; border-radius: 14px; font-size: 12px;
            background: var(--chip-bg); color: var(--primary); border: 1px solid var(--chip-border);
          }
          .model-chip .endpoint-type { font-size: 10px; color: var(--muted); margin-left: 4px; }

          .preset-btn {
            font-size: 11px; padding: 3px 8px; border-radius: 4px;
            border: 1px solid var(--border); background: var(--preset-bg); cursor: pointer;
            color: var(--text);
          }
          .preset-btn:hover { background: var(--hover-bg); border-color: var(--primary); }

          .inline-flex { display: flex; gap: 8px; align-items: center; }

          .theme-toggle {
            background: none; border: 1px solid var(--border); border-radius: 20px;
            cursor: pointer; font-size: 16px; padding: 4px 10px;
            color: var(--text); margin-left: auto; transition: all 0.2s;
            display: flex; align-items: center; gap: 4px;
          }
          .theme-toggle:hover { border-color: var(--primary); background: var(--hover-bg); }
          .theme-toggle span { font-size: 12px; }
        `}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  )
})
