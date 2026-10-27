// Plano do Pedro: 37 anos, 1,81 m, 84 kg, perda de gordura com recomposição.
// Os valores nutricionais são por 100 g (ou 100 ml) de produto cru / escorrido.

export type Macros = { kcal: number; p: number; c: number; g: number }

export const FOODS: Record<string, { name: string } & Macros> = {
  aveia: { name: 'Flocos de aveia', kcal: 372, p: 13, c: 60, g: 7 },
  leite: { name: 'Leite magro sem lactose', kcal: 36, p: 3.4, c: 5, g: 0.3 },
  banana: { name: 'Banana', kcal: 89, p: 1.1, c: 23, g: 0.3 },
  ovo: { name: 'Ovos', kcal: 143, p: 12.6, c: 0.7, g: 9.5 },
  pao: { name: 'Pão de forma integral', kcal: 245, p: 10, c: 41, g: 3.5 },
  frango: { name: 'Peito de frango', kcal: 110, p: 23, c: 0, g: 1.5 },
  peru: { name: 'Peru picado', kcal: 120, p: 21, c: 0, g: 4 },
  vaca: { name: 'Carne de vaca picada 5%', kcal: 125, p: 21, c: 0, g: 5 },
  pescada: { name: 'Pescada (filetes congelados)', kcal: 75, p: 17, c: 0, g: 0.8 },
  atum: { name: 'Atum ao natural (escorrido)', kcal: 110, p: 25, c: 0, g: 1 },
  sardinha: { name: 'Sardinha em tomate', kcal: 180, p: 18, c: 1, g: 11.5 },
  arroz: { name: 'Arroz agulha', kcal: 357, p: 7, c: 79, g: 0.6 },
  massa: { name: 'Massa integral', kcal: 350, p: 13, c: 64, g: 2.5 },
  batata: { name: 'Batata', kcal: 77, p: 2, c: 17, g: 0.1 },
  feijao: { name: 'Feijão encarnado cozido', kcal: 105, p: 7, c: 15, g: 0.5 },
  grao: { name: 'Grão-de-bico cozido', kcal: 130, p: 7, c: 17, g: 2.5 },
  lentilhas: { name: 'Lentilhas secas', kcal: 330, p: 24, c: 49, g: 1.5 },
  tomate: { name: 'Tomate pelado', kcal: 22, p: 1, c: 3.5, g: 0.2 },
  brocolos: { name: 'Brócolos congelados', kcal: 34, p: 2.8, c: 4, g: 0.4 },
  espinafres: { name: 'Espinafres congelados', kcal: 23, p: 2.9, c: 1.4, g: 0.4 },
  sopa: { name: 'Legumes para sopa', kcal: 35, p: 1.5, c: 6, g: 0.3 },
  cenoura: { name: 'Cenoura', kcal: 41, p: 0.9, c: 9.6, g: 0.2 },
  cebola: { name: 'Cebola', kcal: 40, p: 1.1, c: 9, g: 0.1 },
  salada: { name: 'Alface e tomate', kcal: 18, p: 1, c: 3, g: 0.2 },
  azeite: { name: 'Azeite', kcal: 884, p: 0, c: 0, g: 100 },
  amendoim: { name: 'Manteiga de amendoim 100%', kcal: 600, p: 25, c: 14, g: 50 },
  whey: { name: 'Whey isolada', kcal: 370, p: 85, c: 3, g: 1.5 },
  iogurte: { name: 'Iogurte natural sem lactose', kcal: 60, p: 4.5, c: 5, g: 1.5 },
  laranja: { name: 'Laranja', kcal: 47, p: 0.9, c: 12, g: 0.1 },
  maca: { name: 'Maçã', kcal: 52, p: 0.3, c: 14, g: 0.2 },
  nozes: { name: 'Nozes', kcal: 654, p: 15, c: 14, g: 65 },
}

export type Recipe = {
  id: string
  name: string
  emoji: string
  ingredients: [food: string, grams: number][]
  steps: string
  batch?: boolean
}

