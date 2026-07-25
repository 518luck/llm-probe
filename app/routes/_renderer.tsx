import { jsxRenderer } from 'hono/jsx-renderer'
import { Script } from 'honox/server'

export default jsxRenderer(({ children }) => {
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧪</text></svg>"
        />
        <title>LLM API Tester</title>
        <Script src="/app/client.ts" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1b26;
            color: #c0caf5;
            padding: 20px;
          }
          .container { max-width: 900px; margin: 0 auto; }
          h1 { font-size: 22px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
          h1 small { font-size: 13px; color: #565f89; font-weight: normal; }

          .card {
            background: #24283b;
            border: 1px solid #414868;
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .card-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #565f89; }

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
            border: 1px solid #414868;
            border-radius: 6px;
            font-size: 13px;
            font-family: inherit;
            background: #1a1b26;
            color: #c0caf5;
            outline: none;
            transition: border-color 0.15s;
            width: 100%;
          }
          input:focus, textarea:focus, select:focus { border-color: #7aa2f7; }
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
          .btn-primary { background: #7aa2f7; color: #1a1b26; }
          .btn-success { background: #9ece6a; color: #1a1b26; }
          .btn-outline { background: transparent; border: 1px solid #414868; color: #c0caf5; }

          .headers-list { margin: 8px 0; }
          .header-item { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
          .header-item input { flex: 1; }
          .header-item .btn-remove {
            background: none; border: none; color: #f7768e; cursor: pointer; font-size: 18px; padding: 4px;
          }
          .btn-add-header { font-size: 12px; color: #7aa2f7; cursor: pointer; background: none; border: none; }

          .tabs { display: flex; gap: 4px; margin-bottom: 12px; border-bottom: 1px solid #414868; }
          .tab {
            padding: 8px 16px; cursor: pointer; font-size: 13px; border: none;
            background: none; color: #565f89; border-bottom: 2px solid transparent;
            transition: all 0.15s;
          }
          .tab.active { color: #7aa2f7; border-bottom-color: #7aa2f7; font-weight: 600; }
          .tab-content { display: none; }
          .tab-content.active { display: block; }

          .msg-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start; }
          .msg-row .role-select { width: 100px; }
          .msg-row textarea { flex: 1; }
          .msg-row .btn-remove { background: none; border: none; color: #f7768e; cursor: pointer; font-size: 18px; padding: 4px; margin-top: 4px; }

          .result-box {
            background: #0f0f1a;
            color: #a9b1d6;
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
          .status-bar .spinner { display: none; width: 14px; height: 14px; border: 2px solid #414868; border-top-color: #7aa2f7; border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .status-bar.loading .spinner { display: inline-block; }
          .status-text { color: #565f89; }
          .status-text.success { color: #9ece6a; }
          .status-text.error { color: #f7768e; }

          .model-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
          .model-chip {
            padding: 4px 10px; border-radius: 14px; font-size: 12px;
            background: #1f2335; color: #7aa2f7; border: 1px solid #3b4261;
            cursor: pointer;
          }
          .model-chip:hover { border-color: #7aa2f7; }
          .model-chip .endpoint-type { font-size: 10px; color: #565f89; margin-left: 4px; }

          .preset-btn {
            font-size: 11px; padding: 3px 8px; border-radius: 4px;
            border: 1px solid #414868; background: #1f2335; cursor: pointer;
            color: #c0caf5;
          }
          .preset-btn:hover { background: #1f2335; border-color: #7aa2f7; }

          .inline-flex { display: flex; gap: 8px; align-items: center; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
})
