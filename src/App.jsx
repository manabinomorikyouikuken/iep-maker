import { useState } from 'react'

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const save = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      alert('⚠️ 保存容量が不足しています。不要なデータを削除するか、保存データを書き出してからデータを整理してください。')
    }
  }
}

// ⑤ 無料版の制限
const FREE_LIMIT = 3

// ── テンプレートデータ ──────────────────────────────
const DISABILITY_TYPES = ['知的障害', '自閉症・情緒障害', '肢体不自由', '病弱・身体虚弱', '言語障害', '難聴', '視覚障害', 'その他']
const GRADES = ['小1', '小2', '小3', '小4', '小5', '小6', '中1', '中2', '中3', '高1', '高2', '高3']
const TERMS = ['前期（4月〜9月）', '後期（10月〜3月）', '通年']

// ④ 自立活動6区分27項目との対応
const JIRITU_AREAS = [
  { key: 'health',      label: '健康の保持',     items: ['生活のリズムや生活習慣の形成', '病気の状態の理解と生活管理', '身体各部の状態の理解と養護', '障害の特性の理解と生活環境の調整', '健康状態の維持・改善'] },
  { key: 'mind',        label: '心理的な安定',   items: ['情緒の安定', '状況の理解と変化への対応', '障害による学習上又は生活上の困難を改善・克服する意欲'] },
  { key: 'human',       label: '人間関係の形成', items: ['他者とのかかわりの基礎', '他者の意図や感情の理解', '自己の理解と行動の調整', '集団への参加の基礎'] },
  { key: 'environment', label: '環境の把握',     items: ['保有する感覚の活用', '感覚や認知の特性についての理解と対応', '感覚の補助及び代行手段の活用', '感覚を総合的に活用した周囲の状況についての把握と状況に応じた行動', '認知や行動の手がかりとなる概念の形成'] },
  { key: 'body',        label: '身体の動き',     items: ['姿勢と運動・動作の基本的技能', '姿勢保持と運動・動作の補助及び代行手段の活用', '日常生活に必要な基本動作', '身体の移動能力', '作業に必要な動作と円滑な遂行'] },
  { key: 'comm',        label: 'コミュニケーション', items: ['コミュニケーションの基礎的能力', 'ことばの受容と表出', '言語の形成と活用', 'コミュニケーション手段の選択と活用', '状況に応じたコミュニケーション'] },
]

