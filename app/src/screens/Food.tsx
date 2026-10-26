import { useRef, useState } from 'react'
import { Check, Icon, MacroBar, Sheet, toast } from '../components/ui'
import {
  BATCH_COOKING, DAY_SHORT, FOODS, NUTRIENTS, PANTRY, SHOPPING, SLOTS, SUPPLEMENTS, WATER_SCHEDULE, type Slot,
} from '../data/plan'
import { ai, aiAvailable, fileToJpegBase64, type MealAnalysis } from '../lib/ai'
import { addDays, dow, todayKey } from '../lib/date'
import { actions, getDay, store, useStore } from '../lib/store'
import { buildContext, dayTargets, plannedMeals, totals } from '../lib/targets'

type Seg = 'plano' | 'registo' | 'compras' | 'nutrientes'

export default function Food() {
  const [seg, setSeg] = useState<Seg>('plano')
  return (
    <div className="screen">
      <p className="eyebrow">Alimentação</p>
      <h1>Comida</h1>
      <div className="segmented">
        {(['plano', 'registo', 'compras', 'nutrientes'] as Seg[]).map((s) => (
          <button key={s} className={seg === s ? 'on' : ''} onClick={() => setSeg(s)}>
            {{ plano: 'Plano', registo: 'Registo', compras: 'Compras', nutrientes: 'Nutrientes' }[s]}
          </button>
        ))}
      </div>
      {seg === 'plano' && <Plan />}
      {seg === 'registo' && <Log />}
      {seg === 'compras' && <Shopping />}
      {seg === 'nutrientes' && <Nutrients />}
    </div>
  )
}

function weekDates() {
  const today = todayKey()
  const offset = (dow(today) + 6) % 7 // segunda = 0
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - offset))
}

