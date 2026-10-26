import { useState } from 'react'
import type { Tab } from '../App'
import { Check, Ring, Scale, Sheet, toast } from '../components/ui'
import { SESSIONS, SLEEP_HABITS, SLOTS, SUPPLEMENTS } from '../data/plan'
import { ai, aiAvailable, type ReadinessAI } from '../lib/ai'
import { formatLong, greeting, todayKey } from '../lib/date'
import { actions, getDay, store, useStore, type Checkin } from '../lib/store'
import { buildContext, dayTargets, localReadiness, plannedMeals, totals } from '../lib/targets'

const LEVEL = {
  full: { label: 'Treino completo', color: 'var(--accent)', text: 'Tudo verde. Treina como planeado.' },
  reduced: { label: 'Treino reduzido', color: 'var(--warn)', text: 'Tira 1 série a cada exercício e deixa mais 1 repetição de margem.' },
  recovery: { label: 'Recuperação', color: 'var(--danger)', text: 'Hoje só caminhada e mobilidade. O corpo agradece.' },
}

export default function Today({ go }: { go: (t: Tab) => void }) {
  const date = todayKey()
  const day = useStore((s) => getDay(s, date))
  const health = useStore((s) => s.health)
  const h = health[date]
  const t = dayTargets(date)
  const tot = totals(day)
  const session = SESSIONS[t.sessionId]
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [jev, setJev] = useState<ReadinessAI | null>(null)
  const [jevLoading, setJevLoading] = useState(false)

  const readiness = localReadiness(day.checkin, h, health)
  const level = jev?.level ?? readiness.level

  async function askJev() {
    setJevLoading(true)
    try {
      setJev(await ai.readiness(buildContext(store.get(), date)))
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro na AI')
    } finally {
      setJevLoading(false)
    }
  }

  const eatenSlots = new Set(day.meals.filter((m) => m.source === 'plan').map((m) => m.slot))
  const hour = new Date().getHours()

  return (
    <div className="screen">
      <div className="row between">
        <p className="eyebrow">{formatLong(date)}</p>
        <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => go('settings')} aria-label="Definições">
          <span style={{ width: 20, height: 20, display: 'grid' }}><GearIcon /></span>
        </button>
      </div>
      <h1>{greeting()}, Pedro</h1>

      {/* Anéis do dia */}
      <div className="card">
        <div className="grid2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, justifyItems: 'center' }}>
          <RingStat value={tot.kcal} max={t.kcal} color="var(--accent)" label="kcal" />
          <RingStat value={tot.p} max={t.p} color="var(--protein)" label="proteína" unit="g" />
          <RingStat value={day.water / 1000} max={t.water / 1000} color="var(--water)" label="água" unit="L" decimals={1} />
          <RingStat value={(h?.steps ?? 0) / 1000} max={9} color="var(--sleep)" label="passos" unit="k" decimals={1} />
        </div>
        <div className="row" style={{ marginTop: 14, gap: 8 }}>
          <button className="btn secondary small grow" onClick={() => actions.addWater(250)}>+250 ml</button>
          <button className="btn secondary small grow" onClick={() => actions.addWater(500)}>+500 ml</button>
          <button className="btn ghost small" onClick={() => actions.addWater(-250)} aria-label="Remover 250 ml">−</button>
        </div>
      </div>

      {/* Prontidão */}
      <div className="card">
        <div className="row between">
          <div>
            <p className="small muted" style={{ fontWeight: 600 }}>Prontidão</p>
            <h3 style={{ color: LEVEL[level].color, fontSize: 19 }}>{day.checkin || h?.sleep_h ? LEVEL[level].label : 'Faz o check-in'}</h3>
          </div>
          <button className="btn small ghost" onClick={() => setCheckinOpen(true)}>{day.checkin ? 'Editar' : 'Check-in'}</button>
        </div>
        {(day.checkin || h?.sleep_h) && <p className="small" style={{ marginTop: 8 }}>{LEVEL[level].text}</p>}
        {readiness.reasons.length > 0 && (
          <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {readiness.reasons.map((r) => <span key={r} className="chip warn">{r}</span>)}
          </div>
        )}
        {(readiness.kneeCaution || (jev && jev.knee_caution > 0.5)) && (
          <p className="small" style={{ marginTop: 10, color: 'var(--warn)' }}>Joelho: hoje evita leg press profundo e step-ups. Fica pelo peso morto romeno, hip thrust e leg curl.</p>
        )}
        {jev && <p className="tiny muted" style={{ marginTop: 8 }}>Jev: {Math.round(jev.confidence * 100)}% de confiança · dívida de sono {Math.round(jev.sleep_debt * 100)}%</p>}
        {aiAvailable() && day.checkin && !jev && (
          <button className="btn small secondary" style={{ marginTop: 10 }} onClick={askJev} disabled={jevLoading}>
            {jevLoading ? <span className="spinner" /> : 'Confirmar com o Jev'}
          </button>
        )}
      </div>

      {/* Treino de hoje */}
      <button className="card" style={{ width: '100%', textAlign: 'left', border: 0 }} onClick={() => go('training')}>
        <div className="row between">
          <div>
            <p className="small muted" style={{ fontWeight: 600 }}>Treino de hoje · {session.minutes} min</p>
            <h3 style={{ fontSize: 19 }}>{session.name}</h3>
          </div>
          {day.workoutDone ? <span className="chip accent">Feito</span> : <span className="chip">{session.exercises.length} exercícios</span>}
        </div>
      </button>

      {/* Refeições */}
      <h2>Refeições</h2>
      <div className="card flush">
        {plannedMeals(date).map(({ slot, recipe, macros }) => {
          const done = eatenSlots.has(slot)
          const info = SLOTS.find((s) => s.id === slot)!
          return (
            <button
              key={slot}
              className="list-item"
              onClick={() => {
                if (done) {
                  const m = day.meals.find((x) => x.source === 'plan' && x.slot === slot)
                  if (m) actions.removeMeal(m.id)
                } else {
                  actions.addMeal({ slot, name: recipe.name, recipeId: recipe.id, source: 'plan', kcal: macros.kcal, p: macros.p, c: macros.c, g: macros.g })
                  toast(`${info.label} registado`)
                }
              }}
            >
              <span className="emoji">{recipe.emoji}</span>
              <div className="grow">
                <div className="tiny muted" style={{ fontWeight: 600 }}>{info.label.toUpperCase()} · {info.time}</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{recipe.name}</div>
                <div className="small muted num">{Math.round(macros.kcal)} kcal · {Math.round(macros.p)} g proteína</div>
              </div>
              <Check on={done} />
            </button>
          )
        })}
      </div>
      <button className="btn ghost block" onClick={() => go('food')}>Comi outra coisa? Regista com foto</button>

      {/* Suplementos */}
      <h2>Suplementos</h2>
      <div className="card flush">
        {SUPPLEMENTS.map((s) => (
          <button key={s.id} className="list-item" onClick={() => actions.toggle('supps', s.id)}>
            <div className="grow">
              <div style={{ fontWeight: 600, fontSize: 15 }}>{s.name} <span className="muted small">· {s.dose}</span></div>
              <div className="small muted">{s.when}{!s.essential && ' · opcional'}</div>
            </div>
            <Check on={day.supps.includes(s.id)} />
          </button>
        ))}
      </div>

      {/* Sono */}
      <h2>Rotina de sono</h2>
      <div className="card flush">
        {SLEEP_HABITS.map((s) => {
          const [hh] = s.time.split(':').map(Number)
          const upcoming = hh >= hour
          return (
            <button key={s.id} className="list-item" onClick={() => actions.toggle('habits', s.id)} style={{ opacity: upcoming || day.habits.includes(s.id) ? 1 : 0.65 }}>
              <span className="small muted num" style={{ width: 42 }}>{s.time}</span>
              <div className="grow" style={{ fontSize: 15 }}>{s.label}</div>
              <Check on={day.habits.includes(s.id)} />
            </button>
          )
        })}
      </div>

      <CheckinSheet key={String(checkinOpen)} open={checkinOpen} onClose={() => setCheckinOpen(false)} initial={day.checkin} onSave={(c) => { actions.setCheckin(c); setJev(null); setCheckinOpen(false) }} />
    </div>
  )
}

function GearIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>
}

function RingStat({ value, max, color, label, unit = '', decimals = 0 }: { value: number; max: number; color: string; label: string; unit?: string; decimals?: number }) {
  return (
    <div className="stack" style={{ alignItems: 'center', gap: 6 }}>
      <Ring value={value} max={max} color={color} size={70} stroke={8}>
        <b className="num" style={{ fontSize: 15 }}>{value.toLocaleString('pt-PT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</b>
      </Ring>
      <span className="tiny muted" style={{ fontWeight: 600, textAlign: 'center' }}>{label}<br />/{max.toLocaleString('pt-PT', { maximumFractionDigits: decimals })}{unit}</span>
    </div>
  )
}

function CheckinSheet({ open, onClose, initial, onSave }: { open: boolean; onClose: () => void; initial?: Checkin; onSave: (c: Checkin) => void }) {
  const [c, setC] = useState<Checkin>(initial ?? { energy: 3, soreness: 2, knee: 0, stress: 3, hunger: 3 })
  const set = (k: keyof Checkin) => (v: number) => setC({ ...c, [k]: v })
  return (
    <Sheet open={open} onClose={onClose}>
      <h2 style={{ marginTop: 0 }}>Como estás hoje?</h2>
      <div className="stack" style={{ gap: 16 }}>
        <div><label className="lbl">Energia</label><Scale value={c.energy} onChange={set('energy')} labels={['Exausto', 'Cheio de energia']} /></div>
        <div><label className="lbl">Dores musculares</label><Scale value={c.soreness} onChange={set('soreness')} labels={['Nenhumas', 'Muitas']} /></div>
        <div><label className="lbl">Dor no joelho (0 a 10)</label><Scale value={c.knee} onChange={set('knee')} min={0} max={10} /></div>
        <div><label className="lbl">Stress</label><Scale value={c.stress} onChange={set('stress')} labels={['Calmo', 'No limite']} /></div>
        <div><label className="lbl">Fome</label><Scale value={c.hunger} onChange={set('hunger')} labels={['Nenhuma', 'Muita']} /></div>
        <button className="btn block" onClick={() => onSave(c)}>Guardar</button>
      </div>
    </Sheet>
  )
}