const GOAL_TEMPLATES = {
  health:      ['生活リズムを整え、毎日決まった時間に登校できる', '薬の服薬管理を自分でできる', '体調の変化を言葉で伝えられる'],
  mind:        ['気持ちが高ぶったとき、クールダウンの場所に移動できる', '活動の切り替えに見通しを持って対応できる', '自分の気持ちを「うれしい」「かなしい」などの言葉で伝えられる'],
  human:       ['友達や先生に自分から挨拶することができる', '困ったときに言葉や絵カードで助けを求めることができる', '順番を守って活動に参加することができる'],
  environment: ['視覚的手がかりを使って活動の流れを理解できる', '特定の感覚刺激への過剰反応を和らげる', '日常的な道具の操作を習得する'],
  body:        ['着替えを自分でできる（ボタン・ファスナーの操作を含む）', '給食の準備・片付けを自分でできる', 'トイレの一連の手順を自立してできる'],
  comm:        ['絵カード・AAC機器を使って要求を伝えることができる', '短い文章を声に出して読むことができる', '相手の話を最後まで聞いて返答することができる'],
  learning:    ['ひらがな・カタカナを正しく読み書きできる', '10までの足し算・引き算ができる', 'お金の計算（100円以内）ができる'],
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

// ① JSONエクスポート
function exportJSON(plans) {
  const blob = new Blob([JSON.stringify(plans, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `iep_backup_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '')}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const isValidPlan = p =>
  p &&
  typeof p.id === 'string' && p.id.length > 0 &&
  Array.isArray(p.shortGoals) &&
  p.shortGoals.every(g => g && typeof g.id === 'string')

function importJSON(e, onImport, currentCount) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result)
      if (!Array.isArray(data)) { alert('ファイルの形式が正しくありません'); return }
      if (!data.every(isValidPlan)) { alert('データの形式が正しくありません（必須フィールドが不足しています）'); return }
      if (currentCount > 0 && !confirm(`⚠️ 現在の${currentCount}件のデータはすべて上書きされます。\n復元ファイルの${data.length}件に置き換えますか？\n\nこの操作は取り消せません。`)) return
      onImport(data)
      alert(`✅ ${data.length}件のデータを復元しました`)
    } catch { alert('読み込みに失敗しました') }
    finally { e.target.value = '' }
  }
  reader.readAsText(file)
}

// ── メインアプリ ────────────────────────────────────
export default function App() {
  const [view, setView] = useState('home')
  const [plans, setPlans] = useState(() => load('iep_plans', []))
  const [current, setCurrent] = useState(null)

  const savePlans = v => { setPlans(v); save('iep_plans', v) }

  const createPlan = () => {
    // ⑤ 無料版制限
    if (plans.length >= FREE_LIMIT) { setView('upgrade'); return }
    const p = {
      id: genId(), createdAt: new Date().toISOString(),
      name: '', grade: '', disability: '', term: TERMS[0], teacher: '', schoolYear: new Date().getFullYear(),
      strengths: '', challenges: '', care: '', homeInfo: '',
      longGoal: '',
      // ③ 保護者確認欄を追加
      parentConfirmed: false, parentName: '', parentDate: '',
      shortGoals: [{ id: genId(), jirituArea: '', area: '', goal: '', approach: '', eval: '', evalNote: '' }],
    }
    savePlans([p, ...plans])
    setCurrent(p)
    setView('edit')
  }

  const updatePlan = updated => { const next = plans.map(p => p.id === updated.id ? updated : p); savePlans(next); setCurrent(updated) }
  const deletePlan = id => { if (!confirm('この計画を削除しますか？')) return; savePlans(plans.filter(p => p.id !== id)); setCurrent(null); setView('home') }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-indigo-700 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow no-print">
        {(view !== 'home') && <button onClick={() => setView('home')} className="text-white text-xl">←</button>}
        <h1 className="font-bold text-lg flex-1">
          {view === 'home'    && '個別の指導計画'}
          {view === 'edit'    && (current?.name ? `${current.name}の計画` : '新規作成')}
          {view === 'preview' && '印刷プレビュー'}
          {view === 'terms'   && '利用規約'}
          {view === 'upgrade' && 'プレミアムプラン'}
        </h1>
        {view === 'edit' && <button onClick={() => setView('preview')} className="text-xs bg-indigo-600 px-3 py-1 rounded-full">印刷</button>}
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {view === 'home'    && <HomeView plans={plans} onCreate={createPlan} onSelect={p => { setCurrent(p); setView('edit') }} onDelete={deletePlan} onExport={() => exportJSON(plans)} onImport={data => { savePlans(data); setCurrent(null); setView('home') }} onTerms={() => setView('terms')} freeLimit={FREE_LIMIT} />}
        {view === 'edit'    && current && <EditView plan={current} onChange={updatePlan} />}
        {view === 'preview' && current && <PrintView plan={current} />}
        {view === 'terms'   && <TermsView />}
        {view === 'upgrade' && <UpgradeView onBack={() => setView('home')} />}
      </main>
    </div>
  )
}

// ── ホーム ──────────────────────────────────────────
function HomeView({ plans, onCreate, onSelect, onDelete, onExport, onImport, onTerms, freeLimit }) {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
        ⚠️ <strong>個人情報の取り扱い：</strong>データはこの端末内にのみ保存されます。共有PCでの使用は避け、イニシャル等での入力を推奨します。
        学校・施設の情報管理規定に従ってください。
        <button onClick={onTerms} className="underline ml-1">利用規約を確認する</button>
      </div>

      {/* ⑤ 無料版制限の表示 */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 text-xs text-indigo-700 flex items-center justify-between">
        <span>無料版：{plans.length} / {freeLimit} 件使用中</span>
        {plans.length >= freeLimit && <span className="font-bold text-orange-600">上限に達しました</span>}
      </div>

      <button onClick={onCreate}
        className={`w-full py-4 rounded-xl font-bold text-lg shadow-md no-print ${plans.length >= freeLimit ? 'bg-slate-300 text-slate-500' : 'bg-indigo-600 text-white'}`}>
        ＋ 新しい計画を作成{plans.length >= freeLimit ? '（上限）' : ''}
      </button>

      {plans.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">まだ計画が作成されていません</div>
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

      {/* ① データ管理 */}
      <details className="bg-white rounded-xl border border-slate-200 p-4 no-print">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-600">データ管理（必要な方のみ）</p>
              <p className="text-xs text-slate-400 mt-1">端末の機種変更やブラウザ削除に備えるときに使います</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 whitespace-nowrap">開く</span>
          </div>
        </summary>
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            この操作は、現在の端末に保存されている計画データをファイルとして保存したり、以前保存したファイルから読み込んだりするためのものです。
            通常の作成・編集では使わなくても大丈夫です。
          </p>
          <div className="flex gap-2">
            <button onClick={onExport} className="flex-1 py-2 rounded-lg border border-indigo-300 text-indigo-600 text-xs font-bold hover:bg-indigo-50">📥 データを保存</button>
            <label className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 text-center cursor-pointer">
              📤 保存データを読み込む
              <input type="file" accept=".json" className="hidden" onChange={e => onImport && importJSON(e, onImport, plans.length)} />
            </label>
          </div>
        </div>
      </details>
    </div>
  )
}

// ── 編集画面 ────────────────────────────────────────
function EditView({ plan, onChange }) {
  const set = (key, val) => onChange({ ...plan, [key]: val })
  const addGoal = () => {
    if (plan.shortGoals.length >= 8) { alert('目標は8件まで追加できます'); return }
    onChange({ ...plan, shortGoals: [...plan.shortGoals, { id: genId(), jirituArea: '', area: '', goal: '', approach: '', eval: '', evalNote: '' }] })
  }
  const updateGoal = (id, key, val) => onChange({ ...plan, shortGoals: plan.shortGoals.map(g => g.id === id ? { ...g, [key]: val } : g) })
  const removeGoal = id => onChange({ ...plan, shortGoals: plan.shortGoals.filter(g => g.id !== id) })

  return (
    <div className="space-y-6">
      <Section title="📋 基本情報">
        <div className="grid grid-cols-2 gap-3">
          <Field label="氏名（イニシャル推奨）" value={plan.name} onChange={v => set('name', v)} placeholder="例：A.T" />
          <Field label="学年" value={plan.grade} onChange={v => set('grade', v)} type="select" options={GRADES} />
          <Field label="障害種別" value={plan.disability} onChange={v => set('disability', v)} type="select" options={DISABILITY_TYPES} />
          <Field label="期間" value={plan.term} onChange={v => set('term', v)} type="select" options={TERMS} />
          <Field label="担任名（任意）" value={plan.teacher} onChange={v => set('teacher', v)} placeholder="例：田中" />
          <Field label="年度" value={plan.schoolYear} onChange={v => set('schoolYear', v === '' ? '' : Number(v))} type="number" />
        </div>
      </Section>

      <Section title="🔍 実態把握">
        <Field label="得意なこと・強み" value={plan.strengths} onChange={v => set('strengths', v)} type="textarea" placeholder="例：絵を描くことが好き" />
        <Field label="苦手なこと・課題" value={plan.challenges} onChange={v => set('challenges', v)} type="textarea" placeholder="例：集団活動での切り替えが難しい" />
        <Field label="配慮・支援の現状" value={plan.care} onChange={v => set('care', v)} type="textarea" placeholder="例：視覚的スケジュールを使用" />
        <Field label="家庭からの情報" value={plan.homeInfo} onChange={v => set('homeInfo', v)} type="textarea" placeholder="例：家では比較的落ち着いている" />
      </Section>

      <Section title="🎯 長期目標（年間）">
        <Field label="長期目標" value={plan.longGoal} onChange={v => set('longGoal', v)} type="textarea" placeholder="例：日常生活の基本的なスキルを身につけ、学校生活に安心して参加できる" />
      </Section>

      <Section title="📌 短期目標・手立て・評価">
        {plan.shortGoals.map((g, i) => (
          <div key={g.id} className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-indigo-700">目標 {i + 1}</span>
              {plan.shortGoals.length > 1 && <button onClick={() => removeGoal(g.id)} className="text-slate-400 hover:text-red-400 text-sm">削除</button>}
            </div>

            {/* ④ 自立活動6区分 */}
            <div>
              <label className="text-xs text-slate-600 font-bold mb-1 block">自立活動の区分（文科省6区分）</label>
              <div className="flex flex-wrap gap-1.5">
                {JIRITU_AREAS.map(a => (
                  <button key={a.key} onClick={() => updateGoal(g.id, 'jirituArea', g.jirituArea === a.key ? '' : a.key)}
                    className={`px-2 py-1 rounded-full text-xs border ${g.jirituArea === a.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300'}`}>
                    {a.label}
                  </button>
                ))}
              </div>
              {g.jirituArea && (
                <div className="mt-1.5 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                  <strong>関連項目：</strong>{JIRITU_AREAS.find(a => a.key === g.jirituArea)?.items.join('、')}
                </div>
              )}
            </div>

            <TemplateField label="短期目標" value={g.goal} onChange={v => updateGoal(g.id, 'goal', v)}
              templates={getGoalTemplates(g.jirituArea)} placeholder="具体的・測定可能な目標を入力" />
            <TemplateField label="手立て・支援方法" value={g.approach} onChange={v => updateGoal(g.id, 'approach', v)}
              templates={APPROACH_TEMPLATES} placeholder="具体的な支援方法を入力" />

            {/* ③ 評価＋評価根拠 */}
            <div>
              <label className="text-xs text-slate-600 font-bold mb-1 block">評価（学期末）</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {EVAL_OPTIONS.map(e => (
                  <button key={e} onClick={() => updateGoal(g.id, 'eval', g.eval === e ? '' : e)}
                    className={`px-2 py-1 rounded-full text-xs border ${g.eval === e ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300'}`}>
                    {e}
                  </button>
                ))}
              </div>
              <textarea value={g.evalNote} onChange={e => updateGoal(g.id, 'evalNote', e.target.value)}
                placeholder="評価の根拠・次期への引き継ぎ事項を記述してください"
                rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 resize-none" />
            </div>
          </div>
        ))}
        <button onClick={addGoal} className="w-full py-2 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-600 text-sm font-bold hover:bg-indigo-50">
          ＋ 目標を追加
        </button>
      </Section>

      {/* ③ 保護者確認欄 */}
      <Section title="👨‍👩‍👧 保護者確認">
        <p className="text-xs text-slate-500">保護者が計画の内容を確認・同意した記録です。</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="保護者氏名" value={plan.parentName} onChange={v => set('parentName', v)} placeholder="例：田中 〇〇" />
          <Field label="確認日" value={plan.parentDate} onChange={v => set('parentDate', v)} type="date" />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={plan.parentConfirmed} onChange={e => set('parentConfirmed', e.target.checked)} className="w-4 h-4 accent-indigo-600" />
          保護者が内容を確認した
        </label>
      </Section>
    </div>
  )
}

