// Coach de AI da app Forma.
//   mode "meal":      foto (ou descrição) de uma refeição → macros estimadas pelo Claude + veredictos do Jev
//   mode "chat":      conversa com o coach (Claude), com imagem opcional
//   mode "readiness": decisão rápida do Jev sobre o treino de hoje
//
// Segredos: ANTHROPIC_API_KEY, TYPESAFE_API_KEY (opcional). Opcional: CLAUDE_MODEL, AI_DAILY_LIMIT.

import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0'
import { choice, Image, noul, score, TypeSafeClient } from 'npm:@typesafe-ai/sdk@0.7.0'
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { cors, json } from '../_shared/http.ts'

const MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-opus-5-5'
const DAILY_LIMIT = Number(Deno.env.get('AI_DAILY_LIMIT') ?? 150)

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const jevKey = Deno.env.get('TYPESAFE_API_KEY')
const jev = jevKey ? new TypeSafeClient({ apiKey: jevKey, compression: false }) : null

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const COACH_SYSTEM = `És o coach pessoal de saúde do Pedro, dentro da app Forma. Respondes sempre em português de Portugal (nunca do Brasil), de forma direta, prática e calorosa.

Regras de escrita:
- Nunca uses travessões (—). Usa vírgulas, pontos ou dois pontos.
- Respostas curtas: 2 a 6 frases ou uma lista curta. Sem preâmbulos.
- Se a mensagem do Pedro for "mtpor", responde com o menor número de palavras possível.

Quem é o Pedro: 37 anos, 1,81 m, começou com 84 kg, quer perder gordura e ganhar músculo. Tem muita experiência de treino mas está parado. Treina no Viva Gym, trabalha em casa, intolerante à lactose, possível lesão no joelho (menisco ou ligamento, sem diagnóstico; dói depois de jogar padel). Stress 4 em 5, demora a adormecer e usa o telemóvel na cama. Gosta muito de caminhar. Tem uma Monsieur Cuisine (robot de cozinha do Lidl), forno, micro-ondas e fogão. Compra no Continente e quer gastar pouco.

O plano dele:
- Calorias: 2200 kcal em dias de ginásio, 2050 nos restantes. Proteína 170 g/dia, gordura ~65 g.
- Água: 3 L/dia, mais 0,5 L em dias de treino.
- Treino: Seg Superior A (força), Ter Inferior A (posterior, amigo do joelho), Qua Zona 2 na passadeira inclinada, Qui Superior B (hipertrofia), Sex Inferior B (joelho amigo), Sáb corpo inteiro + passadeira, Dom caminhada longa. Ciclos de 6 semanas: semanas 1-2 RIR 3-4, depois RIR 1-2, semana 6 descarga. 9000 passos/dia.
- Sono: acordar às 08:00 todos os dias, luzes apagadas às 23:30, telemóvel fora do quarto às 22:45.
- Suplementos: creatina 5 g, vitamina D3 1000-2000 UI (out-mar), magnésio ao deitar (opcional), whey isolada (opcional).

Como ajudar:
- Usa o contexto JSON (refeições de hoje, metas, dados da Saúde dos últimos 14 dias) para respostas concretas, com números.
- Comida: sugere opções do plano ou baratas do Continente, sem lactose. Diz quanto falta de proteína e calorias.
- Joelho: nada de saltos, rotações com o pé fixo ou flexão profunda com carga. Se houver dor acima de 3 em 10, inchaço, bloqueio ou falha do joelho, recomenda ortopedista ou fisioterapeuta.
- Não fazes diagnósticos médicos. Para sintomas preocupantes, análises fora do normal ou medicação, recomenda o médico.
- Nas fotos (prato, rótulo, máquina do ginásio, análises), descreve o que vês e dá uma recomendação prática.`

const MEAL_SYSTEM = `És um nutricionista que estima calorias e macronutrientes de refeições a partir de fotos e descrições. Contexto: português, cozinha portuguesa, produtos do Continente. Estima porções de forma realista (pratos portugueses típicos são generosos). Se o utilizador indicar quantidades nas notas, usa-as. Os nomes dos alimentos e a dica vêm em português de Portugal, sem travessões. A dica ("tip") é uma frase prática para o resto do dia, tendo em conta as metas e o que já comeu (contexto JSON). Confiança: "alta" se a porção e os ingredientes são claros, "baixa" se a foto é ambígua.`

const MEAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'items', 'total', 'confidence', 'tip'],
  properties: {
    name: { type: 'string', description: 'Nome curto da refeição' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g'],
        properties: {
          name: { type: 'string' },
          grams: { type: 'number' },
          kcal: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
        },
      },
    },
    total: {
      type: 'object',
      additionalProperties: false,
      required: ['kcal', 'protein_g', 'carbs_g', 'fat_g'],
      properties: {
        kcal: { type: 'number' },
        protein_g: { type: 'number' },
        carbs_g: { type: 'number' },
        fat_g: { type: 'number' },
      },
    },
    confidence: { type: 'string', enum: ['alta', 'media', 'baixa'] },
    tip: { type: 'string' },
  },
}

type Msg = { role: 'user' | 'assistant'; text: string; image?: string }

const imageBlock = (data: string) =>
  ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } }) as const

