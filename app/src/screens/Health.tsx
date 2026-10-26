import { useState } from 'react'
import type { Tab } from '../App'
import { LineChart, toast } from '../components/ui'
import { PROFILE, SLEEP_TIPS, TARGETS } from '../data/plan'
import { addDays, lastDays, todayKey } from '../lib/date'
import { actions, useStore, type HealthDay } from '../lib/store'
import { baseline, latest, weightTrend } from '../lib/targets'

const fmt = (v: number | undefined, d = 0) => (v == null ? '-' : v.toLocaleString('pt-PT', { maximumFractionDigits: d, minimumFractionDigits: d }))

export default function Health({ go }: { go: (t: Tab) => void }) {
  const health = useStore((s) => s.health)
  const today = todayKey()
  const yesterday = addDays(today, -1)
  const [weight, setWeight] = useState('')
  const trend = weightTrend(health, 42)
  const lastAvg = [...trend].reverse().find((p) => p.avg != null)?.avg
  const weekAgoAvg = trend[trend.length - 8]?.avg
  const hasData = Object.keys(health).length > 0

  const series = (metric: keyof HealthDay, n = 14) =>
    lastDays(n).map((d) => ({ label: d.slice(8) + '/' + d.slice(5, 7), value: health[d]?.[metric] }))

  const sleepLast = health[today]?.sleep_h ?? health[yesterday]?.sleep_h
  const avgSteps = baseline(health, 'steps', 7)
  const hrvBase = baseline(health, 'hrv')

  return (
    <div className="screen">
      <p className="eyebrow">Apple Saúde</p>
      <h1>Saúde</h1>

      {!hasData && (
        <div className="card" style={{ background: 'var(--accent-soft)' }}>
          <h3>Liga a app Saúde</h3>
          <p className="small" style={{ margin: '6px 0 10px' }}>Um Atalho do iOS envia passos, sono, FC, HRV e peso do Apple Watch todas as manhãs.</p>
          <button className="btn small" onClick={() => go('settings')}>Configurar</button>
        </div>
      )}

      <div className="grid2">
        <Tile label="Peso (média 7 d)" value={fmt(lastAvg ?? latest(health, 'weight'), 1)} unit="kg"
          sub={lastAvg && weekAgoAvg ? `${lastAvg - weekAgoAvg <= 0 ? '' : '+'}${fmt(lastAvg - weekAgoAvg, 1)} kg/semana` : `Meta ${PROFILE.goalWeightKg} kg`} />
        <Tile label="Sono última noite" value={fmt(sleepLast, 1)} unit="h" sub={`Meta ${TARGETS.sleepHours} h`} warn={sleepLast != null && sleepLast < 6.5} />
        <Tile label="Passos hoje" value={fmt(health[today]?.steps)} sub={`Média 7 d: ${fmt(avgSteps)}`} />
        <Tile label="FC repouso" value={fmt(latest(health, 'resting_hr'))} unit="bpm" sub={`Média: ${fmt(baseline(health, 'resting_hr'))}`} />
        <Tile label="HRV" value={fmt(latest(health, 'hrv'))} unit="ms" sub={`Média 4 sem: ${fmt(hrvBase)}`} />
        <Tile label="VO₂ máx" value={fmt(latest(health, 'vo2max'), 1)} sub="Apple Watch" />
      </div>

      <h2>Peso</h2>
      <div className="card">
        <LineChart points={trend.map((p) => ({ label: p.date.slice(8) + '/' + p.date.slice(5, 7), value: p.weight, avg: p.avg }))} color="var(--accent)" unit="kg" />
        <p className="tiny muted" style={{ marginTop: 6 }}>Pontos: pesagens. Linha: média de 7 dias. Pesa-te de manhã, depois da casa de banho. Ritmo ideal: −0,3 a −0,7 kg por semana.</p>
        <div className="row" style={{ marginTop: 12 }}>
          <input className="field" inputMode="decimal" placeholder="Peso de hoje (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <button className="btn" disabled={!weight} onClick={() => {
            const w = Number(weight.replace(',', '.'))
            if (w > 30 && w < 250) { actions.setHealth(today, { weight: w }); setWeight(''); toast('Peso registado') }
          }}>Guardar</button>
        </div>
      </div>

      <h2>Sono (14 dias)</h2>
      <div className="card"><LineChart points={series('sleep_h')} color="var(--sleep)" unit="h" /></div>

      <h2>Passos (14 dias)</h2>
      <div className="card"><LineChart points={series('steps')} color="var(--water)" domainPad={500} /></div>

      <h2>HRV (14 dias)</h2>
      <div className="card"><LineChart points={series('hrv')} color="var(--protein)" unit="ms" /></div>

      <h2>Dormir melhor</h2>
      <div className="card">
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SLEEP_TIPS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>
    </div>
  )
}

function Tile({ label, value, unit, sub, warn }: { label: string; value: string; unit?: string; sub?: string; warn?: boolean }) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <p className="tiny muted" style={{ fontWeight: 600 }}>{label.toUpperCase()}</p>
      <p className="num" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: warn ? 'var(--warn)' : undefined }}>
        {value}<span className="small muted" style={{ fontWeight: 600 }}> {unit}</span>
      </p>
      {sub && <p className="tiny muted">{sub}</p>}
    </div>
  )
}