function Plan() {
  const today = todayKey()
  const [date, setDate] = useState(today)
  const [open, setOpen] = useState<string | null>(null)
  const meals = plannedMeals(date)
  const t = dayTargets(date)
  const sum = meals.filter((m) => m.slot !== 'ceia').reduce((a, m) => ({ kcal: a.kcal + m.macros.kcal, p: a.p + m.macros.p, c: a.c + m.macros.c, g: a.g + m.macros.g }), { kcal: 0, p: 0, c: 0, g: 0 })
  return (
    <>
      <div className="days">
        {weekDates().map((d) => (
          <button key={d} className={`${d === date ? 'on' : ''} ${d === today ? 'today' : ''}`} onClick={() => setDate(d)}>
            <span>{DAY_SHORT[dow(d)]}</span>
            <span className="num" style={{ fontSize: 17 }}>{Number(d.slice(8))}</span>
          </button>
        ))}
      </div>
      <div className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <h3>{t.training ? 'Dia de treino' : 'Dia sem ginásio'}</h3>
          <span className="chip accent num">{Math.round(sum.kcal)} / {t.kcal} kcal</span>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          <MacroBar label="Proteína" value={sum.p} max={t.p} color="var(--protein)" />
          <MacroBar label="Hidratos" value={sum.c} max={t.c} color="var(--carbs)" />
          <MacroBar label="Gordura" value={sum.g} max={t.g} color="var(--fat)" />
        </div>
      </div>
      <div className="card flush">
        {meals.map(({ slot, recipe, macros }) => (
          <div key={slot}>
            <button className="list-item" onClick={() => setOpen(open === slot ? null : slot)}>
              <span className="emoji">{recipe.emoji}</span>
              <div className="grow">
                <div className="tiny muted" style={{ fontWeight: 600 }}>{SLOTS.find((s) => s.id === slot)!.label.toUpperCase()}</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{recipe.name}</div>
                <div className="small muted num">{Math.round(macros.kcal)} kcal · P {Math.round(macros.p)} · H {Math.round(macros.c)} · G {Math.round(macros.g)}</div>
              </div>
              {recipe.batch && <span className="chip">batch</span>}
            </button>
            {open === slot && (
              <div style={{ padding: '0 16px 14px 60px' }}>
                <ul className="small" style={{ margin: '0 0 8px', paddingLeft: 18 }}>
                  {recipe.ingredients.map(([f, g]) => <li key={f}>{g} {f === 'leite' ? 'ml' : 'g'} {FOODS[f].name.toLowerCase()}</li>)}
                </ul>
                <p className="small muted">{recipe.steps}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <h2>Cozinhar em lote</h2>
      <div className="card flush">
        {BATCH_COOKING.map((b) => (
          <div key={b.day} className="list-item">
            <span className="emoji">🍲</span>
            <div className="grow"><div style={{ fontWeight: 600 }}>{b.day}</div><div className="small muted">{b.what}</div></div>
          </div>
        ))}
      </div>
    </>
  )
}

function Log() {
  const date = todayKey()
  const day = useStore((s) => getDay(s, date))
  const t = dayTargets(date)
  const tot = totals(day)
  const [sheet, setSheet] = useState<'photo' | 'manual' | null>(null)
  return (
    <>
      <div className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <h3>Hoje</h3>
          <span className="chip accent num">{Math.round(tot.kcal)} / {t.kcal} kcal</span>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          <MacroBar label="Proteína" value={tot.p} max={t.p} color="var(--protein)" />
          <MacroBar label="Hidratos" value={tot.c} max={t.c} color="var(--carbs)" />
          <MacroBar label="Gordura" value={tot.g} max={t.g} color="var(--fat)" />
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          {t.p - tot.p > 5 ? `Faltam ${Math.round(t.p - tot.p)} g de proteína.` : 'Proteína do dia cumprida.'}{' '}
          {t.kcal - tot.kcal > 0 ? `Ainda tens ${Math.round(t.kcal - tot.kcal)} kcal.` : `Passaste ${Math.round(tot.kcal - t.kcal)} kcal.`}
        </p>
      </div>
      <div className="grid2" style={{ marginBottom: 12 }}>
        <button className="btn" onClick={() => setSheet('photo')}><span style={{ width: 20, height: 20, display: 'grid' }}><Icon.camera /></span> Foto com AI</button>
        <button className="btn ghost" onClick={() => setSheet('manual')}><span style={{ width: 20, height: 20, display: 'grid' }}><Icon.plus /></span> Manual</button>
      </div>
      <div className="card flush">
        {day.meals.length === 0 && <p className="muted small" style={{ padding: 16 }}>Ainda nada registado hoje. Marca as refeições do plano no separador Hoje ou tira uma foto.</p>}
        {day.meals.map((m) => (
          <div key={m.id} className="list-item">
            <span className="emoji">{m.source === 'ai' ? '📸' : m.source === 'plan' ? '✅' : '✍️'}</span>
            <div className="grow">
              <div className="tiny muted" style={{ fontWeight: 600 }}>{SLOTS.find((s) => s.id === m.slot)?.label.toUpperCase() ?? m.slot}</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div>
              <div className="small muted num">{Math.round(m.kcal)} kcal · P {Math.round(m.p)} · H {Math.round(m.c)} · G {Math.round(m.g)}</div>
              {m.verdict && <div className="small" style={{ marginTop: 2 }}>{m.verdict}</div>}
            </div>
            <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => actions.removeMeal(m.id)} aria-label="Apagar">
              <span style={{ width: 16, height: 16, display: 'grid' }}><Icon.x /></span>
            </button>
          </div>
        ))}
      </div>
      <Sheet open={sheet === 'photo'} onClose={() => setSheet(null)}><PhotoMeal onDone={() => setSheet(null)} /></Sheet>
      <Sheet open={sheet === 'manual'} onClose={() => setSheet(null)}><ManualMeal onDone={() => setSheet(null)} /></Sheet>
    </>
  )
}

function currentSlot(): Slot {
  const h = new Date().getHours()
  if (h < 11) return 'pa'
  if (h < 16) return 'almoco'
  if (h < 19) return 'lanche'
  if (h < 22) return 'jantar'
  return 'ceia'
}

function SlotPicker({ value, onChange }: { value: Slot; onChange: (s: Slot) => void }) {
  return (
    <div className="segmented">
      {SLOTS.map((s) => (
        <button key={s.id} className={value === s.id ? 'on' : ''} onClick={() => onChange(s.id)}>
          {{ pa: 'PA', almoco: 'Almoço', lanche: 'Lanche', jantar: 'Jantar', ceia: 'Ceia' }[s.id]}
        </button>
      ))}
    </div>
  )
}

const FIT_LABEL: Record<string, string> = { great: 'Encaixa muito bem no plano', ok: 'Aceitável no plano', adjust: 'Convém ajustar o resto do dia' }

function PhotoMeal({ onDone }: { onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [img, setImg] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [slot, setSlot] = useState<Slot>(currentSlot())
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<MealAnalysis | null>(null)

  async function analyze() {
    setLoading(true)
    try {
      setRes(await ai.meal(img, note, buildContext(store.get(), todayKey())))
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro na análise')
    } finally {
      setLoading(false)
    }
  }

  function save() {
    if (!res) return
    const verdict = res.jev?.fit ? FIT_LABEL[res.jev.fit.choice] : undefined
    actions.addMeal({ slot, name: res.name, source: 'ai', kcal: res.total.kcal, p: res.total.protein_g, c: res.total.carbs_g, g: res.total.fat_g, verdict, notes: res.tip })
    toast('Refeição registada')
    onDone()
  }

  if (!aiAvailable()) {
    return <p className="muted">Para analisar fotos, liga o Supabase e as chaves de AI (vê o README do projeto) e inicia sessão nas Definições.</p>
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <h2 style={{ margin: 0 }}>Analisar refeição</h2>
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={async (e) => {
        const f = e.target.files?.[0]
        if (f) { setImg(await fileToJpegBase64(f)); setRes(null) }
      }} />
      {img ? (
        <img src={`data:image/jpeg;base64,${img}`} alt="Refeição" style={{ width: '100%', borderRadius: 16, maxHeight: 280, objectFit: 'cover' }} onClick={() => input.current?.click()} />
      ) : (
        <button className="card" style={{ border: '2px dashed var(--line)', height: 160, display: 'grid', placeItems: 'center', boxShadow: 'none' }} onClick={() => input.current?.click()}>
          <span className="stack" style={{ alignItems: 'center' }}><span style={{ width: 36, height: 36, display: 'grid' }}><Icon.camera /></span><span className="muted">Tirar ou escolher foto</span></span>
        </button>
      )}
      <textarea className="field" rows={2} placeholder="Notas (opcional): ex. 150 g de frango, meia dose de arroz" value={note} onChange={(e) => setNote(e.target.value)} />
      <SlotPicker value={slot} onChange={setSlot} />
      {!res && <button className="btn block" disabled={(!img && !note.trim()) || loading} onClick={analyze}>{loading ? <><span className="spinner" /> A analisar…</> : 'Analisar'}</button>}
      {res && (
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="row between"><h3>{res.name}</h3><span className="chip">confiança {res.confidence}</span></div>
          <p className="num" style={{ fontSize: 26, fontWeight: 700, margin: '8px 0' }}>{Math.round(res.total.kcal)} kcal</p>
          <p className="small muted num">Proteína {Math.round(res.total.protein_g)} g · Hidratos {Math.round(res.total.carbs_g)} g · Gordura {Math.round(res.total.fat_g)} g</p>
          <ul className="small" style={{ paddingLeft: 18 }}>
            {res.items.map((i) => <li key={i.name}>{i.name} · ~{Math.round(i.grams)} g · {Math.round(i.kcal)} kcal</li>)}
          </ul>
          {res.jev && (
            <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {res.jev.fit && <span className={`chip ${res.jev.fit.choice === 'adjust' ? 'warn' : 'accent'}`}>{FIT_LABEL[res.jev.fit.choice]}</span>}
              {res.jev.lactose != null && res.jev.lactose > 0.5 && <span className="chip danger">Pode ter lactose</span>}
              {res.jev.processed != null && res.jev.processed >= 1.5 && <span className="chip warn">Muito processado</span>}
            </div>
          )}
          <p className="small">{res.tip}</p>
          <div className="grid2" style={{ marginTop: 12 }}>
            <button className="btn ghost" onClick={() => setRes(null)}>Repetir</button>
            <button className="btn" onClick={save}>Guardar</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ManualMeal({ onDone }: { onDone: () => void }) {
  const [slot, setSlot] = useState<Slot>(currentSlot())
  const [f, setF] = useState({ name: '', kcal: '', p: '', c: '', g: '' })
  const num = (v: string) => Number(v.replace(',', '.')) || 0
  return (
    <div className="stack" style={{ gap: 12 }}>
      <h2 style={{ margin: 0 }}>Adicionar refeição</h2>
      <SlotPicker value={slot} onChange={setSlot} />
      <input className="field" placeholder="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <div className="grid2">
        {(['kcal', 'p', 'c', 'g'] as const).map((k) => (
          <div key={k}>
            <label className="lbl">{{ kcal: 'Calorias', p: 'Proteína (g)', c: 'Hidratos (g)', g: 'Gordura (g)' }[k]}</label>
            <input className="field" inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </div>
        ))}
      </div>
      <button className="btn block" disabled={!f.name || !f.kcal} onClick={() => {
        actions.addMeal({ slot, name: f.name, source: 'manual', kcal: num(f.kcal), p: num(f.p), c: num(f.c), g: num(f.g) })
        toast('Refeição registada')
        onDone()
      }}>Guardar</button>
    </div>
  )
}

function Shopping() {
  const checked = useStore((s) => s.shopping.checked)
  const total = SHOPPING.reduce((a, i) => a + i.price, 0)
  const pantryTotal = PANTRY.reduce((a, i) => a + i.price, 0)
  const left = SHOPPING.filter((i) => !checked[i.id]).reduce((a, i) => a + i.price, 0)
  const aisles = [...new Set(SHOPPING.map((i) => i.aisle))]
  const eur = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
  return (
    <>
      <div className="card">
        <div className="grid3">
          <div className="stat"><b className="num">{eur(total)}</b><span>Semana</span></div>
          <div className="stat"><b className="num">{eur(pantryTotal)}</b><span>Despensa / sem.</span></div>
          <div className="stat"><b className="num">{eur(left)}</b><span>Falta comprar</span></div>
        </div>
        <p className="tiny muted" style={{ marginTop: 10 }}>Preços estimados de marca Continente (out. 2026). Confirma na app Continente; promoções em talho e congelados baixam bastante o total.</p>
      </div>
      {aisles.map((a) => (
        <div key={a}>
          <p className="eyebrow" style={{ margin: '16px 4px 6px' }}>{a}</p>
          <div className="card flush">
            {SHOPPING.filter((i) => i.aisle === a).map((i) => (
              <button key={i.id} className="list-item" onClick={() => actions.toggleShop(i.id)} style={{ opacity: checked[i.id] ? 0.5 : 1 }}>
                <Check on={!!checked[i.id]} />
                <div className="grow">
                  <div style={{ fontWeight: 600, fontSize: 15, textDecoration: checked[i.id] ? 'line-through' : 'none' }}>{i.name}</div>
                  <div className="small muted">{i.qty}</div>
                </div>
                <span className="small num muted">{eur(i.price)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="eyebrow" style={{ margin: '16px 4px 6px' }}>Despensa (quando acabar)</p>
      <div className="card flush">
        {PANTRY.map((i) => (
          <button key={i.id} className="list-item" onClick={() => actions.toggleShop(i.id)} style={{ opacity: checked[i.id] ? 0.5 : 1 }}>
            <Check on={!!checked[i.id]} />
            <div className="grow">
              <div style={{ fontWeight: 600, fontSize: 15 }}>{i.name}</div>
              <div className="small muted">{i.qty}{i.note && ` · ${i.note}`}</div>
            </div>
          </button>
        ))}
      </div>
      <button className="btn ghost block" onClick={() => actions.clearShop()}>Nova semana (limpar)</button>
    </>
  )
}

function Nutrients() {
  return (
    <>
      <div className="card">
        <h3>Sem lactose, sem stress</h3>
        <p className="small muted" style={{ marginTop: 6 }}>O plano usa leite e iogurte sem lactose e whey isolada. Queijos curados (parmesão, flamengo) quase não têm lactose e podes testar em pequenas doses.</p>
      </div>
      <h2>Vitaminas e minerais</h2>
      <div className="card flush">
        {NUTRIENTS.map((n) => (
          <div key={n.name} className="list-item"><div className="grow"><div style={{ fontWeight: 600 }}>{n.name}</div><div className="small muted">{n.sources}</div></div></div>
        ))}
      </div>
      <h2>Suplementos</h2>
      <div className="card flush">
        {SUPPLEMENTS.map((s) => (
          <div key={s.id} className="list-item">
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{s.name} · {s.dose} {!s.essential && <span className="chip">opcional</span>}</div>
              <div className="small muted">{s.when}. {s.why}</div>
            </div>
          </div>
        ))}
      </div>
      <h2>Água</h2>
      <div className="card flush">
        {WATER_SCHEDULE.map((w) => (
          <div key={w.time} className="list-item">
            <span className="small muted num" style={{ width: 42 }}>{w.time}</span>
            <div className="grow">{w.label}</div>
            <span className="small num">{w.ml} ml</span>
          </div>
        ))}
      </div>
      <p className="small muted" style={{ padding: '0 4px' }}>3 L por dia, mais 0,5 L nos dias de ginásio. Para de beber 1 h 30 antes de deitar para não acordares a meio da noite.</p>
    </>
  )
}
