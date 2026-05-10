import { useState } from 'react'

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v))

// ── テンプレートデータ ──────────────────────────────
const DISABILITY_TYPES = ['知的障害', '自閉症・情緒障害', '肢体不自由', '病弱・身体虚弱', '言語障害', '難聴', '視覚障害', 'その他']
const GRADES = ['小1', '小2', '小3', '小4', '小5', '小6', '中1', '中2', '中3']
const TERMS = ['前期（4月〜9月）', '後期（10月〜3月）', '通年']

const GOAL_TEMPLATES = {
  social: [
    '友達や先生に自分から挨拶することができる',
    '困ったときに言葉や絵カードで助けを求めることができる',
    '順番を守って活動に参加することができる',
    '気持ちが高ぶったとき、クールダウンの場所に移動できる',
    '自分の気持ちを「うれしい」「かなしい」などの言葉で伝えられる',
  ],
  learning: [
    'ひらがな・カタカナを正しく読み書きできる',
    '10までの足し算・引き算ができる',
    '時計の長針・短針を読むことができる',
    'お金の計算（100円以内）ができる',
    '短い文章を声に出して読むことができる',
  ],
  life: [
    '着替えを自分でできる（ボタン・ファスナーの操作を含む）',
    '給食の準備・片付けを自分でできる',
    'トイレの一連の手順を自立してできる',
    '持ち物の整理・整頓ができる',
    '手洗い・うがいを適切に行うことができる',
  ],
  behavior: [
    '活動の見通しを持って落ち着いて取り組める時間を延ばす',
    '特定の感覚刺激（音・光）への過剰反応を和らげる',
    '注意が逸れたとき、声かけで活動に戻ることができる',
    '衝動的な行動の前に立ち止まって考えられる',
  ],
}

const APPROACH_TEMPLATES = [
  'スケジュール表・視覚的手がかりを提示して見通しを持たせる',
  '短い指示を出し、理解できているか確認してから次に進む',
  'できたことをすぐに言語的・物質的に強化する',
  '課題量を調整し、達成感を積み重ねる',
  '座席・活動場所に配慮し、刺激の少ない環境を整える',
  '選択肢を示して自己決定の機会を設ける',
  'クールダウンスペースを確保し、移動のルールを共有する',
  '保護者と連絡帳で情報を共有し、家庭と連携する',
  '好きな活動・強化子を活用して意欲を引き出す',
  '絵カード・AAC機器を使って表現手段を広げる',
]

const EVAL_OPTIONS = ['達成できた（◎）', 'おおむね達成（○）', '継続して取り組む（△）', '見直しが必要（×）']

