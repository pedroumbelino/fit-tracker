import { SESSIONS, TARGETS, WEEK_TRAINING } from '../data/plan'
import { addDays, dow, lastDays, todayKey } from './date'
import type { State } from './store'
import { totals } from './targets'

export type WeekStats = {
  week: string
  weightNow?: number
  weightPrev?: number
  weighIns: number
  /** kg perdidos por semana (positivo = perdeu). */
  loss?: number
  daysLogged: number
  proteinAvg?: number
  kcalAvg?: number
  workouts: number
  workoutsPlanned: number
  sleepAvg?: number
  stepsAvg?: number
  kneeMax: number
}

export type Decision = 'keep' | 'cut' | 'add'

export type Recommendation = {
  decision: Decision
  kcalDelta: number
  headline: string
  reasons: string[]
  tips: string[]
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined)

/** Semana ISO (2026-W44), para não repetir a mesma revisão. */
export function weekKey(date = todayKey()): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const w = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`
}

export function weekStats(s: State, end = todayKey()): WeekStats {
  const days = lastDays(7, end)
  const prev = lastDays(7, addDays(end, -7))
  const weights = (ds: string[]) => ds.map((d) => s.health[d]?.weight).filter((w): w is number => w != null)
  const wNow = weights(days)
  const wPrev = weights(prev)
  const weightNow = avg(wNow)
  const weightPrev = avg(wPrev)

  const logged = days.filter((d) => (s.days[d]?.meals.length ?? 0) >= 2)
  const workoutsPlanned = days.filter((d) => SESSIONS[WEEK_TRAINING[dow(d)]].kind !== 'rest').length

  return {
    week: weekKey(end),
    weightNow,
    weightPrev,
    weighIns: wNow.length,
    loss: weightNow != null && weightPrev != null && wNow.length >= 3 && wPrev.length >= 3 ? weightPrev - weightNow : undefined,
    daysLogged: logged.length,
    proteinAvg: avg(logged.map((d) => totals(s.days[d]).p)),
    kcalAvg: avg(logged.map((d) => totals(s.days[d]).kcal)),
    workouts: days.filter((d) => s.days[d]?.workoutDone).length,
    workoutsPlanned,
    sleepAvg: avg(days.map((d) => s.health[d]?.sleep_h).filter((v): v is number => v != null)),
    stepsAvg: avg(days.map((d) => s.health[d]?.steps).filter((v): v is number => v != null)),
    kneeMax: Math.max(0, ...days.map((d) => s.days[d]?.checkin?.knee ?? 0)),
  }
}

const n1 = (v: number) => v.toLocaleString('pt-PT', { maximumFractionDigits: 1 })

/** A semana anterior também não desceu? (o corte só acontece com duas semanas paradas) */
export function stalledBefore(s: State, end = todayKey()): boolean {
  const prev = weekStats(s, addDays(end, -7))
  return prev.loss != null && prev.loss < 0.2
}

/**
 * Regras do plano: o objetivo é perder 0,3 a 0,7 kg por semana.
 * Só se cortam calorias quando o plano foi mesmo cumprido; senão o problema é a adesão, não as calorias.
 */
export function recommend(w: WeekStats, stalledBefore: boolean): Recommendation {
  const reasons: string[] = []
  const tips: string[] = []
  const adherent = w.daysLogged >= 5 && (w.proteinAvg ?? 0) >= TARGETS.training.p * 0.85

  if (w.loss != null) reasons.push(`Peso médio: ${n1(w.weightNow!)} kg (${w.loss >= 0 ? '−' : '+'}${n1(Math.abs(w.loss))} kg numa semana)`)
  else reasons.push(`Só ${w.weighIns} pesagens esta semana: pesa-te pelo menos 4 manhãs`)
  reasons.push(`${w.daysLogged}/7 dias registados${w.proteinAvg != null ? `, proteína média ${Math.round(w.proteinAvg)} g` : ''}`)
  reasons.push(`${w.workouts}/${w.workoutsPlanned} treinos feitos`)

  let decision: Decision = 'keep'
  let headline = 'Mantém o plano tal como está.'
  if (w.loss == null) {
    headline = 'Sem pesagens suficientes: mantém o plano e pesa-te mais vezes.'
  } else if (w.loss > 1.0) {
    decision = 'add'
    headline = 'Estás a perder depressa demais: sobe 150 kcal para proteger o músculo.'
  } else if (w.loss < 0.2) {
    if (!adherent) headline = 'O peso parou, mas a semana teve pouca adesão. Primeiro cumpre o plano, depois ajustamos.'
    else if (stalledBefore) {
      decision = 'cut'
      headline = 'Duas semanas sem descer com o plano cumprido: tira 150 kcal (sai dos hidratos).'
    } else headline = 'O peso parou esta semana. Se a próxima for igual, cortamos 150 kcal.'
  } else {
    headline = `Ritmo certo (${n1(w.loss)} kg/semana). Não mexas em nada.`
  }

  if (w.workouts >= w.workoutsPlanned - 1 && w.kneeMax <= 3) tips.push('Treinos em dia e joelho tranquilo: continua a subir cargas quando a app sugerir.')
  if (w.kneeMax >= 5) tips.push(`O joelho chegou a ${w.kneeMax}/10. Marca uma consulta de fisioterapia ou ortopedia.`)
  if (w.sleepAvg != null && w.sleepAvg < 7) tips.push(`Dormiste em média ${n1(w.sleepAvg)} h. Mais sono ajuda a perder gordura e a recuperar: telemóvel fora do quarto às 22:45.`)
  if (w.stepsAvg != null && w.stepsAvg < TARGETS.steps) tips.push(`Média de ${Math.round(w.stepsAvg)} passos. Uma caminhada depois do almoço chega para os 9000.`)
  if (w.proteinAvg != null && w.proteinAvg < TARGETS.training.p * 0.85) tips.push('Proteína abaixo da meta: junta o batido ou um iogurte com whey ao lanche.')

  return { decision, kcalDelta: decision === 'cut' ? -150 : decision === 'add' ? 150 : 0, headline, reasons, tips }
}