const SOPA: [string, number][] = [['sopa', 250], ['batata', 50], ['azeite', 5]]

export const RECIPES: Record<string, Recipe> = {
  papas: {
    id: 'papas', name: 'Papas de aveia com banana e ovos', emoji: '🥣',
    ingredients: [['aveia', 50], ['leite', 250], ['banana', 100], ['ovo', 110]],
    steps: 'Aveia e leite ao lume ou micro-ondas (2 min), banana às rodelas e canela. 2 ovos mexidos à parte.',
  },
  tosta: {
    id: 'tosta', name: 'Ovos mexidos com pão integral e laranja', emoji: '🍳',
    ingredients: [['pao', 70], ['ovo', 165], ['salada', 80], ['laranja', 150]],
    steps: '3 ovos mexidos numa frigideira antiaderente, 2 fatias de pão torrado, tomate às rodelas.',
  },
  iogurte: {
    id: 'iogurte', name: 'Taça de iogurte, aveia e amendoim', emoji: '🥛',
    ingredients: [['iogurte', 240], ['aveia', 30], ['banana', 100], ['amendoim', 10], ['whey', 25]],
    steps: '2 iogurtes sem lactose misturados com a whey, aveia, banana e 1 colher de manteiga de amendoim.',
  },
  chili: {
    id: 'chili', name: 'Chili de peru com feijão e arroz', emoji: '🌶️', batch: true,
    ingredients: [['peru', 150], ['feijao', 120], ['tomate', 150], ['cebola', 50], ['arroz', 60], ['azeite', 8]],
    steps: 'Monsieur Cuisine (x3 doses): cebola e alho 5 s vel. 5, refogar 3 min 120 °C. Junta 450 g peru, cominhos, pimentão, 8 min 100 °C vel. inversa 1. Junta 450 g tomate e 360 g feijão, 12 min 100 °C inversa. Arroz à parte.',
  },
  caril: {
    id: 'caril', name: 'Caril de frango com grão e espinafres', emoji: '🍛', batch: true,
    ingredients: [['frango', 160], ['grao', 120], ['espinafres', 150], ['tomate', 100], ['cebola', 50], ['arroz', 55], ['azeite', 8]],
    steps: 'Monsieur Cuisine (x3 doses): refogado de cebola e alho, caril em pó e gengibre. Frango aos cubos 10 min 100 °C inversa. Junta tomate, grão e espinafres, 10 min 100 °C inversa. Arroz à parte.',
  },
  bolonhesa: {
    id: 'bolonhesa', name: 'Bolonhesa de carne e lentilhas', emoji: '🍝',
    ingredients: [['vaca', 130], ['lentilhas', 40], ['tomate', 150], ['cebola', 50], ['cenoura', 50], ['massa', 75], ['azeite', 8]],
    steps: 'Refogado com cenoura picada, carne 6 min, lentilhas demolhadas e tomate 20 min. Massa integral à parte.',
  },
  frango: {
    id: 'frango', name: 'Frango com arroz e brócolos', emoji: '🍗',
    ingredients: [['frango', 180], ['arroz', 80], ['brocolos', 200], ['azeite', 10]],
    steps: 'Frango temperado com alho, limão e pimentão no forno 25 min a 200 °C. Brócolos ao vapor.',
  },
  batido: {
    id: 'batido', name: 'Batido pré-treino', emoji: '🥤',
    ingredients: [['leite', 300], ['whey', 30], ['banana', 100], ['amendoim', 15]],
    steps: 'Tudo no robot 30 s vel. 8. Toma 60 a 90 min antes do treino.',
  },
  tostaAtum: {
    id: 'tostaAtum', name: 'Tosta de atum e maçã', emoji: '🥪',
    ingredients: [['pao', 70], ['atum', 80], ['salada', 60], ['maca', 150]],
    steps: 'Atum escorrido com um pouco de mostarda, pão torrado e salada. Maçã de sobremesa.',
  },
  lancheLeve: {
    id: 'lancheLeve', name: 'Iogurte proteico com fruta', emoji: '🍎',
    ingredients: [['iogurte', 240], ['whey', 20], ['maca', 150]],
    steps: '2 iogurtes sem lactose com 20 g de whey e uma maçã. Lanche leve dos dias sem ginásio.',
  },
  pescada: {
    id: 'pescada', name: 'Sopa + pescada com batata e cenoura', emoji: '🐟',
    ingredients: [...SOPA, ['pescada', 220], ['batata', 200], ['cenoura', 100], ['azeite', 8]],
    steps: 'Monsieur Cuisine: batata e cenoura no cesto, pescada no tabuleiro de vapor, 25 min Varoma. Fio de azeite no fim.',
  },
  omelete: {
    id: 'omelete', name: 'Sopa + omelete de atum e espinafres', emoji: '🥬',
    ingredients: [...SOPA, ['ovo', 165], ['atum', 80], ['espinafres', 100], ['pao', 35], ['salada', 150]],
    steps: 'Omelete de 3 ovos com 1 lata de atum e espinafres salteados. Salada e 1 fatia de pão.',
  },
  sardinha: {
    id: 'sardinha', name: 'Sopa + sardinhas com grão e salada', emoji: '🥫',
    ingredients: [...SOPA, ['sardinha', 120], ['ovo', 55], ['grao', 100], ['salada', 150]],
    steps: 'Salada de grão com cebola roxa, salsa, 1 ovo cozido e as sardinhas. Rico em ómega-3, vitamina D e cálcio.',
  },
  frangoForno: {
    id: 'frangoForno', name: 'Sopa + frango no forno com batata', emoji: '🍽️',
    ingredients: [...SOPA, ['frango', 180], ['batata', 180], ['brocolos', 150], ['azeite', 8]],
    steps: 'Frango e batata às rodelas no forno 35 min a 200 °C com alho, louro e pimentão.',
  },
  ceia: {
    id: 'ceia', name: 'Iogurte com nozes', emoji: '🌙',
    ingredients: [['iogurte', 120], ['nozes', 15]],
    steps: 'Opcional, só se tiveres fome. Toma com o magnésio.',
  },
}

