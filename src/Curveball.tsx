import { useState, useEffect, useRef } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface Analysis {
  misperception: { type: string; title: string; content: string }
  essence: { summary: string; industry: string; role: string }
  threshold: { level: string; match: string; path: string[] }
  skills: { core: string[]; match: string; practice: string[] }
  experience: { scene: string; value: string; fit_test: string }
  conclusion: { feasibility: string; priority_action: string }
}

export default function Curveball() {
  const [job, setJob] = useState('')
  const [major, setMajor] = useState('')
  const [analysis, setAnalysis] = useState<Partial<Analysis> | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<'volcengine' | 'deepseek'>('volcengine')

  // 渐进展示控制
  const [phase, setPhase] = useState<'idle' | 'validating' | 'requesting' | 'streaming' | 'rendering' | 'done'>('idle')
  const [show, setShow] = useState({
    mis: false,
    essence: false,
    threshold: false,
    skills: false,
    experience: false,
    conclusion: false,
  })
  const revealTimers = useRef<number[]>([])

  function resetReveal() {
    revealTimers.current.forEach((t) => clearTimeout(t))
    revealTimers.current = []
    setShow({ mis: false, essence: false, threshold: false, skills: false, experience: false, conclusion: false })
  }

  useEffect(() => {
    return () => {
      resetReveal()
    }
  }, [])

  // 重置功能：清空所有状态和缓存
  function resetReport() {
    // 清空分析结果
    setAnalysis(null)
    // 重置阶段
    setPhase('idle')
    // 重置显示状态
    resetReveal()
    // 清空输入
    setJob('')
    setMajor('')
    // 清空浏览器缓存
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name)
        })
      })
    }
    // 清空localStorage
    localStorage.clear()
    // 清空sessionStorage
    sessionStorage.clear()
    // 重新加载页面以确保完全重置
    window.location.reload()
  }

  // PDF生成功能
  async function generatePDF() {
    if (!analysis) return
    
    try {
      // 创建一个临时的div来渲染PDF内容
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.width = '800px'
      tempDiv.style.padding = '40px'
      tempDiv.style.backgroundColor = 'white'
      tempDiv.style.fontFamily = 'Arial, sans-serif'
      
      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 10px;">职业可行性分析报告</h1>
          <p style="color: #6b7280; font-size: 14px;">职业：${job} | 专业：${major}</p>
          <p style="color: #6b7280; font-size: 12px;">生成时间：${new Date().toLocaleString('zh-CN')}</p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">1. 认知误区</h2>
          <p style="margin-bottom: 8px;"><strong>类型：</strong>${analysis.misperception?.type || ''}</p>
          <p style="margin-bottom: 8px;"><strong>标题：</strong>${analysis.misperception?.title || ''}</p>
          <p style="line-height: 1.6;">${analysis.misperception?.content || ''}</p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">2. 职业本质</h2>
          <p style="margin-bottom: 8px;"><strong>总结：</strong>${analysis.essence?.summary || ''}</p>
          <p style="margin-bottom: 8px;"><strong>行业：</strong>${analysis.essence?.industry || ''}</p>
          <p style="line-height: 1.6;"><strong>角色：</strong>${analysis.essence?.role || ''}</p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">3. 门槛匹配</h2>
          <p style="margin-bottom: 8px;"><strong>水平：</strong>${analysis.threshold?.level || ''}</p>
          <p style="margin-bottom: 8px;"><strong>匹配度：</strong>${analysis.threshold?.match || ''}</p>
          <p style="line-height: 1.6;"><strong>路径：</strong>${analysis.threshold?.path?.join(', ') || ''}</p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">4. 技能要求</h2>
          <p style="margin-bottom: 8px;"><strong>核心技能：</strong>${analysis.skills?.core?.join(', ') || ''}</p>
          <p style="margin-bottom: 8px;"><strong>匹配度：</strong>${analysis.skills?.match || ''}</p>
          <p style="line-height: 1.6;"><strong>实践建议：</strong>${analysis.skills?.practice?.join(', ') || ''}</p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">5. 体验动力</h2>
          <p style="margin-bottom: 8px;"><strong>场景体验：</strong>${analysis.experience?.scene || ''}</p>
          <p style="margin-bottom: 8px;"><strong>价值动力：</strong>${analysis.experience?.value || ''}</p>
          <p style="line-height: 1.6;"><strong>适配性验证：</strong>${analysis.experience?.fit_test || ''}</p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">6. 可能性结论</h2>
          <p style="margin-bottom: 8px;"><strong>可行性：</strong>${analysis.conclusion?.feasibility || ''}</p>
          <p style="line-height: 1.6;"><strong>最优先行动：</strong>${analysis.conclusion?.priority_action || ''}</p>
        </div>
      `
      
      document.body.appendChild(tempDiv)
      
      // 使用html2canvas截图
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      })
      
      // 移除临时div
      document.body.removeChild(tempDiv)
      
      // 创建PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 10
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
      
      // 下载PDF
      const fileName = `职业可行性分析报告_${job}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)
      
    } catch (error) {
      console.error('PDF生成失败:', error)
      alert('PDF生成失败，请重试')
    }
  }

  async function getAnalysis() {
    const j = job.trim()
    const m = major.trim()
    setPhase('validating')
    if (!j || !m) {
      alert('请分别输入“职业”和“专业”，例如：职业=互联网产品经理，专业=汉语言文学')
      setPhase('idle')
      return
    }

    // 根据选择的模型获取对应的API配置
    let apiKey: string
    let apiUrl: string
    let modelParam: string

    if (selectedModel === 'volcengine') {
      apiKey = import.meta.env.VITE_VOLCENGINE_API_KEY
      if (!apiKey) {
        alert('未检测到火山引擎 API Key。请在 .env 中配置 VITE_VOLCENGINE_API_KEY。')
        setPhase('idle')
        return
      }
      
      const endpointId = import.meta.env.VITE_VOLCENGINE_ENDPOINT_ID as string | undefined
      const modelId = import.meta.env.VITE_VOLCENGINE_MODEL as string | undefined
      modelParam = endpointId || modelId || ''
      if (!modelParam) {
        alert('未设置火山引擎模型标识。请在 .env 中配置 VITE_VOLCENGINE_MODEL（Model ID）或 VITE_VOLCENGINE_ENDPOINT_ID（Endpoint ID）。')
        setPhase('idle')
        return
      }
      apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
    } else {
      // Deepseek配置
      apiKey = import.meta.env.VITE_OPENAI_API_KEY
      if (!apiKey) {
        alert('未检测到 Deepseek API Key。请在 .env 中配置 VITE_OPENAI_API_KEY。')
        setPhase('idle')
        return
      }
      
      const baseUrl = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.deepseek.com/v1'
      apiUrl = `${baseUrl}/chat/completions`
      modelParam = 'deepseek-chat' // Deepseek的默认模型
    }

    // 重置 UI 状态
    setLoading(true)
    setAnalysis(null)
    resetReveal()
    setPhase('requesting')

    // 采用 NDJSON（每行一个JSON）的分段输出协议，便于边生成边渲染
    const systemPrompt = `你是一名面向中国大学生的职业分析助手。请用口语化、接地气、可操作的方式输出分析，每条建议具体可执行（如书名/课程/小练习/工具）。\n严格按 NDJSON（每行一个 JSON 对象）分段输出，共 6 行，顺序如下：\n1) {"section":"misperception","data":{...}}\n2) {"section":"essence","data":{...}}\n3) {"section":"threshold","data":{...}}\n4) {"section":"skills","data":{...}}\n5) {"section":"experience","data":{...}}\n6) {"section":"conclusion","data":{...}}\n不要额外输出汇总JSON、解释或多余文字；不要包裹为数组或对象；每行以 \n 结束。`

    const userPrompt = `背景：用户输入的目标职业与当前专业如下\n- 目标职业：${j}\n- 当前专业：${m}\n\n目标：基于「行业领域→专业门槛→通用能力→体验动力」四维度模型，输出具象、可落地的职业分析。\n\n各段的数据结构示例（请直接用真实内容替换占位文本）：\n1) misperception: {"type":"误区","title":"专业 ≠ 职业","content":"一句话认知冲击"}\n2) essence: {"summary":"一句话总结","industry":"所属行业","role":"具体角色说明（举例）"}\n3) threshold: {"level":"高/中/低 + 理由","match":"与当前专业的匹配与短板","path":["补门槛路径-1（可包含读研/读博/转专业）","补门槛路径-2（明确成本/收益/替代方案）"]}\n4) skills: {"core":["能力-1（配场景）","能力-2（配场景）"],"match":"当前专业已有能力的匹配点","practice":["小练习-1","小练习-2"]}\n5) experience: {"scene":"空间/协作/节奏的具象描述","value":"价值动力（成长/利他/收益/创造）","fit_test":"低成本自测行动"}\n6) conclusion: {"feasibility":"可行性总结（可提示是否建议读研/转专业）","priority_action":"最优先级行动建议"}\n\n特别要求：在 threshold.path 中务必额外包含“读研/读博/跨专业/转专业”的可行性、优缺点、时间/金钱成本，并与自学/实习路线做对比。按 NDJSON 顺序逐行输出。`

    try {
      console.log('正在请求API:', { model: selectedModel, url: apiUrl, modelParam })
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelParam,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          stream: true,
        }),
      })

      // 先处理非 2xx 或常见开通错误
      if (!res.ok && res.status !== 200) {
        let msg = '未知错误'
        try {
          const json = await res.json()
          msg = (json && (json.error?.message || json.message)) || msg
        } catch {}
        
        // 根据不同API提供针对性的错误信息
        if (selectedModel === 'volcengine') {
          if (res.status === 404 && /not activated the model/i.test(String(msg))) {
            throw new Error(`该模型未在您的账号开通。请在方舟控制台开通该模型，或在 .env 中切换为已开通的模型（VITE_VOLCENGINE_MODEL），或使用已创建的 Endpoint ID（VITE_VOLCENGINE_ENDPOINT_ID）。原始信息：${msg}`)
          }
          if (res.status === 401) {
            throw new Error(`火山引擎API认证失败，请检查VITE_VOLCENGINE_API_KEY是否正确。原始信息：${msg}`)
          }
        } else {
          // Deepseek错误处理
          if (res.status === 401) {
            throw new Error(`Deepseek API认证失败，请检查VITE_OPENAI_API_KEY是否正确。原始信息：${msg}`)
          }
          if (res.status === 429) {
            throw new Error(`Deepseek API请求频率超限，请稍后重试。原始信息：${msg}`)
          }
        }
        
        throw new Error(`${selectedModel === 'volcengine' ? '火山引擎' : 'Deepseek'} API请求失败 (${res.status}): ${msg}`)
      }

      // 开始流式解析
      setPhase('streaming')
      const reader = res.body?.getReader()
      if (!reader) {
        // 回退：不支持流式时，改为一次性请求
        setPhase('requesting')
        const fallback = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelParam,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            stream: false,
          }),
        })
        const json = await fallback.json()
        if (!fallback.ok) {
          const msg = (json && (json.error?.message || json.message)) || '未知错误'
          throw new Error(`API请求失败 (${fallback.status}): ${msg}`)
        }
        const content = json.choices?.[0]?.message?.content ?? ''
        const obj = JSON.parse(content) as Analysis
        setAnalysis(obj)
        setShow({ mis: true, essence: true, threshold: true, skills: true, experience: true, conclusion: true })
        setPhase('done')
        return
      }

      const decoder = new TextDecoder('utf-8')
      let sseBuffer = ''
      let fullContent = ''
      let receivedAnySection = false

      function tryParseStreamContent(content: string) {
        // 尝试解析NDJSON格式（自定义分段协议）
        const lines = content.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const evt = JSON.parse(trimmed)
            if (evt && evt.section && evt.data) {
              receivedAnySection = true
              const section: string = String(evt.section)
              const data = evt.data
              setAnalysis((prev) => {
                const next = { ...(prev || {}) } as Partial<Analysis>
                if (section === 'misperception') next.misperception = data
                if (section === 'essence') next.essence = data
                if (section === 'threshold') next.threshold = data
                if (section === 'skills') next.skills = data
                if (section === 'experience') next.experience = data
                if (section === 'conclusion') next.conclusion = data
                return next
              })
              setShow((prev) => {
                const map: Record<string, keyof typeof prev> = {
                  misperception: 'mis',
                  essence: 'essence',
                  threshold: 'threshold',
                  skills: 'skills',
                  experience: 'experience',
                  conclusion: 'conclusion',
                }
                const key = map[section]
                return key ? { ...prev, [key]: true } : prev
              })
            }
          } catch {
            // 忽略解析失败的行
          }
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        sseBuffer += decoder.decode(value, { stream: true })
        const parts = sseBuffer.split('\n')
        sseBuffer = parts.pop() ?? ''
        for (const raw of parts) {
          const line = raw.trim()
          if (!line) continue
          if (!line.startsWith('data:')) continue
          const dataStr = line.slice(5).trim()
          if (dataStr === '[DONE]') {
            // 结束
            break
          }
          try {
            const payload = JSON.parse(dataStr)
            const delta = payload?.choices?.[0]?.delta?.content
            const contentPiece = typeof delta === 'string' ? delta : (payload?.choices?.[0]?.message?.content ?? '')
            if (contentPiece) {
              // 累积完整内容
              fullContent += contentPiece
              // 尝试解析分段内容
              tryParseStreamContent(fullContent)
            }
          } catch {
            // 单行不是JSON（比如心跳），忽略
          }
        }
      }

      // 最后尝试处理完整内容
      if (fullContent) {
        tryParseStreamContent(fullContent)
      }

      // 若未按分段协议返回，尝试整体JSON回退
      if (!receivedAnySection && fullContent) {
        try {
          const trimmed = fullContent.trim()
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            const obj = JSON.parse(trimmed) as Analysis
            setAnalysis(obj)
            setShow({ mis: true, essence: true, threshold: true, skills: true, experience: true, conclusion: true })
          } else {
            throw new Error('未收到分段内容，且无法解析为完整JSON')
          }
        } catch (e) {
          console.log('完整内容:', fullContent)
          throw new Error(`模型未按NDJSON分段返回，且整体JSON解析失败。内容长度: ${fullContent.length}。建议重试或切换为非流式模式。`)
        }
      }

      setPhase('done')
    } catch (error) {
      console.error('详细错误信息:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      // 针对不同错误类型提供更具体的解决方案
      let detailedMessage = `生成失败: ${errorMessage}\n\n`
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
        if (selectedModel === 'deepseek') {
          detailedMessage += `网络请求失败，可能的原因:\n1. Deepseek API服务暂时不可用\n2. 网络连接问题或防火墙阻止\n3. API Key无效或已过期\n4. CORS跨域问题\n\n建议解决方案:\n• 检查网络连接\n• 验证API Key是否正确\n• 尝试切换到火山引擎模型\n• 稍后重试`
        } else {
          detailedMessage += `网络请求失败，可能的原因:\n1. 火山引擎API服务暂时不可用\n2. 网络连接问题\n3. API Key无效\n4. 模型未开通\n\n建议解决方案:\n• 检查网络连接\n• 验证API配置\n• 尝试切换到Deepseek模型`
        }
      } else {
        detailedMessage += `其他可能原因:\n1. API Key 未配置或无效\n2. 模型未开通或配置错误\n3. 请求频率超限\n4. 服务暂时不可用`
      }
      
      alert(detailedMessage)
      setPhase('idle')
    } finally {
      setLoading(false)
    }
  }

  // 骨架屏通用卡片
  function SkeletonCard({ lines = 2 }: { lines?: number }) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
          ))}
        </div>
      </div>
    )
  }

  // 进度步骤条（包含接收流）
  function ProgressBar() {
    const steps = [
      { key: 'validating', label: '校验输入' },
      { key: 'requesting', label: '连接模型' },
      { key: 'streaming', label: '接收流' },
      { key: 'rendering', label: '渲染展示' },
      { key: 'done', label: '完成' },
    ] as const

    const statusOf = (k: typeof steps[number]['key']) => {
      const order = ['idle', 'validating', 'requesting', 'streaming', 'rendering', 'done'] as const
      const currentIdx = order.indexOf(phase)
      const stepIdx = order.indexOf(k as any)
      if (currentIdx > stepIdx) return 'done'
      if (currentIdx === stepIdx) return 'doing'
      return 'todo'
    }

    return (
      <div className="flex items-center justify-center gap-3 text-sm">
        {steps.map((s, idx) => {
          const st = statusOf(s.key)
          return (
            <div key={s.key} className="flex items-center gap-2">
              <span
                className={
                  st === 'done'
                    ? 'h-2.5 w-2.5 rounded-full bg-green-500'
                    : st === 'doing'
                    ? 'h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse'
                    : 'h-2.5 w-2.5 rounded-full bg-gray-300'
                }
              />
              <span className={st === 'todo' ? 'text-gray-400' : 'text-gray-700'}>{s.label}</span>
              {idx < steps.length - 1 && <span className="text-gray-300">›</span>}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">职业分析器</h1>
        <p className="text-gray-600">分别输入"职业"和"专业"，获取一份具象、可落地的职业分析</p>
      </div>

      {/* 模型选择器 */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
          <button
            onClick={() => setSelectedModel('volcengine')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedModel === 'volcengine'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🌋 火山引擎
          </button>
          <button
            onClick={() => setSelectedModel('deepseek')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedModel === 'deepseek'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🤖 Deepseek
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          placeholder="目标职业，如：互联网产品经理"
          value={job}
          onChange={(e) => setJob(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && getAnalysis()}
        />
        <input
          className="flex-1 border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          placeholder="当前专业，如：汉语言文学"
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && getAnalysis()}
        />
        <button
          onClick={getAnalysis}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {loading ? '生成中...' : '生成职业分析'}
        </button>
      </div>

      {/* 请求期间：展示进度与骨架屏 */}
      {loading && !analysis && (
        <div className="space-y-4">
          <ProgressBar />
          <SkeletonCard lines={3} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          {(phase === 'streaming' || phase === 'rendering' || phase === 'done') && <ProgressBar />}

          {/* 0. 认知冲击卡 */}
          {show.mis ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {analysis?.misperception?.type}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">{analysis?.misperception?.title}</h2>
              <p className="text-gray-700 leading-relaxed">{analysis?.misperception?.content}</p>
            </div>
          ) : (
            <SkeletonCard lines={3} />
          )}

          {/* 1. 职业本质 & 行业定位 */}
          {show.essence ? (
            <section className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">1. 职业本质 & 行业定位</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
                  <div>
                    <div className="text-xs text-gray-500">一句话总结</div>
                    <div className="text-gray-800">{analysis?.essence?.summary}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
                  <div>
                    <div className="text-xs text-gray-500">所属行业</div>
                    <div className="text-gray-800">{analysis?.essence?.industry}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
                  <div>
                    <div className="text-xs text-gray-500">具体角色</div>
                    <div className="text-gray-800">{analysis?.essence?.role}</div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <SkeletonCard lines={2} />
          )}

          {/* 2. 专业门槛 */}
          {show.threshold ? (
            <section className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">2. 专业门槛：你需要补什么知识？</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
                  <div>
                    <div className="text-xs text-gray-500">门槛等级</div>
                    <div className="text-gray-800">{analysis?.threshold?.level}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
                  <div>
                    <div className="text-xs text-gray-500">匹配度分析</div>
                    <div className="text-gray-800">{analysis?.threshold?.match}</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800 mb-2">补门槛的具体路径（含读研/读博/转专业等可能性）：</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis?.threshold?.path?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
                      <div className="text-gray-800">{item}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <SkeletonCard lines={3} />
          )}

          {/* 3. 通用能力 */}
          {show.skills ? (
            <section className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">3. 通用能力：你需要练什么本事？</h3>
              <div className="text-sm font-medium text-gray-800 mb-2">核心能力清单</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {analysis?.skills?.core?.map((c, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
                    <div className="text-gray-800">{c}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 mb-4">
                <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
                  <div>
                    <div className="text-xs text-gray-500">能力匹配度</div>
                    <div className="text-gray-800">{analysis?.skills?.match}</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800 mb-2">练能力的具体方法</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis?.skills?.practice?.map((p, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
                      <div className="text-gray-800">{p}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <SkeletonCard lines={3} />
          )}

          {/* 4. 体验动力 */}
          {show.experience ? (
            <section className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">4. 体验动力：你干得爽不爽、能不能坚持？</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
                  <div>
                    <div className="text-xs text-gray-500">场景体验</div>
                    <div className="text-gray-800">{analysis?.experience?.scene}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
                  <div>
                    <div className="text-xs text-gray-500">价值动力</div>
                    <div className="text-gray-800">{analysis?.experience?.value}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
                  <div>
                    <div className="text-xs text-gray-500">适配性验证</div>
                    <div className="text-gray-800">{analysis?.experience?.fit_test}</div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <SkeletonCard lines={3} />
          )}

          {/* 5. 可能性结论 */}
          {show.conclusion ? (
            <section className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">5. 可能性结论</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
                  <div>
                    <div className="text-xs text-gray-500">可行性</div>
                    <div className="text-gray-800">{analysis?.conclusion?.feasibility}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
                  <div>
                    <div className="text-xs text-gray-500">最优先行动</div>
                    <div className="text-gray-800">{analysis?.conclusion?.priority_action}</div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <SkeletonCard lines={2} />
          )}
          
          {/* 操作按钮 */}
           {analysis && (
             <div className="mt-8 text-center space-y-4">
               <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                 <button
                   onClick={resetReport}
                   className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-medium rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                   </svg>
                   重新生成报告
                 </button>
                 
                 <button
                   onClick={generatePDF}
                   className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                   </svg>
                   导出PDF报告
                 </button>
                 
                 <button
                   onClick={() => {
                      const reportContent = `职业可行性分析报告\n\n职业：${job}\n专业：${major}\n生成时间：${new Date().toLocaleString('zh-CN')}\n\n=== 分析结果 ===\n\n1. 认知误区\n类型：${analysis.misperception?.type || ''}\n标题：${analysis.misperception?.title || ''}\n内容：${analysis.misperception?.content || ''}\n\n2. 职业本质\n总结：${analysis.essence?.summary || ''}\n行业：${analysis.essence?.industry || ''}\n角色：${analysis.essence?.role || ''}\n\n3. 门槛匹配\n水平：${analysis.threshold?.level || ''}\n匹配度：${analysis.threshold?.match || ''}\n路径：${analysis.threshold?.path?.join(', ') || ''}\n\n4. 技能要求\n核心技能：${analysis.skills?.core?.join(', ') || ''}\n匹配度：${analysis.skills?.match || ''}\n实践建议：${analysis.skills?.practice?.join(', ') || ''}\n\n5. 体验动力\n场景体验：${analysis.experience?.scene || ''}\n价值动力：${analysis.experience?.value || ''}\n适配性验证：${analysis.experience?.fit_test || ''}\n\n6. 可能性结论\n可行性：${analysis.conclusion?.feasibility || ''}\n最优先行动：${analysis.conclusion?.priority_action || ''}`
                     
                     const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' })
                     const url = URL.createObjectURL(blob)
                     const link = document.createElement('a')
                     link.href = url
                     link.download = `职业可行性分析报告_${job}_${new Date().toISOString().split('T')[0]}.txt`
                     document.body.appendChild(link)
                     link.click()
                     document.body.removeChild(link)
                     URL.revokeObjectURL(url)
                   }}
                   className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                   </svg>
                   下载TXT报告
                 </button>
               </div>
             </div>
           )}
        </div>
      )}

      {!analysis && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">🎯</div>
          <p className="text-gray-500">分别输入"职业"和"专业"，开始分析你的可行路径</p>
        </div>
      )}
    </div>
  )
}