/** Claude com fallback do lado do servidor caso um classificador de segurança recuse o pedido. */
async function claude(params: Omit<Anthropic.Beta.Messages.MessageCreateParamsNonStreaming, 'model'>) {
  const res = await anthropic.beta.messages.create({
    model: MODEL,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    ...params,
  })
  if (res.stop_reason === 'refusal') throw new HttpError(422, 'O modelo recusou este pedido. Tenta reformular.')
  return res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function analyzeMeal(image: string | null, note: string, context: unknown) {
  const content: Anthropic.Beta.Messages.BetaContentBlockParam[] = []
  if (image) content.push(imageBlock(image))
  content.push({
    type: 'text',
    text: `Notas do Pedro: ${note || '(sem notas)'}\n\nContexto do dia (JSON): ${JSON.stringify(context)}`,
  })

  const claudeCall = claude({
    max_tokens: 4000,
    system: MEAL_SYSTEM,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: MEAL_SCHEMA } },
    messages: [{ role: 'user', content }],
  }).then((text) => JSON.parse(text))

  // O Jev responde a perguntas fechadas sobre a foto em menos de 1 s, em paralelo com o Claude.
  const day = (context as { today?: Record<string, unknown> })?.today ?? {}
  const jevCall = jev
    ? jev.systemOne({
        state: {
          meal_photo: image ? Image.fromBase64(image) : 'no photo',
          meal_description: note || 'none',
          daily_targets: (day.targets ?? null) as never,
          eaten_so_far_today: (day.eaten ?? null) as never,
        },
        questions: {
          fit: choice('How well does this meal fit a fat-loss, high-protein plan, given the daily targets and what was already eaten today?', {
            great: 'Lean protein, vegetables, sensible portion: fits very well',
            ok: 'Acceptable, with some excess in calories, fat or carbs, or low protein',
            adjust: 'Calorie-dense or low in protein: the rest of the day should compensate',
          }),
          lactose: noul('The meal visibly contains regular dairy with lactose, such as milk, cream, fresh cheese, regular yogurt or ice cream. Products labelled lactose-free and aged hard cheeses do not count.'),
          protein_ok: noul('The meal contains a substantial protein source of roughly 30 g of protein or more.'),
          processed: score('How processed is the food in this meal?', [
            'Whole or minimally processed foods',
            'Some processed components',
            'Mostly ultra-processed food',
          ]),
        },
      }).then(({ answers }) => ({
        fit: { choice: answers.fit.choice, confidence: answers.fit.confidence },
        lactose: answers.lactose.noul,
        protein_ok: answers.protein_ok.noul,
        processed: answers.processed.score,
      })).catch((e) => {
        console.error('jev meal', e)
        return null
      })
    : Promise.resolve(null)

  const [meal, jevResult] = await Promise.all([claudeCall, jevCall])
  return { ...meal, jev: jevResult }
}

async function chat(messages: Msg[], context: unknown) {
  const history = messages.slice(-16).filter((m) => m.text || m.image)
  // A conversa tem de começar com o utilizador.
  while (history.length && history[0].role !== 'user') history.shift()
  if (!history.length) throw new HttpError(400, 'Mensagem vazia')

  const apiMessages: Anthropic.Beta.Messages.BetaMessageParam[] = history.map((m, i) => {
    const last = i === history.length - 1
    if (m.role === 'assistant') return { role: 'assistant', content: m.text }
    const content: Anthropic.Beta.Messages.BetaContentBlockParam[] = []
    if (m.image) content.push(imageBlock(m.image))
    content.push({ type: 'text', text: m.text || 'Analisa esta imagem.' })
    if (last) content.push({ type: 'text', text: `Contexto atual da app (JSON): ${JSON.stringify(context)}` })
    return { role: 'user', content }
  })

  const text = await claude({
    max_tokens: 4000,
    system: COACH_SYSTEM,
    cache_control: { type: 'ephemeral' },
    output_config: { effort: 'medium' },
    messages: apiMessages,
  })
  return { text }
}

async function readiness(context: unknown) {
  if (!jev) throw new HttpError(501, 'O Jev não está configurado (falta TYPESAFE_API_KEY).')
  const { answers } = await jev.systemOne({
    state: context as never,
    questions: {
      level: choice('Given the check-in (energy, soreness, stress, knee pain on 0-10) and the Apple Health recovery signals over the last 14 days (sleep hours, HRV and resting heart rate compared with his own average), how should today\'s planned session be adjusted?', {
        full: 'Recovery signals are fine: train as planned',
        reduced: 'Some fatigue: remove one set per exercise and keep one extra rep in reserve',
        recovery: 'Poor recovery: replace the session with a walk and mobility work',
      }),
      knee_caution: noul('Knee-loading exercises (leg press, squats, step-ups, leg extension) should be limited today because of the reported knee pain.'),
      sleep_debt: noul('Over the last few nights he slept clearly less than 7 hours on average, so he is carrying sleep debt.'),
    },
  })
  return {
    level: answers.level.choice,
    confidence: answers.level.confidence,
    knee_caution: answers.knee_caution.noul,
    sleep_debt: answers.sleep_debt.noul,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data: { user } } = await admin.auth.getUser(jwt)
    if (!user) return json({ error: 'Sessão inválida' }, 401)

    const since = new Date(Date.now() - 86_400_000).toISOString()
    const { count } = await admin.from('ai_calls').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('at', since)
    if ((count ?? 0) >= DAILY_LIMIT) return json({ error: 'Limite diário de AI atingido.' }, 429)

    const body = await req.json()
    await admin.from('ai_calls').insert({ user_id: user.id, mode: String(body.mode) })

    switch (body.mode) {
      case 'meal':
        return json(await analyzeMeal(body.image ?? null, String(body.note ?? ''), body.context))
      case 'chat':
        return json(await chat(body.messages ?? [], body.context))
      case 'readiness':
        return json(await readiness(body.context))
      default:
        return json({ error: 'mode inválido' }, 400)
    }
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status)
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'Demasiados pedidos. Tenta daqui a um minuto.' }, 429)
    if (e instanceof Anthropic.APIError) {
      console.error('anthropic', e.status, e.message)
      return json({ error: 'Erro no serviço de AI.' }, 502)
    }
    console.error(e)
    return json({ error: 'Erro interno' }, 500)
  }
})