export function recipeMacros(r: Recipe): Macros {
  return r.ingredients.reduce<Macros>((acc, [food, grams]) => {
    const f = FOODS[food]
    const k = grams / 100
    return { kcal: acc.kcal + f.kcal * k, p: acc.p + f.p * k, c: acc.c + f.c * k, g: acc.g + f.g * k }
  }, { kcal: 0, p: 0, c: 0, g: 0 })
}

export type Slot = 'pa' | 'almoco' | 'lanche' | 'jantar' | 'ceia'
export const SLOTS: { id: Slot; label: string; time: string }[] = [
  { id: 'pa', label: 'Pequeno-almoço', time: '08:30' },
  { id: 'almoco', label: 'Almoço', time: '13:00' },
  { id: 'lanche', label: 'Lanche', time: '16:30' },
  { id: 'jantar', label: 'Jantar', time: '20:00' },
  { id: 'ceia', label: 'Ceia (opcional)', time: '22:00' },
]

// 0 = domingo, como em Date.getDay()
export const WEEK_MEALS: Record<number, Partial<Record<Slot, string>>> = {
  1: { pa: 'papas', almoco: 'chili', lanche: 'batido', jantar: 'pescada' },
  2: { pa: 'tosta', almoco: 'chili', lanche: 'batido', jantar: 'omelete' },
  3: { pa: 'papas', almoco: 'chili', lanche: 'lancheLeve', jantar: 'sardinha', ceia: 'ceia' },
  4: { pa: 'papas', almoco: 'caril', lanche: 'batido', jantar: 'sardinha' },
  5: { pa: 'tosta', almoco: 'caril', lanche: 'batido', jantar: 'pescada' },
  6: { pa: 'iogurte', almoco: 'caril', lanche: 'tostaAtum', jantar: 'omelete' },
  0: { pa: 'tosta', almoco: 'bolonhesa', lanche: 'lancheLeve', jantar: 'frangoForno', ceia: 'ceia' },
}

