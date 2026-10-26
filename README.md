# Forma

Web app (PWA) para iPhone com o plano de alimentação, treino, sono e saúde do Pedro. O plano completo está em [PLANO.md](PLANO.md).

- **Hoje**: anéis de calorias, proteína, água e passos; check-in de prontidão (regras locais + Jev); refeições do plano com um toque; suplementos; rotina de sono.
- **Comida**: plano semanal com receitas para a Monsieur Cuisine; registo por foto (Claude estima as macros, Jev avalia se encaixa no plano, se tem lactose e se é processado); lista de compras do Continente com preços; vitaminas e água.
- **Treino**: sessão do dia, registo de séries com a carga da última vez, temporizador de descanso, semana do ciclo.
- **Saúde**: dados da app Saúde (via Atalho), peso com média de 7 dias, sono, passos e HRV.
- **Coach**: chat com o Claude, com imagens, que conhece o plano e os teus dados.
- **Definições**: tema Sistema / Claro / Escuro, conta, sincronização, token do Atalho, cópia de segurança.

Funciona sem configuração em modo local (dados só no iPhone). Com o Supabase ganha sincronização, AI e dados da Saúde.

## Estrutura

```
app/                      React + Vite + TypeScript (PWA)
  src/data/plan.ts        plano: alimentos, receitas, semana, treino, compras, suplementos, sono
  src/lib/                estado local, sincronização, metas, AI
  src/screens/            ecrãs
supabase/
  migrations/             tabelas, RLS e função do token
  functions/coach/        Claude (fotos e chat) + Jev (decisões rápidas)
  functions/health-ingest recebe os dados do Atalho do iOS
```

## 1. Correr localmente

```bash
cd app
npm install
npm run dev
```

## 2. Supabase

1. Cria um projeto em [supabase.com](https://supabase.com) (o plano gratuito chega).
2. Aplica a migração e publica as funções com a [CLI do Supabase](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <ref-do-projeto>
supabase db push
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... TYPESAFE_API_KEY=...
supabase functions deploy coach
supabase functions deploy health-ingest --no-verify-jwt
```

Segredos opcionais: `CLAUDE_MODEL` (por defeito `claude-opus-5-5`) e `AI_DAILY_LIMIT` (por defeito 150 chamadas por dia).

3. Em `app/.env.local`:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

4. Em Authentication → Providers → Email, podes desligar "Confirm email" (é uma app só tua). Depois cria a conta nas Definições da app.

### Chaves de AI

- **Claude** (Anthropic): [console.anthropic.com](https://console.anthropic.com). Analisa fotos de refeições com saída JSON estruturada e responde no chat. Usa esforço baixo nas fotos para poupar e tem fallback automático do lado do servidor caso um pedido seja recusado.
- **Jev** (TypeSafe AI): [console.typesafe.ai](https://console.typesafe.ai/keys). Responde a perguntas fechadas com probabilidades em menos de 1 s: encaixe da refeição no plano, lactose, nível de processamento, ajuste do treino do dia, cuidado com o joelho, dívida de sono. Sem chave, a app usa regras locais.

As chaves ficam só nos segredos do Supabase; nunca chegam ao telemóvel.

## 3. Publicar e instalar no iPhone

Qualquer alojamento estático serve (Netlify, Vercel, Cloudflare Pages):

```bash
cd app && npm run build   # publica a pasta app/dist
```

No iPhone: abre o endereço no Safari → Partilhar → **Adicionar ao ecrã principal**. Abre a partir do ícone (ecrã inteiro, funciona sem rede).

## 4. Dados da app Saúde (Atalho do iOS)

O iOS não deixa web apps lerem a app Saúde, por isso um Atalho envia os dados todas as manhãs.

1. Na app: Definições → Apple Saúde → **Gerar token do Atalho**. Copia o URL e o token.
2. Na app Atalhos, cria "Enviar Saúde":
   - Para cada métrica: **Encontrar amostras de Saúde** (Tipo, Data de início nos últimos 1 dias) → **Calcular estatísticas**:
     | Chave | Tipo na Saúde | Estatística |
     |---|---|---|
     | `steps` | Passos | Soma |
     | `active_kcal` | Energia ativa | Soma |
     | `exercise_min` | Minutos de exercício | Soma |
     | `resting_hr` | Frequência cardíaca em repouso | Média |
     | `hrv` | Variabilidade da frequência cardíaca | Média |
     | `weight` | Peso | Mais recente |
     | `body_fat` | Percentagem de gordura corporal | Mais recente |
     | `vo2max` | VO₂ máx | Mais recente |
     | `sleep_h` | Análise do sono (últimas 18 h, "A dormir") | Soma da duração em horas |
   - **Dicionário** com as chaves acima e `date` (Data atual formatada `yyyy-MM-dd`).
   - **Obter conteúdo do URL**: o URL copiado, método POST, cabeçalho `Authorization: Bearer <token>`, corpo JSON = Dicionário.
3. Automação → Pessoal → **Hora do dia** 09:00 diariamente → Executar imediatamente → "Enviar Saúde". Opcional: outra às 22:00 para fechar os passos do dia.

Exemplo do pedido:

```bash
curl -X POST https://<ref>.supabase.co/functions/v1/health-ingest \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"date":"2026-10-26","steps":"8 234","sleep_h":"7,2","hrv":48,"resting_hr":58,"weight":"83,6"}'
```

A função aceita números com vírgula e espaços (formato português), um dia ou uma lista de dias, e `sleep_min` ou `sleep_s` em alternativa a `sleep_h`.

## Notas

- Os preços da lista de compras são estimativas de marca Continente (outubro 2026). Edita-os em `app/src/data/plan.ts`.
- Para mudar o plano (refeições, treino, metas) basta editar `app/src/data/plan.ts`; as macros diárias são calculadas a partir dos ingredientes.
