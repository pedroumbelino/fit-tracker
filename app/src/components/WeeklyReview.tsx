import { useState } from 'react'
import { toast } from './ui'
import { ai, aiAvailable } from '../lib/ai'
import { dow, todayKey } from '../lib/date'
import { recommend, stalledBefore, weekStats } from '../lib/review'
import { actions, store, useStore } from '../lib/store'
import { buildContext } from '../lib/targets'

const JEV_LABEL: Record<string, string> = { keep: 'manter', cut: 'tirar 150 kcal', add: 'subir 150 kcal' }

export default function WeeklyReview() {
  const state = useStore((s) => s)
  const today = todayKey()
  const stats = weekStats(state, today)
  const rec = recommend(stats, stalledBefore(state, today))
  const done = state.settings.reviews?.find((r) => r.week === stats.week)
  const adjust = state.settings.kcalAdjust ?? 0
  const [coach, setCoach] = useState<{ text: string; jev: { decision: string; confidence: number } | null } | null>(null)
  const [loading, setLoading] = useState(false)
  const isSunday = dow(today) === 0

  async function askCoach() {
    setLoading(true)
    try {
      setCoach(await ai.weekly(stats, rec, buildContext(store.get(), today)))
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro na AI')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={isSunday && !done ? { boxShadow: '0 0 0 2px var(--accent)' } : undefined}>
      <div className="row between">
        <p className="small muted" style={{ fontWeight: 600 }}>Revisão semanal · {stats.week.slice(5)}</p>
        {adjust !== 0 && <span className="chip num">{adjust > 0 ? '+' : ''}{adjust} kcal/dia</span>}
      </div>
      <h3 style={{ fontSize: 18, marginTop: 4 }}>{rec.headline}</h3>
      <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rec.reasons.map((r) => <li key={r}>{r}</li>)}
      </ul>
      {rec.tips.length > 0 && (
        <ul className="small muted" style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rec.tips.map((t) => <li key={t}>{t}</li>)}
        </ul>
      )}
      {coach && (
        <div className="card" style={{ background: 'var(--card-2)', boxShadow: 'none', marginTop: 12, marginBottom: 0 }}>
          {coach.jev && <p className="tiny muted">Jev: {JEV_LABEL[coach.jev.decision] ?? coach.jev.decision} ({Math.round(coach.jev.confidence * 100)}%)</p>}
          <p className="small" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{coach.text}</p>
        </div>
      )}
      <div className="row" style={{ marginTop: 12, gap: 8, flexWrap: 'wrap' }}>
        {done ? (
          <span className="chip accent">Revisão feita{done.applied && rec.kcalDelta !== 0 ? ' e aplicada' : ''}</span>
        ) : rec.kcalDelta !== 0 ? (
          <>
            <button className="btn small" onClick={() => { actions.saveReview({ week: stats.week, decision: rec.decision, applied: true }, rec.kcalDelta); toast(`Metas ajustadas em ${rec.kcalDelta > 0 ? '+' : ''}${rec.kcalDelta} kcal`) }}>
              Aplicar {rec.kcalDelta > 0 ? '+' : ''}{rec.kcalDelta} kcal
            </button>
            <button className="btn small ghost" onClick={() => actions.saveReview({ week: stats.week, decision: 'keep', applied: false }, 0)}>Manter</button>
          </>
        ) : (
          <button className="btn small secondary" onClick={() => actions.saveReview({ week: stats.week, decision: 'keep', applied: false }, 0)}>Marcar como vista</button>
        )}
        {aiAvailable() && !coach && (
          <button className="btn small ghost" onClick={askCoach} disabled={loading}>{loading ? <span className="spinner" /> : 'Opinião do coach'}</button>
        )}
      </div>
    </div>
  )
}