// ── メインアプリ ────────────────────────────────────
export default function App() {
  const [view, setView] = useState('home')
  const [plans, setPlans] = useState(() => load('iep_plans', []))
  const [current, setCurrent] = useState(null)

  const savePlans = v => { setPlans(v); save('iep_plans', v) }

  const createPlan = () => {
    const p = {
      id: genId(),
      createdAt: new Date().toISOString(),
      // 基本情報
      name: '', grade: '', disability: '', term: TERMS[0], teacher: '',
      schoolYear: new Date().getFullYear(),
      // 実態把握
      strengths: '', challenges: '', care: '', homeInfo: '',
      // 目標・手立て
      longGoal: '',
      shortGoals: [{ id: genId(), area: '', goal: '', approach: '', eval: '' }],
    }
    savePlans([p, ...plans])
    setCurrent(p)
    setView('edit')
  }

  const updatePlan = updated => {
    const next = plans.map(p => p.id === updated.id ? updated : p)
    savePlans(next)
    setCurrent(updated)
  }

  const deletePlan = id => {
    if (!confirm('この計画を削除しますか？')) return
    savePlans(plans.filter(p => p.id !== id))
    setView('home')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-indigo-700 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow no-print">
        {view !== 'home' && (
          <button onClick={() => setView('home')} className="text-white text-xl">←</button>
        )}
        <h1 className="font-bold text-lg flex-1">
          {view === 'home'    && '個別の指導計画'}
          {view === 'edit'    && (current?.name ? `${current.name}の計画` : '新規作成')}
          {view === 'preview' && '印刷プレビュー'}
        </h1>
        {view === 'edit' && (
          <button onClick={() => setView('preview')}
            className="text-xs bg-indigo-600 px-3 py-1 rounded-full">印刷</button>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {view === 'home'    && <HomeView plans={plans} onCreate={createPlan} onSelect={p => { setCurrent(p); setView('edit') }} onDelete={deletePlan} />}
        {view === 'edit'    && <EditView plan={current} onChange={updatePlan} />}
        {view === 'preview' && <PrintView plan={current} />}
      </main>
    </div>
  )
}

// ── ホーム ──────────────────────────────────────────
function HomeView({ plans, onCreate, onSelect, onDelete }) {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
        ⚠️ <strong>個人情報の取り扱い：</strong>本アプリのデータはこの端末内にのみ保存されます。
        実名入力は最小限にし、端末のパスコード設定・管理を徹底してください。
        学校・施設の情報管理規定に従って使用してください。
      </div>

      <button onClick={onCreate}
        className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-md no-print">
        ＋ 新しい計画を作成
      </button>

      {plans.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
          まだ計画が作成されていません
        </div>
      )}

      {plans.map(p => (
        <div key={p.id} className="bg-white rounded-xl border border-slate-200 flex items-center px-4 py-3 gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg flex-shrink-0">
            {p.name ? p.name[0] : '?'}
          </div>
          <button onClick={() => onSelect(p)} className="flex-1 text-left">
            <div className="font-bold text-slate-800">{p.name || '（名前未入力）'}</div>
            <div className="text-xs text-slate-400">{p.grade} {p.term} — {new Date(p.createdAt).toLocaleDateString('ja-JP')}</div>
          </button>
          <button onClick={() => onDelete(p.id)} className="text-slate-300 hover:text-red-400 text-xl">×</button>
        </div>
      ))}
    </div>
  )
}