export const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const BATCH_COOKING = [
  { day: 'Domingo', what: 'Chili de peru x3 (Seg, Ter, Qua), sopa para 4 dias, arroz para 3 dias, coze os ovos da semana.' },
  { day: 'Quarta', what: 'Caril de frango x3 (Qui, Sex, Sáb), sopa para 3 dias, arroz para 3 dias.' },
]

// ---------- Metas ----------

export const PROFILE = {
  name: 'Pedro',
  age: 37,
  heightCm: 181,
  startWeightKg: 84,
  goalWeightKg: 78,
}

export const TARGETS = {
  training: { kcal: 2200, p: 170, c: 230, g: 65 },
  rest: { kcal: 2050, p: 170, c: 190, g: 65 },
  waterMl: 3000,
  waterTrainingExtraMl: 500,
  steps: 9000,
  sleepHours: 7.5,
  bedtime: '23:30',
  wake: '08:00',
  weeklyLossKg: 0.5,
}

// ---------- Treino ----------

export type Exercise = {
  id: string
  name: string
  sets: number
  reps: string
  rest: number
  note?: string
  knee?: boolean
  /** Alternativa quando o joelho dói (check-in com dor 4 ou mais). */
  alt?: string
}

export type Session = {
  id: string
  name: string
  short: string
  kind: 'gym' | 'cardio' | 'rest'
  minutes: number
  warmup?: string
  exercises: Exercise[]
  finisher?: string
}

const PREHAB: Exercise[] = [
  { id: 'tke', name: 'Extensão terminal do joelho com elástico', sets: 2, reps: '15', rest: 30, knee: true, note: 'Elástico atrás do joelho, estica por completo e aperta a coxa 1 s.' },
  { id: 'ponte', name: 'Ponte de glúteo', sets: 2, reps: '12', rest: 30 },
  { id: 'spanish', name: 'Agachamento espanhol isométrico', sets: 2, reps: '30 s', rest: 45, knee: true, note: 'Elástico grosso atrás dos joelhos preso a um poste. Desce até 60° e aguenta. Alivia o joelho.', alt: 'a mesma posição com menos flexão (ângulo mais aberto), 20 s' },
]

