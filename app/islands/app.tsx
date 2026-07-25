import { useState, useEffect, useCallback } from 'hono/jsx'

interface Config {
  url: string
  key: string
  headers: Record<string, string>
}

interface Message {
  role: string
  content: string
}

export default function App() {
  const [apiUrl, setApiUrl] = useState('https://agentrouter.org/v1')
  const [apiKey, setApiKey] = useState('')
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([
    { key: 'User-Agent', value: 'QwenCode/1.0.0' }
  ])
  const [activeTab, setActiveTab] = useState('test')
  const [testModel, setTestModel] = useState('gpt-5.5')
  const [messages, setMessages] = useState<Message[]>([{ role: 'user', content: 'hi' }])
  const [stream, setStream] = useState(false)
  const [maxTokens, setMaxTokens] = useState(100)
  const [result, setResult] = useState('等待发送请求...')
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('')
  const [loading, setLoading] = useState(false)
  const [metaInfo, setMetaInfo] = useState('')
  const [modelList, setModelList] = useState<Array<{ id: string; supported_endpoint_types?: string[] }>>([])
  const [isDark, setIsDark] = useState(false)

  // 初始化主题
  useEffect(() => {
    const saved = localStorage.getItem('llm-tester-theme')
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
      setIsDark(true)
    } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches && !saved) {
      document.documentElement.setAttribute('data-theme', 'dark')
      setIsDark(true)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    document.documentElement.setAttribute('data-theme', newIsDark ? 'dark' : 'light')
    localStorage.setItem('llm-tester-theme', newIsDark ? 'dark' : 'light')
  }, [isDark])

  const addHeader = useCallback(() => {
    setHeaders(prev => [...prev, { key: '', value: '' }])
  }, [])

  const removeHeader = useCallback((index: number) => {
    setHeaders(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateHeader = useCallback((index: number, field: 'key' | 'value', val: string) => {
    setHeaders(prev => prev.map((h, i) => i === index ? { ...h, [field]: val } : h))
  }, [])

  const addMessage = useCallback(() => {
    setMessages(prev => [...prev, { role: 'user', content: '' }])
  }, [])

  const removeMessage = useCallback((index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateMessage = useCallback((index: number, field: 'role' | 'content', val: string) => {
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, [field]: val } : m))
  }, [])

  const setPreset = useCallback((name: string) => {
    if (name === 'agentrouter') {
      setApiUrl('https://agentrouter.org/v1')
      setHeaders([{ key: 'User-Agent', value: 'QwenCode/1.0.0' }])
    } else {
      setApiUrl('')
      setHeaders([])
    }
  }, [])

  const showResult = useCallback((data: unknown) => {
    if (typeof data === 'string') {
      setResult(data)
    } else {
      setResult(syntaxHighlight(data))
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
    headers.forEach(h => {
      if (h.key.trim()) headerObj[h.key.trim()] = h.value.trim()
    })
    if (apiKey) headerObj['Authorization'] = `Bearer ${apiKey}`
    return { url, key: apiKey, headers: headerObj }
  }, [apiKey, apiUrl, headers])

  const listModels = useCallback(async () => {
    const cfg = getConfig()
    if (!cfg.url) { setStatus('请填写 API URL'); setStatusType('error'); return }
    setStatus('获取模型列表中...'); setStatusType('loading'); setLoading(true)

    try {
      let result = await proxyRequest(cfg.url + '/models', 'GET', cfg.headers)
      let data = result.data

      if (!data?.data) {
        const baseUrl = cfg.url.replace(/\/v1\/?$/, '')
        result = await proxyRequest(baseUrl + '/v1/models', 'GET', cfg.headers)
        data = result.data
      }

      const models = data?.data || data?.models || []
      setModelList(models)
      setStatus(`获取成功，共 ${models.length} 个模型`)
      setStatusType('success')
      showResult(data)
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
    if (!cfg.url) { setStatus('请填写 API URL'); setStatusType('error'); return }
    if (!testModel.trim()) { setStatus('请填写模型名称'); setStatusType('error'); return }
    if (messages.length === 0 || !messages.some(m => m.content.trim())) {
      setStatus('请至少输入一条消息'); setStatusType('error'); return
    }

    const body = {
      model: testModel.trim(),
      messages: messages.filter(m => m.content.trim()),
      max_tokens: maxTokens,
      stream
    }

    setStatus('发送请求中...'); setStatusType('loading'); setLoading(true)
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
          usage: data.usage || null
        }
        showResult(formatted)
        setStatus('✅ 请求成功')
        setStatusType('success')
        if (data.usage) {
          setMetaInfo(`输入: ${data.usage.prompt_tokens || '-'} | 输出: ${data.usage.completion_tokens || '-'} | 总计: ${data.usage.total_tokens || '-'}`)
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
    setStatus('就绪')
    setStatusType('')
    setMetaInfo('')
  }, [])

  return (
    <div class="container">
      <h1>
        🧪 LLM API Tester
        <small>快速测试 LLM API 连通性</small>
        <button class="theme-toggle" onClick={toggleTheme} title="切换主题">
          {isDark ? '☀️' : '🌙'} <span>{isDark ? '浅色' : '深色'}</span>
        </button>
      </h1>

      {/* 基础配置 */}
      <div class="card">
        <div class="card-title">🔌 连接配置</div>
        <div class="form-row">
          <label>API URL</label>
          <div class="flex-1 inline-flex">
            <input value={apiUrl} placeholder="https://example.com/v1" style="flex:1" onInput={e => setApiUrl((e.target as HTMLInputElement).value)} />
            <button class="preset-btn" onClick={() => setPreset('agentrouter')}>AgentRouter</button>
            <button class="preset-btn" onClick={() => setPreset('custom')}>自定义</button>
          </div>
        </div>
        <div class="form-row">
          <label>API Key</label>
          <div class="flex-1">
            <input type="password" value={apiKey} placeholder="sk-..." onInput={e => setApiKey((e.target as HTMLInputElement).value)} />
          </div>
        </div>
        <div class="form-row" style="align-items:flex-start">
          <label>请求头</label>
          <div class="flex-1">
            <div class="headers-list">
              {headers.map((h, i) => (
                <div class="header-item" key={i}>
                  <input class="header-key" value={h.key} placeholder="Header" onInput={e => updateHeader(i, 'key', (e.target as HTMLInputElement).value)} />
                  <input class="header-value" value={h.value} placeholder="Value" onInput={e => updateHeader(i, 'value', (e.target as HTMLInputElement).value)} />
                  <button class="btn-remove" onClick={() => removeHeader(i)}>×</button>
                </div>
              ))}
            </div>
            <button class="btn-add-header" onClick={addHeader}>+ 添加请求头</button>
          </div>
        </div>
      </div>

      {/* 操作区 */}
      <div class="card">
        <div class="tabs">
          <button class={`tab ${activeTab === 'test' ? 'active' : ''}`} onClick={() => setActiveTab('test')}>📤 发送测试</button>
          <button class={`tab ${activeTab === 'models' ? 'active' : ''}`} onClick={() => setActiveTab('models')}>📋 查看模型</button>
        </div>

        {/* Tab: 发送测试 */}
        <div class={`tab-content ${activeTab === 'test' ? 'active' : ''}`}>
          <div class="form-row">
            <label>模型</label>
            <div class="flex-1 inline-flex">
              <input value={testModel} placeholder="model id" style="flex:1" onInput={e => setTestModel((e.target as HTMLInputElement).value)} />
              <button class="preset-btn" onClick={() => setTestModel('gpt-5.5')}>gpt-5.5</button>
              <button class="preset-btn" onClick={() => setTestModel('claude-opus-4-6')}>opus-4-6</button>
              <button class="preset-btn" onClick={() => setTestModel('glm-5.2')}>glm-5.2</button>
            </div>
          </div>
          <div class="form-row" style="align-items:flex-start">
            <label>消息</label>
            <div class="flex-1">
              {messages.map((msg, i) => (
                <div class="msg-row" key={i}>
                  <select class="role-select" value={msg.role} onChange={e => updateMessage(i, 'role', (e.target as HTMLSelectElement).value)}>
                    <option value="user">user</option>
                    <option value="system">system</option>
                    <option value="assistant">assistant</option>
                  </select>
                  <textarea rows={2} placeholder="消息内容" value={msg.content} onInput={e => updateMessage(i, 'content', (e.target as HTMLTextAreaElement).value)} />
                  <button class="btn-remove" onClick={() => removeMessage(i)}>×</button>
                </div>
              ))}
              <button class="btn-add-header" onClick={addMessage}>+ 添加消息</button>
            </div>
          </div>
          <div class="form-row">
            <label>Stream</label>
            <div class="flex-1">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
                <input type="checkbox" checked={stream} onChange={e => setStream((e.target as HTMLInputElement).checked)} /> 启用 streaming
              </label>
            </div>
          </div>
          <div class="form-row">
            <label>最大 Token</label>
            <div class="flex-1">
              <input type="number" value={maxTokens} style="width:120px" onInput={e => setMaxTokens(parseInt((e.target as HTMLInputElement).value) || 100)} />
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:4px">
            <button class="btn btn-primary" onClick={sendTest}>🚀 发送请求</button>
            <button class="btn btn-outline" onClick={clearResult}>清除</button>
          </div>
        </div>

        {/* Tab: 查看模型 */}
        <div class={`tab-content ${activeTab === 'models' ? 'active' : ''}`}>
          <button class="btn btn-success" onClick={listModels}>📋 获取模型列表</button>
          <div class="model-list">
            {modelList.map(m => (
              <span class="model-chip" key={m.id} onClick={() => setTestModel(m.id)} style="cursor:pointer" title="点击填入测试框">
                {m.id}
                {m.supported_endpoint_types?.map(t => <span class="endpoint-type" key={t}>{t}</span>)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 结果区 */}
      <div class="card">
        <div class="card-title">📦 响应</div>
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

async function proxyRequest(url: string, method: string, headers: Record<string, string>, body?: unknown) {
  const resp = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, method, headers, body: body ? JSON.stringify(body) : null })
  })
  return await resp.json()
}
