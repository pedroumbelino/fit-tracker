import { RECIPES, recipeMacros, type Macros } from './plan'

// Valores aproximados por dose típica em Portugal (restaurante ou casa).
// Servem de ponto de partida: a porção ajusta-se no registo.

export type Dish = Macros & { id: string; name: string; portion: string; lactose?: boolean; plan?: boolean }

const D = (id: string, name: string, portion: string, kcal: number, p: number, c: number, g: number, lactose = false): Dish =>
  ({ id, name, portion, kcal, p, c, g, lactose })

export const DISHES: Dish[] = [
  // Pratos
  D('bitoque', 'Bitoque (bife, ovo, batata frita, arroz)', '1 prato', 1050, 52, 85, 55),
  D('frangoAssado', 'Frango assado com batata frita', '1/4 de frango + batata', 850, 50, 55, 45),
  D('frangoGrelhado', 'Peito de frango grelhado com arroz e salada', '1 prato', 620, 50, 65, 14),
  D('bacalhauBras', 'Bacalhau à Brás', '1 prato', 720, 38, 45, 42),
  D('bacalhauNatas', 'Bacalhau com natas', '1 prato', 800, 35, 45, 52, true),
  D('bacalhauCozido', 'Bacalhau cozido com grão e batata', '1 prato', 650, 48, 60, 20),
  D('arrozPato', 'Arroz de pato', '1 prato', 850, 42, 80, 38),
  D('arrozMarisco', 'Arroz de marisco', '1 prato', 600, 35, 75, 15),
  D('cozido', 'Cozido à portuguesa', '1 prato', 1100, 60, 60, 65),
  D('feijoada', 'Feijoada', '1 prato', 850, 45, 70, 40),
  D('francesinha', 'Francesinha (sem batata)', '1 francesinha', 1300, 70, 75, 75, true),
  D('francesinhaBatata', 'Francesinha com batata frita', '1 prato', 1750, 75, 125, 100, true),
  D('polvoLagareiro', 'Polvo à lagareiro com batata a murro', '1 prato', 750, 45, 50, 40),
  D('sardinhasAssadas', 'Sardinhas assadas com batata e salada', '6 sardinhas', 700, 45, 40, 38),
  D('peixeGrelhado', 'Peixe grelhado com batata cozida e legumes', '1 prato', 520, 45, 45, 16),
  D('douradaGrelhada', 'Dourada grelhada com batata e salada', '1 prato', 580, 48, 40, 24),
  D('bifeGrelhado', 'Bife de vaca grelhado com arroz e salada', '1 prato', 680, 50, 60, 25),
  D('febras', 'Febras de porco com arroz e batata frita', '1 prato', 950, 45, 90, 45),
  D('alheira', 'Alheira com ovo e batata frita', '1 prato', 1000, 35, 75, 62),
  D('lasanha', 'Lasanha de carne', '1 dose', 700, 35, 55, 36, true),
  D('esparguete', 'Esparguete à bolonhesa', '1 prato', 680, 32, 85, 22),
  D('massaAtum', 'Massa com atum e tomate', '1 prato', 600, 38, 80, 12),
  D('caril', 'Caril de frango com arroz', '1 prato', 750, 40, 80, 28),
  D('salmao', 'Salmão grelhado com legumes e batata', '1 prato', 650, 40, 40, 34),
  // Rápido e fora de casa
  D('pizzaFatia', 'Pizza (1 fatia grande)', '1 fatia', 300, 13, 35, 12, true),
  D('pizzaInteira', 'Pizza individual', '1 pizza', 1000, 42, 115, 40, true),
  D('hamburguer', 'Hambúrguer no pão', '1 hambúrguer', 550, 30, 40, 30, true),
  D('hamburguerMenu', 'Menu hambúrguer com batata frita e refrigerante', '1 menu', 1150, 33, 140, 50, true),
  D('kebab', 'Kebab no pão', '1 kebab', 750, 38, 65, 36),
  D('sushi', 'Sushi variado', '12 peças', 550, 22, 85, 12),
  D('poke', 'Poke de salmão', '1 taça', 650, 32, 75, 22),
  D('bifana', 'Bifana no pão', '1 bifana', 450, 25, 40, 20),
  D('prego', 'Prego no pão', '1 prego', 500, 32, 40, 22),
  D('tostaMista', 'Tosta mista', '1 tosta', 420, 22, 38, 20, true),
  D('sandesFrango', 'Sandes de frango e alface', '1 sandes', 420, 30, 45, 12),
  D('wrapFrango', 'Wrap de frango', '1 wrap', 480, 30, 45, 18),
  D('saladaFrango', 'Salada de frango grelhado', '1 taça', 380, 38, 15, 18),
  D('saladaAtum', 'Salada de atum com ovo', '1 taça', 400, 35, 15, 22),
  // Sopas
  D('sopaLegumes', 'Sopa de legumes', '1 prato', 120, 4, 18, 4),
  D('caldoVerde', 'Caldo verde com chouriço', '1 prato', 200, 8, 18, 11),
  D('sopaPeixe', 'Sopa de peixe', '1 prato', 220, 18, 20, 7),
  // Pequeno-almoço e lanches
  D('ovosMexidos', 'Ovos mexidos', '2 ovos', 180, 13, 1, 14),
  D('omelete', 'Omelete simples', '3 ovos', 260, 19, 2, 20),
  D('paoManteiga', 'Pão com manteiga', '1 pão', 220, 6, 30, 9, true),
  D('paoQueijo', 'Pão com queijo', '1 pão', 290, 13, 30, 13, true),
  D('paoFiambre', 'Pão com fiambre de peru', '1 pão', 230, 14, 31, 5),
  D('croissant', 'Croissant simples', '1 croissant', 280, 6, 30, 15, true),
  D('pastelNata', 'Pastel de nata', '1 pastel', 300, 5, 32, 17, true),
  D('bolo', 'Fatia de bolo caseiro', '1 fatia', 350, 5, 45, 16, true),
  D('galao', 'Galão', '1 copo', 120, 6, 9, 6, true),
  D('galaoSemLactose', 'Galão com leite sem lactose', '1 copo', 90, 6, 9, 3),
  D('iogurteGrego', 'Iogurte grego natural', '1 iogurte', 160, 6, 6, 12, true),
  D('skyr', 'Skyr natural', '1 copo (150 g)', 95, 16, 6, 0, true),
  D('barraProteica', 'Barra proteica', '1 barra', 200, 20, 20, 7),
  D('frutosSecos', 'Frutos secos (mão cheia)', '30 g', 180, 6, 6, 15),
  D('banana', 'Banana', '1 média', 105, 1, 27, 0),
  D('maca', 'Maçã', '1 média', 80, 0, 21, 0),
  D('laranja', 'Laranja', '1 média', 70, 1, 17, 0),
  // Bebidas
  D('cerveja', 'Cerveja (imperial)', '200 ml', 85, 1, 7, 0),
  D('cervejaGarrafa', 'Cerveja (garrafa)', '330 ml', 140, 1, 11, 0),
  D('vinho', 'Copo de vinho', '150 ml', 125, 0, 4, 0),
  D('refrigerante', 'Refrigerante com açúcar', '1 lata', 140, 0, 35, 0),
  D('sumoLaranja', 'Sumo de laranja natural', '1 copo', 110, 2, 25, 0),
]

/** As receitas do plano também aparecem na pesquisa, com os valores exatos. */
export const PLAN_DISHES: Dish[] = Object.values(RECIPES).map((r) => {
  const m = recipeMacros(r)
  return { id: `plan:${r.id}`, name: r.name, portion: 'dose do plano', kcal: m.kcal, p: m.p, c: m.c, g: m.g, plan: true }
})

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Pesquisa por palavras, sem acentos: "bacalhau bras" encontra "Bacalhau à Brás". */
export function searchDishes(query: string, limit = 6): Dish[] {
  const words = norm(query).split(/\s+/).filter((w) => w.length >= 2)
  if (!words.length) return []
  return [...PLAN_DISHES, ...DISHES]
    .map((d) => {
      const name = norm(d.name)
      const hits = words.filter((w) => name.includes(w)).length
      const score = hits / words.length + (name.startsWith(words[0]) ? 0.5 : 0) + (d.plan ? 0.1 : 0)
      return { d, hits, score }
    })
    .filter((x) => x.hits === words.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.d)
}