export const SESSIONS: Record<string, Session> = {
  supA: {
    id: 'supA', name: 'Superior A · Força', short: 'Superior A', kind: 'gym', minutes: 60,
    warmup: '5 min passadeira inclinada + 2 séries leves do primeiro exercício.',
    exercises: [
      { id: 'supinoInc', name: 'Supino inclinado com halteres', sets: 4, reps: '6-8', rest: 150 },
      { id: 'remadaApoio', name: 'Remada com peito apoiado (máquina)', sets: 4, reps: '6-8', rest: 150 },
      { id: 'pressOmbro', name: 'Press de ombros com halteres sentado', sets: 3, reps: '8-10', rest: 120 },
      { id: 'puxada', name: 'Puxada frontal', sets: 3, reps: '8-10', rest: 120 },
      { id: 'elevLat', name: 'Elevações laterais', sets: 3, reps: '12-15', rest: 60 },
      { id: 'curl', name: 'Curl de bíceps com halteres', sets: 2, reps: '10-12', rest: 60 },
      { id: 'triceps', name: 'Tríceps na polia com corda', sets: 2, reps: '10-12', rest: 60 },
    ],
  },
  infA: {
    id: 'infA', name: 'Inferior A · Posterior', short: 'Inferior A', kind: 'gym', minutes: 60,
    warmup: '5 min passadeira inclinada + bloco de proteção do joelho.',
    exercises: [
      ...PREHAB,
      { id: 'rdl', name: 'Peso morto romeno', sets: 4, reps: '6-8', rest: 150, note: 'Joelhos ligeiramente fletidos e fixos. Quase sem carga no joelho.' },
      { id: 'hipThrust', name: 'Hip thrust', sets: 3, reps: '8-10', rest: 120 },
      { id: 'legPress', name: 'Leg press com pés altos', sets: 3, reps: '10-12', rest: 120, knee: true, note: 'Desce só até onde não houver dor. Nada de rodar o joelho.', alt: 'Leg curl sentado extra (3 × 12) ou leg press só até 60°' },
      { id: 'legCurlSent', name: 'Leg curl sentado', sets: 3, reps: '10-12', rest: 90 },
      { id: 'abducao', name: 'Abdução da anca na máquina', sets: 2, reps: '15', rest: 60 },
      { id: 'gemeos', name: 'Gémeos em pé', sets: 3, reps: '12-15', rest: 60 },
      { id: 'pallof', name: 'Pallof press', sets: 3, reps: '10/lado', rest: 45 },
    ],
  },
  zona2: {
    id: 'zona2', name: 'Cardio zona 2 + mobilidade', short: 'Zona 2', kind: 'cardio', minutes: 55,
    exercises: [
      { id: 'passadeira', name: 'Passadeira inclinada (8-12%, 5-5,5 km/h)', sets: 1, reps: '40 min', rest: 0, note: 'Consegues falar mas não cantar. FC entre 115 e 135.' },
      ...PREHAB,
      { id: 'mobAnca', name: 'Mobilidade de anca e coluna torácica', sets: 1, reps: '10 min', rest: 0 },
    ],
  },
  supB: {
    id: 'supB', name: 'Superior B · Hipertrofia', short: 'Superior B', kind: 'gym', minutes: 60,
    warmup: '5 min passadeira inclinada + face pull leve.',
    exercises: [
      { id: 'puxadaNeutra', name: 'Puxada com pega neutra', sets: 3, reps: '10-12', rest: 90 },
      { id: 'supinoPlano', name: 'Supino plano com halteres', sets: 3, reps: '10-12', rest: 90 },
      { id: 'remadaPolia', name: 'Remada sentada na polia', sets: 3, reps: '10-12', rest: 90 },
      { id: 'peckDeck', name: 'Peck deck', sets: 2, reps: '12-15', rest: 60 },
      { id: 'facePull', name: 'Face pull', sets: 3, reps: '15', rest: 60 },
      { id: 'elevLatPolia', name: 'Elevação lateral na polia', sets: 3, reps: '15', rest: 60 },
      { id: 'martelo', name: 'Curl martelo', sets: 2, reps: '12', rest: 60 },
      { id: 'tricepsCabeca', name: 'Tríceps acima da cabeça na polia', sets: 2, reps: '12', rest: 60 },
    ],
  },
  infB: {
    id: 'infB', name: 'Inferior B · Joelho amigo', short: 'Inferior B', kind: 'gym', minutes: 60,
    warmup: '5 min passadeira inclinada + bloco de proteção do joelho.',
    exercises: [
      ...PREHAB,
      { id: 'goblet', name: 'Agachamento goblet até à caixa', sets: 3, reps: '8-10', rest: 120, knee: true, note: 'Caixa à altura do paralelo. Senta, não te atires. Só se não houver dor.', alt: 'Hip thrust com halter (3 × 10)' },
      { id: 'stepUp', name: 'Step-up em caixa baixa', sets: 3, reps: '10/perna', rest: 90, knee: true, note: 'Caixa de 30 a 40 cm. Joelho alinhado com o pé.', alt: 'Ponte de glúteo unilateral (3 × 12/perna)' },
      { id: 'hiperext', name: 'Extensão lombar a 45°', sets: 3, reps: '12', rest: 90 },
      { id: 'legExt', name: 'Leg extension parcial (90° a 30°)', sets: 3, reps: '12-15', rest: 60, knee: true, note: 'Carga leve, controlado. Para se doer.', alt: 'Agachamento espanhol isométrico (3 × 30 s)' },
      { id: 'legCurlDeit', name: 'Leg curl deitado', sets: 3, reps: '10-12', rest: 90 },
      { id: 'gemeosSent', name: 'Gémeos sentado', sets: 3, reps: '15', rest: 60 },
      { id: 'deadBug', name: 'Dead bug', sets: 3, reps: '10', rest: 45 },
      { id: 'pranchaLat', name: 'Prancha lateral', sets: 3, reps: '30 s/lado', rest: 45 },
    ],
  },
  full: {
    id: 'full', name: 'Corpo inteiro + passadeira', short: 'Full body', kind: 'gym', minutes: 70,
    warmup: '5 min passadeira inclinada.',
    exercises: [
      { id: 'puxadaFull', name: 'Puxada frontal', sets: 3, reps: '10', rest: 60 },
      { id: 'flexoes', name: 'Flexões ou supino máquina', sets: 3, reps: '10-15', rest: 60 },
      { id: 'remadaHalter', name: 'Remada unilateral com halter', sets: 3, reps: '10/lado', rest: 60 },
      { id: 'pressMaquina', name: 'Press de ombros na máquina', sets: 3, reps: '10', rest: 60 },
      { id: 'farmer', name: 'Farmer walk', sets: 3, reps: '40 m', rest: 60 },
      { id: 'passadeiraSab', name: 'Passadeira inclinada', sets: 1, reps: '30 min', rest: 0 },
    ],
  },
  descanso: {
    id: 'descanso', name: 'Descanso ativo', short: 'Descanso', kind: 'rest', minutes: 75,
    exercises: [
      { id: 'caminhada', name: 'Caminhada longa ao ar livre', sets: 1, reps: '60-90 min', rest: 0 },
      { id: 'alongamentos', name: 'Alongamentos suaves', sets: 1, reps: '10 min', rest: 0 },
    ],
  },
}

