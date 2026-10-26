import { useEffect, useState } from 'react'
import { Icon, toast } from '../components/ui'
import { DAY_SHORT, SESSIONS, TRAINING_RULES, WEEK_TRAINING, type Exercise } from '../data/plan'
import { addDays, dow, todayKey } from '../lib/date'
import { actions, getDay, useStore, type SetLog, type State } from '../lib/store'

function lastPerformance(s: State, exerciseId: string, before: string): { date: string; sets: SetLog[] } | null {
  const dates = Object.keys(s.days).filter((d) => d < before).sort().reverse()
  for (const d of dates) {
    const sets = s.days[d].sets.filter((x) => x.exerciseId === exerciseId)
    if (sets.length) return { date: d, sets }
  }
  return null
}

function cycleWeek(s: State): number | null {
  const first = Object.keys(s.days).filter((d) => s.days[d].sets.length || s.days[d].workoutDone).sort()[0]
  if (!first) return null
  const [y1, m1, d1] = first.split('-').map(Number)
  const diff = Math.floor((Date.now() - new Date(y1, m1 - 1, d1).getTime()) / 86400000)
  return (Math.floor(diff / 7) % 6) + 1
}

export default function Training() {
  const today = todayKey()
  const offset = (dow(today) + 6) % 7
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - offset))
  const [date, setDate] = useState(today)
  const state = useStore((s) => s)
  const day = getDay(state, date)
  const session = SESSIONS[WEEK_TRAINING[dow(date)]]
  const cw = cycleWeek(state)
  const [rest, setRest] = useState<{ until: number; total: number } | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!rest) return
    const t = setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= rest.until) {
        setRest(null)
        navigator.vibrate?.(300)
        toast('Descanso terminado. Próxima série!')
      }
    }, 250)
    return () => clearInterval(t)
  }, [rest])

  const rir = cw == null || cw <= 2 ? 'RIR 3-4' : cw === 6 ? 'Descarga: metade das séries' : 'RIR 1-2'

  return (
    <div className="screen">
      <p className="eyebrow">{cw ? `Semana ${cw} de 6 · ${rir}` : `Começo · ${rir}`}</p>
      <h1>Treino</h1>
      <div className="days">
        {week.map((d) => (
          <button key={d} className={`${d === date ? 'on' : ''} ${d === today ? 'today' : ''}`} onClick={() => setDate(d)}>
            <span>{DAY_SHORT[dow(d)]}</span>
            <span style={{ fontSize: 10 }}>{SESSIONS[WEEK_TRAINING[dow(d)]].short}</span>
            {state.days[d]?.workoutDone && <span style={{ fontSize: 10 }}>✓</span>}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="row between">
          <div>
            <h3 style={{ fontSize: 20 }}>{session.name}</h3>
            <p className="small muted">{session.minutes} min · Viva Gym</p>
          </div>
          <button className={`btn small ${day.workoutDone ? 'secondary' : ''}`} onClick={() => { actions.setWorkoutDone(!day.workoutDone, date); if (!day.workoutDone) toast('Treino concluído 💪') }}>
            {day.workoutDone ? 'Feito ✓' : 'Concluir'}
          </button>
        </div>
        {session.warmup && <p className="small" style={{ marginTop: 10 }}><b>Aquecimento:</b> {session.warmup}</p>}
      </div>

      {rest && (
        <div className="card" style={{ position: 'sticky', top: 'calc(env(safe-area-inset-top) + 8px)', zIndex: 10, background: 'var(--accent)', color: '#fff' }}>
          <div className="row between">
            <b className="num" style={{ fontSize: 22 }}>Descanso {Math.max(0, Math.ceil((rest.until - now) / 1000))} s</b>
            <button className="btn small" style={{ background: 'rgba(255,255,255,0.25)' }} onClick={() => setRest(null)}>Saltar</button>
          </div>
        </div>
      )}

      {session.exercises.map((ex) => (
        <ExerciseCard key={ex.id} ex={ex} date={date} state={state} onRest={(sec) => sec > 0 && setRest({ until: Date.now() + sec * 1000, total: sec })} />
      ))}

      {session.finisher && <div className="card"><p className="small">{session.finisher}</p></div>}

      <h2>Regras do plano</h2>
      <div className="card">
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TRAINING_RULES.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </div>
      <div className="card">
        <h3>Passos e caminhadas</h3>
        <p className="small muted" style={{ marginTop: 6 }}>Mínimo de 9000 passos por dia. As tuas caminhadas de 5 km valem ouro: faz uma depois do almoço todos os dias em vez de dia sim, dia não. É o cardio mais amigo do joelho e baixa o stress.</p>
      </div>
    </div>
  )
}

function ExerciseCard({ ex, date, state, onRest }: { ex: Exercise; date: string; state: State; onRest: (s: number) => void }) {
  const sets = getDay(state, date).sets.filter((s) => s.exerciseId === ex.id)
  const last = lastPerformance(state, ex.id, date)
  const lastSet = sets[sets.length - 1] ?? last?.sets[0]
  const [kg, setKg] = useState(lastSet ? String(lastSet.kg) : '')
  const [reps, setReps] = useState(lastSet ? String(lastSet.reps) : '')
  const timeBased = /\b(s|min|m)\b/.test(ex.reps)
  const done = sets.length >= ex.sets

  return (
    <div className="card" style={{ opacity: done ? 0.75 : 1 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <h3>{ex.name}</h3>
          <p className="small muted num">{ex.sets} × {ex.reps}{ex.rest ? ` · descanso ${ex.rest >= 60 ? `${(ex.rest / 60).toLocaleString('pt-PT')} min` : `${ex.rest} s`}` : ''}</p>
        </div>
        <div className="row" style={{ gap: 4 }}>
          {ex.knee && <span className="chip warn">joelho</span>}
          <span className={`chip ${done ? 'accent' : ''} num`}>{sets.length}/{ex.sets}</span>
        </div>
      </div>
      {ex.note && <p className="small" style={{ marginTop: 6 }}>{ex.note}</p>}
      {last && !timeBased && (
        <p className="tiny muted num" style={{ marginTop: 6 }}>Última vez: {last.sets.map((s) => `${s.kg}×${s.reps}`).join(', ')}</p>
      )}
      {sets.map((s, i) => (
        <div key={s.id} className="set-row small num">
          <span className="muted">#{i + 1}</span>
          <span>{timeBased ? '' : `${s.kg} kg`}</span>
          <span>{s.reps} {timeBased ? '' : 'reps'}</span>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => actions.removeSet(s.id, date)} aria-label="Apagar série">
            <span style={{ width: 14, height: 14, display: 'grid' }}><Icon.x /></span>
          </button>
        </div>
      ))}
      {!timeBased ? (
        <div className="set-row">
          <span className="small muted">#{sets.length + 1}</span>
          <input className="field" inputMode="decimal" placeholder="kg" value={kg} onChange={(e) => setKg(e.target.value)} aria-label="Carga em kg" />
          <input className="field" inputMode="numeric" placeholder="reps" value={reps} onChange={(e) => setReps(e.target.value)} aria-label="Repetições" />
          <button className="icon-btn accent" aria-label="Registar série" disabled={!reps} onClick={() => {
            actions.addSet({ exerciseId: ex.id, set: sets.length + 1, kg: Number(kg.replace(',', '.')) || 0, reps: Number(reps) || 0 }, date)
            onRest(ex.rest)
          }}>
            <span style={{ width: 20, height: 20, display: 'grid' }}><Icon.plus /></span>
          </button>
        </div>
      ) : (
        <button className="btn small secondary" style={{ marginTop: 10 }} onClick={() => {
          actions.addSet({ exerciseId: ex.id, set: sets.length + 1, kg: 0, reps: 1 }, date)
          onRest(ex.rest)
        }}>Feito</button>
      )}
    </div>
  )
}