// ── 編集画面 ────────────────────────────────────────
function EditView({ plan, onChange }) {
  const set = (key, val) => onChange({ ...plan, [key]: val })

  const addGoal = () => onChange({
    ...plan,
    shortGoals: [...plan.shortGoals, { id: genId(), area: '', goal: '', approach: '', eval: '' }]
  })
  const updateGoal = (id, key, val) => onChange({
    ...plan,
    shortGoals: plan.shortGoals.map(g => g.id === id ? { ...g, [key]: val } : g)
  })
  const removeGoal = id => onChange({
    ...plan,
    shortGoals: plan.shortGoals.filter(g => g.id !== id)
  })

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <Section title="📋 基本情報">
        <div className="grid grid-cols-2 gap-3">
          <Field label="氏名（イニシャル推奨）" value={plan.name} onChange={v => set('name', v)} placeholder="例：A.T" />
          <Field label="学年" value={plan.grade} onChange={v => set('grade', v)} type="select" options={GRADES} />
          <Field label="障害種別" value={plan.disability} onChange={v => set('disability', v)} type="select" options={DISABILITY_TYPES} />
          <Field label="期間" value={plan.term} onChange={v => set('term', v)} type="select" options={TERMS} />
          <Field label="担任名" value={plan.teacher} onChange={v => set('teacher', v)} placeholder="例：田中" />
          <Field label="年度" value={plan.schoolYear} onChange={v => set('schoolYear', v)} type="number" />
        </div>
      </Section>

      {/* 実態把握 */}
      <Section title="🔍 実態把握">
        <Field label="得意なこと・強み" value={plan.strengths} onChange={v => set('strengths', v)} type="textarea" placeholder="例：絵を描くことが好き、特定のルーティンを守ることができる" />
        <Field label="苦手なこと・課題" value={plan.challenges} onChange={v => set('challenges', v)} type="textarea" placeholder="例：集団活動での切り替えが難しい、待ち時間が苦手" />
        <Field label="配慮・支援の現状" value={plan.care} onChange={v => set('care', v)} type="textarea" placeholder="例：視覚的スケジュールを使用、座席を前列に配置" />
        <Field label="家庭からの情報" value={plan.homeInfo} onChange={v => set('homeInfo', v)} type="textarea" placeholder="例：家では比較的落ち着いている、特定の食べ物へのこだわりあり" />
      </Section>

      {/* 長期目標 */}
      <Section title="🎯 長期目標（年間）">
        <Field label="長期目標" value={plan.longGoal} onChange={v => set('longGoal', v)} type="textarea"
          placeholder="例：日常生活の基本的なスキルを身につけ、学校生活に安心して参加できる" />
      </Section>

      {/* 短期目標 */}
      <Section title="📌 短期目標・手立て">
        {plan.shortGoals.map((g, i) => (
          <div key={g.id} className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-indigo-700">目標 {i + 1}</span>
              {plan.shortGoals.length > 1 && (
                <button onClick={() => removeGoal(g.id)} className="text-slate-400 hover:text-red-400 text-sm">削除</button>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-600 font-bold mb-1 block">領域</label>
              <div className="flex flex-wrap gap-2">
                {['コミュニケーション・社会性', '学習', '生活自立', '行動・情緒'].map(a => (
                  <button key={a} onClick={() => updateGoal(g.id, 'area', g.area === a ? '' : a)}
                    className={`px-2 py-1 rounded-full text-xs border ${g.area === a ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300'}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <TemplateField label="短期目標" value={g.goal}
              onChange={v => updateGoal(g.id, 'goal', v)}
              templates={getGoalTemplates(g.area)}
              placeholder="具体的・測定可能な目標を入力" />
            <TemplateField label="手立て・支援方法" value={g.approach}
              onChange={v => updateGoal(g.id, 'approach', v)}
              templates={APPROACH_TEMPLATES}
              placeholder="具体的な支援方法を入力" />
            <div>
              <label className="text-xs text-slate-600 font-bold mb-1 block">評価（学期末）</label>
              <div className="flex flex-wrap gap-2">
                {EVAL_OPTIONS.map(e => (
                  <button key={e} onClick={() => updateGoal(g.id, 'eval', g.eval === e ? '' : e)}
                    className={`px-2 py-1 rounded-full text-xs border ${g.eval === e ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
        <button onClick={addGoal}
          className="w-full py-2 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-600 text-sm font-bold hover:bg-indigo-50">
          ＋ 目標を追加
        </button>
      </Section>
    </div>
  )
}

function getGoalTemplates(area) {
  if (area?.includes('コミュニケーション')) return GOAL_TEMPLATES.social
  if (area?.includes('学習')) return GOAL_TEMPLATES.learning
  if (area?.includes('生活')) return GOAL_TEMPLATES.life
  if (area?.includes('行動')) return GOAL_TEMPLATES.behavior
  return [...GOAL_TEMPLATES.social, ...GOAL_TEMPLATES.learning]
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
      <h2 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', options = [], placeholder = '' }) {
  const cls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400'
  return (
    <div>
      <label className="block text-xs text-slate-600 font-bold mb-1">{label}</label>
      {type === 'textarea'
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} className={cls + ' resize-none'} />
        : type === 'select'
        ? <select value={value} onChange={e => onChange(e.target.value)} className={cls}>
            <option value="">選択してください</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      }
    </div>
  )
}

function TemplateField({ label, value, onChange, templates, placeholder }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-slate-600 font-bold">{label}</label>
        <button onClick={() => setOpen(v => !v)} className="text-xs text-indigo-500">文例 {open ? '▲' : '▼'}</button>
      </div>
      {open && (
        <div className="bg-indigo-50 rounded-lg p-2 mb-2 space-y-1 max-h-40 overflow-y-auto">
          {templates.map((t, i) => (
            <button key={i} onClick={() => { onChange(t); setOpen(false) }}
              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-indigo-100 text-indigo-800">
              {t}
            </button>
          ))}
        </div>
      )}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none" />
    </div>
  )
}

// ── 印刷プレビュー ───────────────────────────────────
function PrintView({ plan }) {
  return (
    <div>
      <button onClick={() => window.print()}
        className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold mb-6 no-print">
        🖨️ 印刷 / PDFで保存
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-6 print-page space-y-5 text-sm">
        <div className="text-center">
          <h1 className="text-xl font-bold border-b-2 border-slate-800 pb-2 mb-1">個別の指導計画</h1>
          <p className="text-xs text-slate-500">{plan.schoolYear}年度 {plan.term}</p>
        </div>

        <table className="w-full border-collapse text-xs">
          <tbody>
            <tr>
              <th className="border border-slate-400 bg-slate-100 px-2 py-1 text-left w-1/4">氏名</th>
              <td className="border border-slate-400 px-2 py-1">{plan.name}</td>
              <th className="border border-slate-400 bg-slate-100 px-2 py-1 text-left w-1/4">学年</th>
              <td className="border border-slate-400 px-2 py-1">{plan.grade}</td>
            </tr>
            <tr>
              <th className="border border-slate-400 bg-slate-100 px-2 py-1 text-left">障害種別</th>
              <td className="border border-slate-400 px-2 py-1">{plan.disability}</td>
              <th className="border border-slate-400 bg-slate-100 px-2 py-1 text-left">担任</th>
              <td className="border border-slate-400 px-2 py-1">{plan.teacher}</td>
            </tr>
          </tbody>
        </table>

        <div>
          <h2 className="font-bold border-l-4 border-indigo-600 pl-2 mb-2">実態把握</h2>
          <table className="w-full border-collapse text-xs">
            <tbody>
              {[['得意なこと・強み', plan.strengths], ['苦手なこと・課題', plan.challenges], ['配慮・支援の現状', plan.care], ['家庭からの情報', plan.homeInfo]].map(([label, val]) => val && (
                <tr key={label}>
                  <th className="border border-slate-400 bg-slate-100 px-2 py-1 text-left w-1/4 align-top">{label}</th>
                  <td className="border border-slate-400 px-2 py-2 whitespace-pre-wrap">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {plan.longGoal && (
          <div>
            <h2 className="font-bold border-l-4 border-indigo-600 pl-2 mb-2">長期目標</h2>
            <div className="border border-slate-400 px-3 py-2 text-xs">{plan.longGoal}</div>
          </div>
        )}

        <div>
          <h2 className="font-bold border-l-4 border-indigo-600 pl-2 mb-2">短期目標・手立て・評価</h2>
          {plan.shortGoals.map((g, i) => (
            <table key={g.id} className="w-full border-collapse text-xs mb-3">
              <thead>
                <tr>
                  <th colSpan={2} className="border border-slate-400 bg-indigo-50 px-2 py-1 text-left">目標 {i + 1}　{g.area && `【${g.area}】`}</th>
                </tr>
              </thead>
              <tbody>
                <tr><th className="border border-slate-400 bg-slate-100 px-2 py-1 w-1/4 align-top">短期目標</th><td className="border border-slate-400 px-2 py-2 whitespace-pre-wrap">{g.goal}</td></tr>
                <tr><th className="border border-slate-400 bg-slate-100 px-2 py-1 align-top">手立て</th><td className="border border-slate-400 px-2 py-2 whitespace-pre-wrap">{g.approach}</td></tr>
                <tr><th className="border border-slate-400 bg-slate-100 px-2 py-1">評価</th><td className="border border-slate-400 px-2 py-1">{g.eval}</td></tr>
              </tbody>
            </table>
          ))}
        </div>

        <div className="flex justify-between text-xs text-slate-400 border-t pt-3 mt-4">
          <span>合同会社まなびの森教育研究所</span>
          <span>作成日：{new Date(plan.createdAt).toLocaleDateString('ja-JP')}</span>
        </div>
      </div>
    </div>
  )
}
