import {
  RECIPES, SESSIONS, TARGETS, WEEK_MEALS, WEEK_TRAINING, isTrainingDay, recipeMacros, type Macros, type Slot,
} from '../data/plan'
import { dow, lastDays } from './date'
import { store, type Checkin, type DayLog, type HealthDay, type State } from './store'

export function dayTargets(date: string) {
  const training = isTrainingDay(dow(date))
  const base = training ? TARGETS.training : TARGETS.rest
  // O ajuste das revisões semanais mexe só nos hidratos: proteína e gordura ficam fixas.
  const adjust = store.get().settings.kcalAdjust ?? 0
  const m = { ...base, kcal: base.kcal + adjust, c: Math.max(100, base.c + Math.round(adjust / 4)) }
  const sessionId = WEEK_TRAINING[dow(date)]
  const water = TARGETS.waterMl + (SESSIONS[sessionId].kind !== 'rest' ? TARGETS.waterTrainingExtraMl : 0)
  return { ...m, water, training, sessionId }
}

export function totals(day: DayLog): Macros {
  return day.meals.reduce<Macros>(
    (a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, g: a.g + m.g }),
    { kcal: 0, p: 0, c: 0, g: 0 },
  )
}

export function plannedMeals(date: string) {
  return Object.entries(WEEK_MEALS[dow(date)]).map(([slot, id]) => {
    const r = RECIPES[id!]
    return { slot: slot as Slot, recipe: r, macros: recipeMacros(r) }
  })
}

/** Tendência de peso: média móvel de 7 dias para não reagir ao ruído diário. */
export function weightTrend(health: Record<string, HealthDay>, days = 30) {
  const keys = lastDays(days)
  const points = keys.map((k) => health[k]?.weight).map((w, i, arr) => {
    const win = arr.slice(Math.max(0, i - 6), i + 1).filter((x): x is number => x != null)
    return { date: keys[i], weight: w, avg: win.length ? win.reduce((a, b) => a + b, 0) / win.length : undefined }
  })
  return points
}

export function latest(health: Record<string, HealthDay>, metric: keyof HealthDay): number | undefined {
  const k = Object.keys(health).filter((d) => health[d][metric] != null).sort().pop()
  return k ? health[k][metric] : undefined
}

export function baseline(health: Record<string, HealthDay>, metric: keyof HealthDay, days = 28): number | undefined {
  const vals = lastDays(days).map((d) => health[d]?.[metric]).filter((v): v is number => v != null)
  return vals.length >= 5 ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined
}

export type Readiness = { level: 'full' | 'reduced' | 'recovery'; reasons: string[]; kneeCaution: boolean }

/** Regra local, usada quando o Jev não está configurado ou não responde. */
export function localReadiness(checkin: Checkin | undefined, h: HealthDay | undefined, health: Record<string, HealthDay>): Readiness {
  const reasons: string[] = []
  let score = 0
  if (h?.sleep_h != null && h.sleep_h < 6) { score += 2; reasons.push(`Dormiste ${h.sleep_h.toFixed(1)} h`) }
  const hrvBase = baseline(health, 'hrv')
  if (h?.hrv != null && hrvBase && h.hrv < hrvBase * 0.85) { score += 1; reasons.push('HRV abaixo do habitual') }
  const rhrBase = baseline(health, 'resting_hr')
  if (h?.resting_hr != null && rhrBase && h.resting_hr > rhrBase + 5) { score += 1; reasons.push('FC de repouso elevada') }
  if (checkin) {
    if (checkin.energy <= 2) { score += 1; reasons.push('Energia baixa') }
    if (checkin.soreness >= 4) { score += 1; reasons.push('Muitas dores musculares') }
    if (checkin.stress >= 5) { score += 1; reasons.push('Stress muito alto') }
  }
  const kneeCaution = (checkin?.knee ?? 0) >= 3
  if (kneeCaution) reasons.push(`Joelho ${checkin!.knee}/10`)
  const level = score >= 3 ? 'recovery' : score >= 1 || (checkin?.knee ?? 0) >= 5 ? 'reduced' : 'full'
  return { level, reasons, kneeCaution }
}

/** Resumo enviado ao coach de AI: só o que é preciso para responder bem. */
export function buildContext(s: State, date: string) {
  const day = s.days[date]
  const t = dayTargets(date)
  const eaten = day ? totals(day) : { kcal: 0, p: 0, c: 0, g: 0 }
  const week = lastDays(14).map((d) => ({ date: d, ...s.health[d], kcal: s.days[d] ? Math.round(totals(s.days[d]).kcal) : undefined, trained: s.days[d]?.workoutDone ?? false }))
  return {
    profile: { age: 37, sex: 'male', height_cm: 181, start_weight_kg: 84, goal: 'fat loss with muscle gain (recomposition)', lactose_intolerant: true, knee_issue: 'possible meniscus/ligament issue, pain after padel, no diagnosis', gym: 'Viva Gym', works_from_home: true, stress: '4/5', sleep_issue: 'slow to fall asleep, uses phone in bed' },
    today: {
      date,
      session: SESSIONS[t.sessionId].name,
      targets: { kcal: t.kcal, protein_g: t.p, carbs_g: t.c, fat_g: t.g, water_ml: t.water },
      eaten: { kcal: Math.round(eaten.kcal), protein_g: Math.round(eaten.p), carbs_g: Math.round(eaten.c), fat_g: Math.round(eaten.g) },
      water_ml: day?.water ?? 0,
      meals: day?.meals.map((m) => ({ slot: m.slot, name: m.name, kcal: Math.round(m.kcal), protein_g: Math.round(m.p) })) ?? [],
      planned_meals: plannedMeals(date).map((m) => m.recipe.name),
      checkin: day?.checkin,
      workout_done: day?.workoutDone ?? false,
    },
    last_14_days: week,
  }
}