export const WEEK_TRAINING: Record<number, string> = {
  1: 'supA', 2: 'infA', 3: 'zona2', 4: 'supB', 5: 'infB', 6: 'full', 0: 'descanso',
}

export const isTrainingDay = (dow: number) => SESSIONS[WEEK_TRAINING[dow]].kind === 'gym'

export const TRAINING_RULES = [
  'Semanas 1 e 2: termina cada série a 3-4 repetições da falha (RIR 3-4). O corpo lembra-se, mas os tendões precisam de tempo.',
  'A partir da semana 3: RIR 1-2. Dupla progressão: quando fazes o topo das repetições em todas as séries, sobe 2,5 a 5% a carga.',
  'Joelho: dor até 3 em 10 durante o exercício é aceitável se não piorar no dia seguinte. Acima disso, reduz amplitude ou troca o exercício.',
  'Evita saltos, rotações com o pé fixo e agachamento profundo com carga até teres o joelho avaliado.',
  'Padel só depois de uma avaliação (ortopedista ou fisioterapeuta). Pede ecografia ou ressonância para saber se é menisco ou ligamento.',
  'Semana 6: semana de descarga (metade das séries) e repete o ciclo.',
]

// ---------- Suplementos, hidratação, sono ----------

export const SUPPLEMENTS = [
  { id: 'creatina', name: 'Creatina monohidratada', dose: '5 g', when: 'Qualquer hora, todos os dias', why: 'O suplemento com mais evidência para força e massa muscular. Barato.', essential: true },
  { id: 'vitD', name: 'Vitamina D3', dose: '1000-2000 UI', when: 'Ao almoço (com gordura)', why: 'De outubro a março há pouco sol. Confirma o valor nas análises.', essential: true },
  { id: 'magnesio', name: 'Magnésio bisglicinato', dose: '200-300 mg', when: '1 h antes de deitar', why: 'Pode ajudar a relaxar e adormecer. Opcional.', essential: false },
  { id: 'whey', name: 'Whey isolada', dose: '25-30 g', when: 'No batido / pequeno-almoço', why: 'Isolada quase não tem lactose. É proteína barata, não é obrigatória.', essential: false },
]

