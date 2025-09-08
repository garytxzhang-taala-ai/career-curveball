import { useState, useEffect, useRef } from 'react'

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

  async function getAnalysis() {
    const j = job.trim()
    const m = major.trim()
    setPhase('validating')
    if (!j || !m) {
      alert('请分别输入“职业”和“专业”，例如：职业=互联网产品经理，专业=汉语言文学')
      setPhase('idle')
      return
    }

    const apiKey = import.meta.env.VITE_VOLCENGINE_API_KEY
    if (!apiKey) {
      alert('未检测到火山引擎 API Key。请在 .env 中配置 VITE_VOLCENGINE_API_KEY。')
      setPhase('idle')
      return
    }

    const endpointId = import.meta.env.VITE_VOLCENGINE_ENDPOINT_ID as string | undefined
    const modelId = import.meta.env.VITE_VOLCENGINE_MODEL as string | undefined
    const modelParam = endpointId || modelId
    if (!modelParam) {
      alert('未设置模型标识。请在 .env 中配置 VITE_VOLCENGINE_MODEL（Model ID）或 VITE_VOLCENGINE_ENDPOINT_ID（Endpoint ID）。')
      setPhase('idle')
      return
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
      const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
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
        if (res.status === 404 && /not activated the model/i.test(String(msg))) {
          throw new Error(`该模型未在您的账号开通。请在方舟控制台开通该模型，或在 .env 中切换为已开通的模型（VITE_VOLCENGINE_MODEL），或使用已创建的 Endpoint ID（VITE_VOLCENGINE_ENDPOINT_ID）。原始信息：${msg}`)
        }
        throw new Error(`API请求失败 (${res.status}): ${msg}`)
      }

      // 开始流式解析
      setPhase('streaming')
      const reader = res.body?.getReader()
      if (!reader) {
        // 回退：不支持流式时，改为一次性请求
        setPhase('requesting')
        const fallback = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
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
      let ndjsonBuffer = ''
      let receivedAnySection = false

      function tryHandleNDJSONLines() {
        let idx = ndjsonBuffer.indexOf('\n')
        while (idx !== -1) {
          const line = ndjsonBuffer.slice(0, idx).trim()
          ndjsonBuffer = ndjsonBuffer.slice(idx + 1)
          if (line) {
            try {
              const evt = JSON.parse(line)
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
              // 忽略解析失败的行，继续累积
            }
          }
          idx = ndjsonBuffer.indexOf('\n')
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
              // 将模型生成的文本累计到 NDJSON 缓冲区
              ndjsonBuffer += contentPiece
              tryHandleNDJSONLines()
            }
          } catch {
            // 单行不是JSON（比如心跳），忽略
          }
        }
      }

      // 最后尝试处理余下的NDJSON缓存
      tryHandleNDJSONLines()

      // 额外处理：若最后一行没有换行但为合法JSON，按最后一段处理
      const tail = ndjsonBuffer.trim()
      if (tail) {
        try {
          const evt = JSON.parse(tail)
          if (evt && evt.section && evt.data) {
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
            receivedAnySection = true
          }
        } catch {}
      }

      // 若未按分段协议返回，尝试整体JSON回退
      if (!receivedAnySection) {
        // 把缓冲区残余尝试解析为完整JSON
        try {
          const maybe = ndjsonBuffer.trim()
          if (maybe.startsWith('{') && maybe.endsWith('}')) {
            const obj = JSON.parse(maybe) as Analysis
            setAnalysis(obj)
            setShow({ mis: true, essence: true, threshold: true, skills: true, experience: true, conclusion: true })
          } else {
            throw new Error('未收到分段内容，且无法解析为完整JSON')
          }
        } catch (e) {
          throw new Error('模型未按NDJSON分段返回，且整体JSON解析失败。建议重试或切换为非流式模式。')
        }
      }

      setPhase('done')
    } catch (error) {
      console.error('详细错误信息:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      alert(`生成失败: ${errorMessage}\n\n可能的原因:\n1. 火山引擎 API Key 未配置或无效\n2. 未开通对应模型或未配置正确的模型/Endpoint\n3. 网络连接问题\n4. 服务暂时不可用或 API 配额限制`)
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
        <p className="text-gray-600">分别输入“职业”和“专业”，获取一份具象、可落地的职业分析</p>
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
        </div>
      )}

      {!analysis && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">🎯</div>
          <p className="text-gray-500">分别输入“职业”和“专业”，开始分析你的可行路径</p>
        </div>
      )}
    </div>
  )
}