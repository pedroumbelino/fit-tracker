import { useEffect, useState, type ReactNode } from 'react'

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const Icon = {
  today: () => <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  food: () => <svg viewBox="0 0 24 24" {...s}><path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 21V3c-2 1-3 4-3 8h3" /></svg>,
  dumbbell: () => <svg viewBox="0 0 24 24" {...s}><path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11" /></svg>,
  heart: () => <svg viewBox="0 0 24 24" {...s}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>,
  spark: () => <svg viewBox="0 0 24 24" {...s}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></svg>,
  gear: () => <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  camera: () => <svg viewBox="0 0 24 24" {...s}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" /></svg>,
  send: () => <svg viewBox="0 0 24 24" {...s}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  plus: () => <svg viewBox="0 0 24 24" {...s}><path d="M12 5v14M5 12h14" /></svg>,
  x: () => <svg viewBox="0 0 24 24" {...s}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  check: () => <svg viewBox="0 0 24 24" {...s} strokeWidth={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
}

export function Ring({ value, max, color, size = 76, stroke = 9, children }: {
  value: number; max: number; color: string; size?: number; stroke?: number; children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(1, max > 0 ? value / max : 0)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--card-2)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  )
}

export function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0)
  return <div className="bar"><span style={{ width: `${pct}%`, background: color }} /></div>
}

export function MacroBar({ label, value, max, color, unit = 'g' }: { label: string; value: number; max: number; color: string; unit?: string }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row between small">
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="muted num">{Math.round(value)} / {max} {unit}</span>
      </div>
      <Bar value={value} max={max} color={color} />
    </div>
  )
}

/** Gráfico de linha simples, sem dependências. Ignora valores em falta. */
export function LineChart({ points, color, height = 120, unit = '', domainPad = 0.5 }: {
  points: { label: string; value?: number; avg?: number }[]; color: string; height?: number; unit?: string; domainPad?: number
}) {
  const vals = points.flatMap((p) => [p.value, p.avg]).filter((v): v is number => v != null)
  if (vals.length < 2) return <p className="muted small" style={{ padding: '24px 0', textAlign: 'center' }}>Ainda sem dados suficientes.</p>
  const min = Math.min(...vals) - domainPad
  const max = Math.max(...vals) + domainPad
  const w = 320
  const x = (i: number) => (i / Math.max(1, points.length - 1)) * (w - 8) + 4
  const y = (v: number) => height - 6 - ((v - min) / (max - min || 1)) * (height - 12)
  const line = (key: 'value' | 'avg') =>
    points.map((p, i) => (p[key] != null ? `${x(i)},${y(p[key]!)}` : null)).filter(Boolean).join(' ')
  const hasAvg = points.some((p) => p.avg != null)
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} role="img" aria-label="Gráfico">
        {hasAvg && <polyline points={line('avg')} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />}
        {points.map((p, i) => p.value != null && (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={hasAvg ? 2.5 : 3} fill={color} opacity={hasAvg ? 0.45 : 1} />
        ))}
        {!hasAvg && <polyline points={line('value')} fill="none" stroke={color} strokeWidth={2} opacity={0.6} />}
      </svg>
      <div className="row between tiny muted num">
        <span>{points[0].label}</span>
        <span>{min.toFixed(1)} a {max.toFixed(1)} {unit}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  )
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])
  if (!open) return null
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="grab" />
        {children}
      </div>
    </div>
  )
}

export function Check({ on }: { on: boolean }) {
  return <span className={`check ${on ? 'on' : ''}`}>{on && <span style={{ width: 14, height: 14, display: 'grid' }}><Icon.check /></span>}</span>
}

let toastSetter: ((m: string | null) => void) | null = null
export function toast(msg: string) {
  toastSetter?.(msg)
}
export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    toastSetter = setMsg
    return () => { toastSetter = null }
  }, [])
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2200)
    return () => clearTimeout(t)
  }, [msg])
  return msg ? <div className="toast" role="status">{msg}</div> : null
}

export function Scale({ value, onChange, max = 5, min = 1, labels }: {
  value: number; onChange: (v: number) => void; max?: number; min?: number; labels?: [string, string]
}) {
  const opts = Array.from({ length: max - min + 1 }, (_, i) => i + min)
  return (
    <div>
      <div className="segmented" style={{ marginBottom: 4 }}>
        {opts.map((o) => (
          <button key={o} className={value === o ? 'on' : ''} onClick={() => onChange(o)}>{o}</button>
        ))}
      </div>
      {labels && <div className="row between tiny muted"><span>{labels[0]}</span><span>{labels[1]}</span></div>}
    </div>
  )
}