export const WATER_SCHEDULE = [
  { time: '08:00', ml: 500, label: 'Ao acordar' },
  { time: '10:30', ml: 500, label: 'Manhã' },
  { time: '13:00', ml: 500, label: 'Almoço' },
  { time: '15:30', ml: 500, label: 'Tarde' },
  { time: '18:00', ml: 500, label: 'Treino (+500 em dia de ginásio)' },
  { time: '20:00', ml: 500, label: 'Jantar' },
]

export const SLEEP_HABITS = [
  { id: 'luz', label: '10 min de luz natural de manhã', time: '08:15' },
  { id: 'cafeina', label: 'Sem cafeína (chá preto/verde) depois das 14:00', time: '14:00' },
  { id: 'treinoCedo', label: 'Treino acabado até às 19:30', time: '19:30' },
  { id: 'jantarCedo', label: 'Jantar 2 h antes de deitar', time: '21:30' },
  { id: 'luzes', label: 'Luzes baixas e modo Dormir ativo', time: '22:30' },
  { id: 'telemovel', label: 'Telemóvel a carregar fora do quarto', time: '22:45' },
  { id: 'respiracao', label: '5 min de respiração 4-7-8 ou leitura em papel', time: '23:00' },
  { id: 'deitar', label: 'Luzes apagadas às 23:30', time: '23:30' },
]

export const SLEEP_TIPS = [
  'Mesma hora de acordar todos os dias, inclusive ao fim de semana (08:00). É o que mais regula o sono.',
  'O telemóvel na cama é o maior inimigo. Usa um despertador barato e deixa o iPhone na sala.',
  'Quarto fresco (18-19 °C), escuro e silencioso.',
  'Se não adormeceres em 20 min, levanta-te, luz baixa, lê em papel e volta quando tiveres sono.',
  'Para de beber água 1 h 30 antes de deitar para não acordares a meio da noite.',
  'Stress 4 em 5: caminhada depois do almoço e 5 min de respiração ao fim do dia descem o cortisol.',
]

export const NUTRIENTS = [
  { name: 'Vitamina D', sources: 'Sardinha, ovos, sol de manhã, suplemento no inverno' },
  { name: 'Vitamina B12', sources: 'Carne, peixe, ovos, leite' },
  { name: 'Ferro', sources: 'Carne de vaca, lentilhas, grão, espinafres (com vitamina C da laranja)' },
  { name: 'Cálcio (sem lactose)', sources: 'Leite e iogurte sem lactose, sardinha, brócolos, grão' },
  { name: 'Magnésio', sources: 'Aveia, leguminosas, espinafres, amendoim, nozes' },
  { name: 'Potássio', sources: 'Banana, batata, feijão, tomate' },
  { name: 'Ómega-3', sources: 'Sardinha e cavala 2 vezes por semana, nozes' },
  { name: 'Fibra (30 g+)', sources: 'Aveia, leguminosas, sopa, fruta, pão integral' },
  { name: 'Vitamina C', sources: 'Laranja, brócolos, tomate' },
]

// ---------- Lista de compras (preços estimados Continente, marca própria) ----------

export type ShopItem = { id: string; name: string; qty: string; price: number; aisle: string; note?: string }

