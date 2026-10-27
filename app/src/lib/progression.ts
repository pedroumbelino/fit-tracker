import type { Exercise } from '../data/plan'
import type { SetLog, State } from './store'

export const isTimeBased = (ex: Exercise) => /\b(s|min|m)\b/.test(ex.reps)

/** "6-8" → [6, 8]; "10/perna" → [10, 10]; "15" → [15, 15]. */
export function repRange(reps: string): [number, number] {
  const m = reps.match(/(\d+)(?:-(\d+))?/)
  if (!m) return [0, 0]
  const lo = Number(m[1])
  return [lo, m[2] ? Number(m[2]) : lo]
}

export function lastPerformance(s: State, exerciseId: string, before: string): { date: string; sets: SetLog[] } | null {
  const dates = Object.keys(s.days).filter((d) => d < before).sort().reverse()
  for (const d of dates) {
    const sets = s.days[d].sets.filter((x) => x.exerciseId === exerciseId)
    if (sets.length) return { date: d, sets }
  }
  return null
}

export type Suggestion = { kg: number; reps: number; label: string; tone: 'up' | 'hold' | 'deload' }

/**
 * Dupla progressão: quando todas as séries chegam ao topo da gama de repetições, sobe a carga;
 * caso contrário mantém a carga e tenta mais repetições. Na semana 6 (descarga) baixa ~10%.
 */
export function suggestLoad(ex: Exercise, last: { sets: SetLog[] } | null, cycleWeek: number | null): Suggestion | null {
  if (!last || isTimeBased(ex)) return null
  const [lo, hi] = repRange(ex.reps)
  const working = last.sets.filter((s) => s.kg > 0)
  if (!working.length) return null
  const kg = Math.max(...working.map((s) => s.kg))
  const atTop = working.filter((s) => s.kg === kg)
  // Halteres sobem de 2 em 2 kg; barras e máquinas de 2,5 em 2,5.
  const step = /halter/i.test(ex.name) ? 2 : 2.5
  const round = (v: number) => Math.round(v / step) * step

  if (cycleWeek === 6) {
    return { kg: round(kg * 0.9), reps: lo, label: `Descarga: ${fmt(round(kg * 0.9))} kg, metade das séries`, tone: 'deload' }
  }
  const allHit = last.sets.length >= ex.sets && atTop.every((s) => s.reps >= hi)
  if (allHit) return { kg: kg + step, reps: lo, label: `Sobe para ${fmt(kg + step)} kg × ${lo}`, tone: 'up' }
  const missed = atTop.some((s) => s.reps < lo)
  if (missed) return { kg, reps: lo, label: `Mantém ${fmt(kg)} kg e chega às ${lo} repetições`, tone: 'hold' }
  const best = Math.max(...atTop.map((s) => s.reps))
  return { kg, reps: Math.min(hi, best + 1), label: `Mantém ${fmt(kg)} kg, tenta ${Math.min(hi, best + 1)} repetições`, tone: 'hold' }
}

/** 1RM estimado (Epley) da melhor série de cada treino, para o gráfico de evolução. */
export function strengthHistory(s: State, exerciseId: string) {
  return Object.keys(s.days).sort().flatMap((d) => {
    const sets = s.days[d].sets.filter((x) => x.exerciseId === exerciseId && x.kg > 0)
    if (!sets.length) return []
    const e1rm = Math.max(...sets.map((x) => x.kg * (1 + x.reps / 30)))
    return [{ date: d, value: Math.round(e1rm * 10) / 10 }]
  })
}

const fmt = (n: number) => n.toLocaleString('pt-PT', { maximumFractionDigits: 1 })