function getGoalTemplates(jirituArea) {
  return GOAL_TEMPLATES[jirituArea] || [...GOAL_TEMPLATES.mind, ...GOAL_TEMPLATES.human]
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
      {type === 'textarea' ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} className={cls + ' resize-none'} />
       : type === 'select' ? <select value={value} onChange={e => onChange(e.target.value)} className={cls}><option value="">選択してください</option>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>
       : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />}
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
            <button key={i} onClick={() => { onChange(t); setOpen(false) }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-indigo-100 text-indigo-800">{t}</button>
          ))}
        </div>
      )}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none" />
    </div>
  )
}

// ── 印刷プレビュー ───────────────────────────────────
function PrintView({ plan }) {
  const [showLogo, setShowLogo] = useState(false) // ② デフォルトOFF
  return (
    <div>
      <div className="no-print space-y-3 mb-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer bg-white rounded-xl border border-slate-200 px-4 py-3">
          <input type="checkbox" checked={showLogo} onChange={e => setShowLogo(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
          <span>印刷物に「合同会社まなびの森教育研究所」を印刷する</span>
        </label>
        <button onClick={() => window.print()} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold">🖨️ 印刷 / PDFで保存</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 print-page space-y-5 text-sm">
        <div className="text-center">
          <h1 className="text-xl font-bold border-b-2 border-slate-800 pb-2 mb-1">個別の指導計画</h1>
          <p className="text-xs text-slate-500">{plan.schoolYear}年度 {plan.term}</p>
        </div>

        <table className="w-full border-collapse text-xs">
          <tbody>
            <tr><th className="border border-slate-400 bg-slate-100 px-2 py-1 text-left w-1/4">氏名</th><td className="border border-slate-400 px-2 py-1">{plan.name}</td><th className="border border-slate-400 bg-slate-100 px-2 py-1 text-left w-1/4">学年</th><td className="border border-slate-400 px-2 py-1">{plan.grade}</td></tr>
            <tr><th className="border border-slate-400 bg-slate-100 px-2 py-1 text-left">障害種別</th><td className="border border-slate-400 px-2 py-1">{plan.disability}</td><th className="border border-slate-400 bg-slate-100 px-2 py-1 text-left">担任</th><td className="border border-slate-400 px-2 py-1">{plan.teacher}</td></tr>
          </tbody>
        </table>

        <div>
          <h2 className="font-bold border-l-4 border-indigo-600 pl-2 mb-2">実態把握</h2>
          <table className="w-full border-collapse text-xs">
            <tbody>
              {[['得意なこと・強み', plan.strengths], ['苦手なこと・課題', plan.challenges], ['配慮・支援の現状', plan.care], ['家庭からの情報', plan.homeInfo]].filter(([,v]) => v).map(([label, val]) => (
                <tr key={label}><th className="border border-slate-400 bg-slate-100 px-2 py-1 text-left w-1/4 align-top">{label}</th><td className="border border-slate-400 px-2 py-2 whitespace-pre-wrap">{val}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        {plan.longGoal && (
          <div><h2 className="font-bold border-l-4 border-indigo-600 pl-2 mb-2">長期目標</h2><div className="border border-slate-400 px-3 py-2 text-xs">{plan.longGoal}</div></div>
        )}

        <div>
          <h2 className="font-bold border-l-4 border-indigo-600 pl-2 mb-2">短期目標・手立て・評価</h2>
          {plan.shortGoals.map((g, i) => (
            <table key={g.id} className="w-full border-collapse text-xs mb-3">
              <thead><tr><th colSpan={2} className="border border-slate-400 bg-indigo-50 px-2 py-1 text-left">目標 {i + 1}{g.jirituArea && ` 【自立活動：${JIRITU_AREAS.find(a => a.key === g.jirituArea)?.label}】`}</th></tr></thead>
              <tbody>
                <tr><th className="border border-slate-400 bg-slate-100 px-2 py-1 w-1/4 align-top">短期目標</th><td className="border border-slate-400 px-2 py-2 whitespace-pre-wrap">{g.goal}</td></tr>
                <tr><th className="border border-slate-400 bg-slate-100 px-2 py-1 align-top">手立て</th><td className="border border-slate-400 px-2 py-2 whitespace-pre-wrap">{g.approach}</td></tr>
                <tr><th className="border border-slate-400 bg-slate-100 px-2 py-1 align-top">評価</th><td className="border border-slate-400 px-2 py-2">{g.eval}{g.evalNote && <><br /><span className="text-slate-500">{g.evalNote}</span></>}</td></tr>
              </tbody>
            </table>
          ))}
        </div>

        {/* ③ 保護者確認欄 */}
        <div>
          <h2 className="font-bold border-l-4 border-indigo-600 pl-2 mb-2">保護者確認</h2>
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr>
                <th className="border border-slate-400 bg-slate-100 px-2 py-1 w-1/4">確認状況</th>
                <td colSpan={3} className="border border-slate-400 px-2 py-1">
                  {plan.parentConfirmed
                    ? <span className="text-green-700 font-bold">✓ 確認済み</span>
                    : <span className="text-slate-400">未確認</span>}
                </td>
              </tr>
              <tr><th className="border border-slate-400 bg-slate-100 px-2 py-1 w-1/4">確認者</th><td className="border border-slate-400 px-2 py-1">{plan.parentName || '　　　　　　　　'}</td><th className="border border-slate-400 bg-slate-100 px-2 py-1 w-1/4">確認日</th><td className="border border-slate-400 px-2 py-1">{plan.parentDate || '　　　年　　月　　日'}</td></tr>
              <tr><th className="border border-slate-400 bg-slate-100 px-2 py-1">署名</th><td colSpan={3} className="border border-slate-400 px-2 py-6"></td></tr>
            </tbody>
          </table>
        </div>

        {/* ② 社名はデフォルトOFF */}
        {showLogo && (
          <div className="flex justify-between text-xs text-slate-400 border-t pt-3 mt-4">
            <span>合同会社まなびの森教育研究所</span>
            <span>作成日：{new Date(plan.createdAt).toLocaleDateString('ja-JP')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ⑤ アップグレード画面
function UpgradeView({ onBack }) {
  return (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center space-y-3">
        <div className="text-3xl">🔓</div>
        <h2 className="font-bold text-lg text-orange-800">無料版の上限に達しました</h2>
        <p className="text-sm text-orange-700">無料版は{FREE_LIMIT}件まで作成できます。</p>
      </div>
      <div className="bg-white rounded-xl border border-indigo-300 p-6 space-y-3">
        <h3 className="font-bold text-indigo-700">プレミアムプラン（準備中）</h3>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✅ 計画数の無制限作成</li>
          <li>✅ クラス全員の一括管理</li>
          <li>✅ 複数端末でのデータ同期</li>
          <li>✅ 学校様式に合わせたカスタマイズ</li>
          <li>✅ 優先サポート</li>
        </ul>
        <p className="text-xs text-slate-400">個人：¥480/月 学校契約：¥5,000/月〜</p>
        <a href="mailto:manabinomorikyouikuken@gmail.com?subject=IEPアプリ プレミアムプランについて"
          className="block w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-center text-sm">
          プレミアムプランを問い合わせる
        </a>
      </div>
      <button onClick={onBack} className="w-full py-2 text-slate-500 text-sm">← ホームに戻る</button>
    </div>
  )
}

// ⑥ 利用規約
function TermsView() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
      <h2 className="font-bold text-lg text-slate-800">利用規約</h2>
      <p className="text-xs text-slate-400">最終更新：2026年5月10日</p>

      {[
        ['第1条（目的）', '本アプリは、特別支援教育における個別の指導計画の作成補助を目的とするツールです。合同会社まなびの森教育研究所（以下「当社」）が提供します。'],
        ['第2条（個人情報の取り扱い）', '本アプリに入力されたデータは、利用者の端末内（ブラウザのlocalStorage）にのみ保存され、外部サーバーへの送信は一切行いません。ただし、localStorageはブラウザの開発者ツールで閲覧可能であり、共有端末での使用には十分ご注意ください。なお、本アプリはサービス改善のためGoogle Analytics 4（GA4）を使用しており、ページ閲覧状況等の統計情報を収集しています。個人を特定できる情報は含まれません。詳細はプライバシーポリシーをご確認ください。'],
        ['第3条（利用者の責任）', '本アプリの利用にあたっては、勤務先の学校・施設の個人情報管理規定、情報セキュリティポリシー、および個人情報保護法をはじめとする関連法令を遵守してください。法令・規定への適合は利用者の責任において行っていただく必要があります。'],
        ['第4条（免責事項）', '当社は、本アプリの利用によって生じたいかなる損害についても責任を負いません。本アプリは教育支援の補助ツールであり、記録内容の正確性・完全性・各教育機関の様式との整合性を保証するものではありません。'],
        ['第5条（禁止事項）', '本アプリを以下の目的で使用することを禁止します：①学校・施設の情報管理規定に反する使用、②取得した個人情報の目的外利用・第三者提供、③本アプリのリバースエンジニアリング・改ざん。'],
        ['第6条（規約の変更）', '当社は本規約をいつでも変更できます。変更後もアプリを継続して使用した場合は、変更に同意したものとみなします。'],
      ].map(([title, body]) => (
        <div key={title}>
          <h3 className="font-bold text-slate-700 mb-1">{title}</h3>
          <p className="text-xs text-slate-600">{body}</p>
        </div>
      ))}

      <div className="border-t pt-4 text-xs text-slate-400">
        <p>合同会社まなびの森教育研究所</p>
        <p>〒261-0001 千葉県千葉市美浜区幸町2-16-13-505</p>
        <p>E-mail：manabinomorikyouikuken@gmail.com</p>
        <p className="mt-2">
          <a href="/privacy.html" className="underline text-indigo-400" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>
        </p>
      </div>
    </div>
  )
}