export const SHOPPING: ShopItem[] = [
  { id: 'frango', name: 'Peito de frango (filetes)', qty: '700 g', price: 4.89, aisle: 'Talho' },
  { id: 'peru', name: 'Peru picado', qty: '450 g', price: 3.49, aisle: 'Talho' },
  { id: 'vaca', name: 'Carne de vaca picada 5%', qty: '250 g', price: 2.49, aisle: 'Talho' },
  { id: 'pescada', name: 'Filetes de pescada congelados', qty: '500 g', price: 3.29, aisle: 'Congelados' },
  { id: 'espinafres', name: 'Espinafres congelados', qty: '750 g', price: 1.49, aisle: 'Congelados' },
  { id: 'sopa', name: 'Legumes para sopa congelados', qty: '2 kg', price: 3.18, aisle: 'Congelados' },
  { id: 'ovos', name: 'Ovos classe M', qty: '2 dúzias', price: 6.38, aisle: 'Ovos' },
  { id: 'leite', name: 'Leite magro sem lactose', qty: '2 L', price: 1.98, aisle: 'Laticínios' },
  { id: 'iogurte', name: 'Iogurte natural sem lactose', qty: '8 un.', price: 2.39, aisle: 'Laticínios' },
  { id: 'atum', name: 'Atum ao natural (pack 3)', qty: '1 pack', price: 3.29, aisle: 'Conservas' },
  { id: 'sardinha', name: 'Sardinha em tomate', qty: '2 latas', price: 1.98, aisle: 'Conservas' },
  { id: 'feijao', name: 'Feijão encarnado cozido (frasco)', qty: '1 frasco', price: 0.89, aisle: 'Mercearia' },
  { id: 'grao', name: 'Grão-de-bico cozido (frasco)', qty: '2 frascos', price: 1.78, aisle: 'Mercearia' },
  { id: 'tomate', name: 'Tomate pelado (lata)', qty: '3 latas', price: 2.07, aisle: 'Mercearia' },
  { id: 'pao', name: 'Pão de forma integral', qty: '1 un.', price: 1.49, aisle: 'Padaria' },
  { id: 'batata', name: 'Batata', qty: '1 kg', price: 1.29, aisle: 'Frutas e legumes' },
  { id: 'cebola', name: 'Cebola + alho', qty: '1 kg + 1 cabeça', price: 1.89, aisle: 'Frutas e legumes' },
  { id: 'cenoura', name: 'Cenoura', qty: '1 kg', price: 0.99, aisle: 'Frutas e legumes' },
  { id: 'salada', name: 'Alface + tomate', qty: '1 + 1 kg', price: 2.48, aisle: 'Frutas e legumes' },
  { id: 'banana', name: 'Banana', qty: '1 kg', price: 1.29, aisle: 'Frutas e legumes' },
  { id: 'fruta', name: 'Laranja e maçã', qty: '1 kg', price: 1.49, aisle: 'Frutas e legumes' },
]

// Compras de 3 em 3 semanas ou mais (custo semanal proporcional)
export const PANTRY: ShopItem[] = [
  { id: 'azeite', name: 'Azeite virgem extra', qty: '1 L (dura ~4 semanas)', price: 2.0, aisle: 'Mercearia', note: '7,99 € a cada 4 semanas' },
  { id: 'amendoim', name: 'Manteiga de amendoim 100%', qty: '350 g (~3 semanas)', price: 1.0, aisle: 'Mercearia' },
  { id: 'aveia', name: 'Flocos de aveia', qty: '500 g (~3 semanas)', price: 0.4, aisle: 'Mercearia' },
  { id: 'arroz', name: 'Arroz agulha', qty: '1 kg (~3 semanas)', price: 0.46, aisle: 'Mercearia' },
  { id: 'brocolos', name: 'Brócolos congelados', qty: '1 kg (~6 semanas)', price: 0.33, aisle: 'Congelados' },
  { id: 'massa', name: 'Massa integral', qty: '500 g (~6 semanas)', price: 0.2, aisle: 'Mercearia' },
  { id: 'lentilhas', name: 'Lentilhas secas', qty: '500 g (~10 semanas)', price: 0.15, aisle: 'Mercearia' },
  { id: 'nozes', name: 'Nozes', qty: '200 g (~6 semanas)', price: 0.6, aisle: 'Mercearia' },
  { id: 'especiarias', name: 'Caril, cominhos, pimentão, canela, louro', qty: 'uma vez', price: 0.3, aisle: 'Mercearia' },
  { id: 'whey', name: 'Whey isolada (online)', qty: '1 kg (~5 semanas)', price: 5.0, aisle: 'Online', note: 'Opcional' },
  { id: 'creatina', name: 'Creatina monohidratada (online)', qty: '300 g (~8 semanas)', price: 1.9, aisle: 'Online' },
]
