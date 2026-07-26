import { useCallback, useEffect, useState } from 'hono/jsx'

interface Config {
  url: string
  key: string
  headers: Record<string, string>
}

interface Message {
  role: string
  content: string
}

interface CacheData {
  urls: Record<string, string>
  models: Record<string, Array<{ id: string; supported_endpoint_types?: string[] }>>
  lastUrl: string
}

// 从服务端加载缓存
async function loadCacheFromServer(): Promise<CacheData> {
  try {
    const resp = await fetch('/api/cache')
    return await resp.json()
  } catch {
    return { urls: {}, models: {}, lastUrl: '' }
  }
}

// 保存缓存到服务端
async function saveCacheToServer(data: {
  url?: string
  key?: string
  models?: Array<{ id: string; supported_endpoint_types?: string[] }>
  lastUrl?: string
}) {
  try {
    await fetch('/api/cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch {
    // ignore
  }
}

export default function App() {
  const [apiUrl, setApiUrl] = useState('https://agentrouter.org/v1')
  const [apiKey, setApiKey] = useState('')
  const [cachedUrls, setCachedUrls] = useState<Record<string, string>>({})
  const [cachedModels, setCachedModels] = useState<
    Record<string, Array<{ id: string; supported_endpoint_types?: string[] }>>
  >({})
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([])
  const [activeTab, setActiveTab] = useState('test')
  const [testModel, setTestModel] = useState('gpt-5.5')
  const [messages, setMessages] = useState<Message[]>([{ role: 'user', content: 'hi' }])
  const [stream, setStream] = useState(false)
  const [maxTokens, setMaxTokens] = useState(100)
  const [result, setResult] = useState('等待发送请求...')
  const [rawResult, setRawResult] = useState('') // 保存原始 JSON 用于复制
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('')
  const [loading, setLoading] = useState(false)
  const [metaInfo, setMetaInfo] = useState('')
  const [modelList, setModelList] = useState<
    Array<{ id: string; supported_endpoint_types?: string[] }>
  >([])

  // 从服务端加载缓存的 API 配置
  useEffect(() => {
    loadCacheFromServer().then((cache) => {
      setCachedUrls(cache.urls)
      setCachedModels(cache.models)
      if (cache.lastUrl) {
        setApiUrl(cache.lastUrl)
        setApiKey(cache.urls[cache.lastUrl] || '')
        // 加载该 URL 的缓存模型列表
        if (cache.models[cache.lastUrl]) {
          setModelList(cache.models[cache.lastUrl])
        }
      }
    })
  }, [])

  // 处理 API URL 变更
  const handleApiUrlChange = useCallback((newUrl: string) => {
    setApiUrl(newUrl)
    saveCacheToServer({ lastUrl: newUrl })
    // 切换 URL 时，从服务端获取该 URL 对应的 API Key 和模型列表
    loadCacheFromServer().then((cache) => {
      setApiKey(cache.urls[newUrl] || '')
      setCachedModels(cache.models)
      if (cache.models[newUrl]) {
        setModelList(cache.models[newUrl])
      } else {
        setModelList([])
      }
    })
  }, [])

  // 处理 API Key 变更
  const handleApiKeyChange = useCallback(
    (newKey: string) => {
      setApiKey(newKey)
      // 保存当前 URL 对应的 API Key 到服务端
      saveCacheToServer({ url: apiUrl, key: newKey })
      // 更新本地缓存列表
      setCachedUrls((prev) => ({ ...prev, [apiUrl]: newKey }))
    },
    [apiUrl],
  )

  const addHeader = useCallback(() => {
    setHeaders((prev) => [...prev, { key: '', value: '' }])
  }, [])

  const removeHeader = useCallback((index: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateHeader = useCallback((index: number, field: 'key' | 'value', val: string) => {
    setHeaders((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: val } : h)))
  }, [])

  const addMessage = useCallback(() => {
    setMessages((prev) => [...prev, { role: 'user', content: '' }])
  }, [])

  const removeMessage = useCallback((index: number) => {
    setMessages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateMessage = useCallback((index: number, field: 'role' | 'content', val: string) => {
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: val } : m)))
  }, [])

  const showResult = useCallback((data: unknown) => {
    if (typeof data === 'string') {
      setResult(data)
      setRawResult(data)
    } else {
      setResult(syntaxHighlight(data))
      setRawResult(JSON.stringify(data, null, 2))
    }
  }, [])

  const syntaxHighlight = (obj: unknown): string => {
    const json = JSON.stringify(obj, null, 2)
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="string">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="bool">$1</span>')
      .replace(/: (null)/g, ': <span class="null">$1</span>')
  }

  const getConfig = useCallback((): Config => {
    const url = apiUrl.replace(/\/+$/, '')
    const headerObj = {} as Record<string, string>
    headers.forEach((h) => {
      if (h.key.trim()) headerObj[h.key.trim()] = h.value.trim()
    })
    if (apiKey) headerObj.Authorization = `Bearer ${apiKey}`
    return { url, key: apiKey, headers: headerObj }
  }, [apiKey, apiUrl, headers])

  const listModels = useCallback(async () => {
    const cfg = getConfig()
    if (!cfg.url) {
      setStatus('请填写 API URL')
      setStatusType('error')
      return
    }
    setStatus('获取模型列表中...')
    setStatusType('loading')
    setLoading(true)

    try {
      let result = await proxyRequest(`${cfg.url}/models`, 'GET', cfg.headers)
      let data = result.data

      if (!data?.data) {
        const baseUrl = cfg.url.replace(/\/v1\/?$/, '')
        result = await proxyRequest(`${baseUrl}/v1/models`, 'GET', cfg.headers)
        data = result.data
      }

      const models = data?.data || data?.models || []
      setModelList(models)
      setStatus(`获取成功，共 ${models.length} 个模型`)
      setStatusType('success')
      showResult(data)
      // 保存模型列表到缓存
      saveCacheToServer({ url: apiUrl, models })
      setCachedModels((prev) => ({ ...prev, [apiUrl]: models }))
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '未知错误'
      setStatus(`获取失败: ${message}`)
      setStatusType('error')
    } finally {
      setLoading(false)
    }
  }, [getConfig, showResult])

  const sendTest = useCallback(async () => {
    const cfg = getConfig()
    if (!cfg.url) {
      setStatus('请填写 API URL')
      setStatusType('error')
      return
    }
    if (!testModel.trim()) {
      setStatus('请填写模型名称')
      setStatusType('error')
      return
    }
    if (messages.length === 0 || !messages.some((m) => m.content.trim())) {
      setStatus('请至少输入一条消息')
      setStatusType('error')
      return
    }

    const body = {
      model: testModel.trim(),
      messages: messages.filter((m) => m.content.trim()),
      max_tokens: maxTokens,
      stream,
    }

    setStatus('发送请求中...')
    setStatusType('loading')
    setLoading(true)
    setMetaInfo('')
    showResult('请求中...')

    const baseUrl = cfg.url.replace(/\/+$/, '')
    const url = `${baseUrl}/chat/completions`

    try {
      const result = await proxyRequest(url, 'POST', cfg.headers, body)
      const { status: httpStatus, data } = result

      if (httpStatus >= 200 && httpStatus < 300) {
        const formatted = {
          model: data.model || testModel,
          content: data.choices?.[0]?.message?.content || '',
          finish_reason: data.choices?.[0]?.finish_reason || '',
          usage: data.usage || null,
        }
        showResult(formatted)
        setStatus('✅ 请求成功')
        setStatusType('success')
        if (data.usage) {
          setMetaInfo(
            `输入: ${data.usage.prompt_tokens || '-'} | 输出: ${data.usage.completion_tokens || '-'} | 总计: ${data.usage.total_tokens || '-'}`,
          )
        }
      } else {
        showResult(data)
        setStatus(`❌ ${httpStatus} ${data?.error?.message || data?.error || '请求失败'}`)
        setStatusType('error')
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '未知错误'
      setStatus(`❌ 请求失败: ${message}`)
      setStatusType('error')
      showResult({ error: message })
    } finally {
      setLoading(false)
    }
  }, [getConfig, testModel, messages, maxTokens, stream, showResult])

  const clearResult = useCallback(() => {
    setResult('等待发送请求...')
    setRawResult('')
    setStatus('就绪')
    setStatusType('')
    setMetaInfo('')
  }, [])

  // 复制结果到剪贴板
  const copyResult = useCallback(() => {
    if (rawResult) {
      navigator.clipboard.writeText(rawResult)
      setStatus('已复制到剪贴板')
      setStatusType('success')
      setTimeout(() => {
        setStatus('')
        setStatusType('')
      }, 2000)
    }
  }, [rawResult])

  // 批量测试所有模型
  const batchTest = useCallback(async () => {
    if (modelList.length === 0) {
      setStatus('请先获取模型列表')
      setStatusType('error')
      return
    }

    const cfg = getConfig()
    if (!cfg.url) {
      setStatus('请填写 API URL')
      setStatusType('error')
      return
    }

    const testMessage = messages.find((m) => m.content.trim()) || { role: 'user', content: 'Hello' }
    setStatus(`批量测试中... (0/${modelList.length})`)
    setStatusType('loading')
    setLoading(true)
    setMetaInfo('')

    const results: Array<{ model: string; status: string; time: number; error?: string }> = []
    let completed = 0

    for (const model of modelList) {
      const startTime = Date.now()
      try {
        const baseUrl = cfg.url.replace(/\/+$/, '')
        const url = `${baseUrl}/chat/completions`
        const body = {
          model: model.id,
          messages: [testMessage],
          max_tokens: 10,
          stream: false,
        }

        const result = await proxyRequest(url, 'POST', cfg.headers, body)
        const elapsed = Date.now() - startTime

        if (result.status >= 200 && result.status < 300) {
          results.push({ model: model.id, status: '✅', time: elapsed })
        } else {
          results.push({
            model: model.id,
            status: '❌',
            time: elapsed,
            error: result.data?.error?.message || '请求失败',
          })
        }
      } catch (e: unknown) {
        const elapsed = Date.now() - startTime
        const message = e instanceof Error ? e.message : '未知错误'
        results.push({ model: model.id, status: '❌', time: elapsed, error: message })
      }

      completed++
      setStatus(`批量测试中... (${completed}/${modelList.length})`)
    }

    // 格式化结果
    const resultHtml = results
      .map(
        (r) =>
          `<span class="${r.status === '✅' ? 'success' : 'error'}">${r.status}</span> ${r.model} <span class="number">${r.time}ms</span>${r.error ? ` <span class="error">${r.error}</span>` : ''}`,
      )
      .join('\n')

    setResult(resultHtml)
    const successCount = results.filter((r) => r.status === '✅').length
    setStatus(`批量测试完成: ${successCount}/${results.length} 成功`)
    setStatusType(successCount === results.length ? 'success' : 'error')
    setLoading(false)
  }, [getConfig, modelList, messages, showResult])

  return (
    <div class="container">
      <h1>
        🧪 LLM API Tester
        <small>快速测试 LLM API 连通性</small>
      </h1>

      {/* 基础配置 */}
      <div class="card">
        <div class="card-title">🔌 连接配置</div>
        <div class="form-row">
          <label>API URL</label>
          <div class="flex-1 inline-flex">
            <input
              value={apiUrl}
              placeholder="https://example.com/v1"
              style="flex:1"
              onInput={(e) => handleApiUrlChange((e.target as HTMLInputElement).value)}
            />
            {Object.keys(cachedUrls).length > 0 && (
              <select
                value={apiUrl}
                onChange={(e) => handleApiUrlChange((e.target as HTMLSelectElement).value)}
                style="width:200px"
              >
                {Object.keys(cachedUrls).map((url) => (
                  <option key={url} value={url}>
                    {url}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div class="form-row">
          <label>API Key</label>
          <div class="flex-1">
            <input
              type="text"
              value={apiKey}
              placeholder="sk-..."
              onInput={(e) => handleApiKeyChange((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
        <div class="form-row" style="align-items:flex-start">
          <label>请求头</label>
          <div class="flex-1">
            <div class="headers-list">
              {/* 默认请求头 */}
              <div class="header-item" style="opacity:0.7">
                <input
                  class="header-key"
                  value="Content-Type"
                  disabled
                  style="background:#1f2335"
                />
                <input
                  class="header-value"
                  value="application/json"
                  disabled
                  style="background:#1f2335"
                />
                <span style="font-size:11px;color:#565f89;width:50px">默认</span>
              </div>
              <div class="header-item" style="opacity:0.7">
                <input
                  class="header-key"
                  value="Authorization"
                  disabled
                  style="background:#1f2335"
                />
                <input
                  class="header-value"
                  value={apiKey ? `Bearer ${apiKey.slice(0, 10)}...` : '(未设置)'}
                  disabled
                  style="background:#1f2335"
                />
                <span style="font-size:11px;color:#565f89;width:50px">自动</span>
              </div>
              {/* 客户端模拟选择 */}
              <div style="margin:8px 0">
                <div style="font-size:12px;color:#565f89;margin-bottom:6px">模拟客户端</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  {[
                    { key: 'User-Agent', value: 'QwenCode/1.0.0', label: '千问 Code' },
                    {
                      key: 'User-Agent',
                      value: 'claude-cli/2.1.22 (external, cli)',
                      label: 'Claude Code',
                    },
                    {
                      key: 'User-Agent',
                      value: 'codex_cli_rs/0.125.0 (Ubuntu 22.4.0; x86_64) xterm-256color',
                      label: 'Codex CLI',
                    },
                    { key: 'User-Agent', value: 'Cursor/0.50.7 (darwin; arm64)', label: 'Cursor' },
                    {
                      key: 'User-Agent',
                      value: 'Windsurf/1.2.0 (darwin; arm64)',
                      label: 'Windsurf',
                    },
                    { key: 'User-Agent', value: 'Cline/3.2.0 (vscode)', label: 'Cline' },
                    { key: 'User-Agent', value: 'aider/0.80.0 (python/3.11)', label: 'Aider' },
                    { key: 'User-Agent', value: 'Continue/0.9.0 (vscode)', label: 'Continue' },
                  ].map((preset) => {
                    const exists = headers.some(
                      (h) => h.key === preset.key && h.value === preset.value,
                    )
                    return (
                      <button
                        type="button"
                        class="preset-btn"
                        style={exists ? 'background:#7aa2f7;color:#1a1b26' : ''}
                        onClick={() => {
                          if (exists) {
                            setHeaders((prev) =>
                              prev.filter(
                                (h) => !(h.key === preset.key && h.value === preset.value),
                              ),
                            )
                          } else {
                            // 替换已有的 User-Agent
                            setHeaders((prev) => [
                              ...prev.filter((h) => h.key !== 'User-Agent'),
                              { key: preset.key, value: preset.value },
                            ])
                          }
                        }}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* 常用请求头选择 */}
              <div style="margin:8px 0">
                <div style="font-size:12px;color:#565f89;margin-bottom:6px">常用请求头</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  {[
                    { key: 'Accept', value: 'application/json', label: 'Accept' },
                    { key: 'X-Request-ID', value: '', label: 'Request-ID' },
                    { key: 'X-Custom-Source', value: 'llm-probe', label: 'Custom-Source' },
                  ].map((preset) => {
                    const exists = headers.some((h) => h.key === preset.key)
                    return (
                      <button
                        type="button"
                        class="preset-btn"
                        style={exists ? 'background:#7aa2f7;color:#1a1b26' : ''}
                        onClick={() => {
                          if (exists) {
                            setHeaders((prev) => prev.filter((h) => h.key !== preset.key))
                          } else {
                            setHeaders((prev) => [
                              ...prev,
                              { key: preset.key, value: preset.value },
                            ])
                          }
                        }}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* 自定义请求头 */}
              {headers.map((h, i) => (
                <div class="header-item" key={i}>
                  <input
                    class="header-key"
                    value={h.key}
                    placeholder="Header"
                    onInput={(e) => updateHeader(i, 'key', (e.target as HTMLInputElement).value)}
                  />
                  <input
                    class="header-value"
                    value={h.value}
                    placeholder="Value"
                    onInput={(e) => updateHeader(i, 'value', (e.target as HTMLInputElement).value)}
                  />
                  <button type="button" class="btn-remove" onClick={() => removeHeader(i)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" class="btn-add-header" onClick={addHeader}>
              + 添加自定义请求头
            </button>
          </div>
        </div>
      </div>

      {/* 操作区 */}
      <div class="card">
        <div class="tabs">
          <button
            type="button"
            class={`tab ${activeTab === 'test' ? 'active' : ''}`}
            onClick={() => setActiveTab('test')}
          >
            📤 发送测试
          </button>
          <button
            type="button"
            class={`tab ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            📋 查看模型
          </button>
          <button
            type="button"
            class={`tab ${activeTab === 'sites' ? 'active' : ''}`}
            onClick={() => setActiveTab('sites')}
          >
            🌐 站点管理
          </button>
        </div>

        {/* Tab: 发送测试 */}
        <div class={`tab-content ${activeTab === 'test' ? 'active' : ''}`}>
          <div class="form-row">
            <label>模型</label>
            <div class="flex-1 inline-flex">
              <input
                value={testModel}
                placeholder="model id"
                style="flex:1"
                onInput={(e) => setTestModel((e.target as HTMLInputElement).value)}
              />
              {modelList.length > 0 && (
                <select
                  value={testModel}
                  onChange={(e) => setTestModel((e.target as HTMLSelectElement).value)}
                  style="width:200px"
                >
                  {modelList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div class="form-row" style="align-items:flex-start">
            <label>消息</label>
            <div class="flex-1">
              {messages.map((msg, i) => (
                <div class="msg-row" key={i}>
                  <select
                    class="role-select"
                    value={msg.role}
                    onChange={(e) =>
                      updateMessage(i, 'role', (e.target as HTMLSelectElement).value)
                    }
                  >
                    <option value="user">user</option>
                    <option value="system">system</option>
                    <option value="assistant">assistant</option>
                  </select>
                  <textarea
                    rows={2}
                    placeholder="消息内容"
                    value={msg.content}
                    onInput={(e) =>
                      updateMessage(i, 'content', (e.target as HTMLTextAreaElement).value)
                    }
                  />
                  <button type="button" class="btn-remove" onClick={() => removeMessage(i)}>
                    ×
                  </button>
                </div>
              ))}
              <button type="button" class="btn-add-header" onClick={addMessage}>
                + 添加消息
              </button>
            </div>
          </div>
          <div class="form-row">
            <label>Stream</label>
            <div class="flex-1">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
                <input
                  type="checkbox"
                  checked={stream}
                  onChange={(e) => setStream((e.target as HTMLInputElement).checked)}
                />{' '}
                启用 streaming
              </label>
            </div>
          </div>
          <div class="form-row">
            <label>最大 Token</label>
            <div class="flex-1">
              <input
                type="number"
                value={maxTokens}
                style="width:120px"
                onInput={(e) =>
                  setMaxTokens(parseInt((e.target as HTMLInputElement).value, 10) || 100)
                }
              />
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:4px">
            <button type="button" class="btn btn-primary" onClick={sendTest}>
              🚀 发送请求
            </button>
            <button type="button" class="btn btn-success" onClick={batchTest}>
              📊 批量测试
            </button>
            <button type="button" class="btn btn-outline" onClick={clearResult}>
              清除
            </button>
          </div>
        </div>

        {/* Tab: 查看模型 */}
        <div class={`tab-content ${activeTab === 'models' ? 'active' : ''}`}>
          <button type="button" class="btn btn-success" onClick={listModels}>
            📋 获取模型列表
          </button>
          <div class="model-list">
            {modelList.map((m) => (
              <button
                type="button"
                class="model-chip"
                key={m.id}
                onClick={() => setTestModel(m.id)}
                title="点击填入测试框"
              >
                {m.id}
                {m.supported_endpoint_types?.map((t) => (
                  <span class="endpoint-type" key={t}>
                    {t}
                  </span>
                ))}
              </button>
            ))}
          </div>
        </div>

        {/* Tab: 站点管理 */}
        <div class={`tab-content ${activeTab === 'sites' ? 'active' : ''}`}>
          {Object.keys(cachedUrls).length === 0 ? (
            <div style="color:#565f89;font-size:13px">暂无保存的站点</div>
          ) : (
            <div style="display:flex;flex-direction:column;gap:12px">
              {Object.entries(cachedUrls).map(([url, key]) => (
                <div
                  key={url}
                  style="background:#1f2335;border:1px solid #414868;border-radius:8px;padding:12px"
                >
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                    <div style="font-weight:600;color:#c0caf5;word-break:break-all">{url}</div>
                    <button
                      type="button"
                      class="btn btn-outline"
                      style="font-size:11px;padding:4px 8px"
                      onClick={() => handleApiUrlChange(url)}
                    >
                      切换
                    </button>
                  </div>
                  <div style="font-size:12px;color:#565f89;margin-bottom:8px">
                    Key: {key.slice(0, 15)}...
                  </div>
                  <div>
                    <div style="font-size:12px;color:#565f89;margin-bottom:4px">
                      模型 ({cachedModels[url]?.length || 0}):
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px">
                      {cachedModels[url]?.length > 0 ? (
                        cachedModels[url].map((m) => (
                          <span
                            key={m.id}
                            style="background:#24283b;border:1px solid #3b4261;border-radius:4px;padding:2px 6px;font-size:11px;color:#7aa2f7"
                          >
                            {m.id}
                          </span>
                        ))
                      ) : (
                        <span style="font-size:11px;color:#565f89">暂无模型</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 结果区 */}
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="card-title" style="margin-bottom:0">
            📦 响应
          </div>
          {rawResult && (
            <button
              type="button"
              class="btn btn-outline"
              style="font-size:11px;padding:4px 8px"
              onClick={copyResult}
            >
              📋 复制
            </button>
          )}
        </div>
        <div class={`status-bar ${loading ? 'loading' : ''}`}>
          <span class="spinner"></span>
          <span class={`status-text ${statusType}`}>{status || '就绪'}</span>
          <span style="color:var(--muted);font-size:11px">{metaInfo}</span>
        </div>
        <div class="result-box" dangerouslySetInnerHTML={{ __html: result }} />
      </div>
    </div>
  )
}

async function proxyRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: unknown,
) {
  const resp = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, method, headers, body: body ? JSON.stringify(body) : null }),
  })
  return await resp.json()
}
