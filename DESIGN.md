---
name: SuportIF
description: Plataforma educacional guiada para trilhas, missoes, revisoes, simulados e progresso.
colors:
  background: "#ffffff"
  app-background: "#f8fafc"
  surface: "#ffffff"
  ink: "#020817"
  muted: "#64748b"
  border: "#e2e8f0"
  primary: "#178c54"
  primary-deep: "#11693f"
  accent-soft: "#e9f7ef"
  secondary-soft: "#f1f5f9"
  destructive: "#ef4444"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "30px"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "0"
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  badge-secondary:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.md}"
    padding: "2px 10px"
---

# Design System: SuportIF

## 1. Overview

**Creative North Star: "Jornada de Aprendizado Guiada"**

SuportIF deve parecer uma plataforma educacional real: clara, moderna, confiavel e orientada ao progresso. A interface precisa dar a sensacao de caminho acompanhado, com proximos passos, conquistas, revisoes e simulados conectados em uma jornada, nao em um painel interno.

A experiencia do aluno e a referencia principal da marca. Tutor e admin existem como superficies operacionais de apoio, mas a identidade visual deve continuar pertencendo ao aprendizado: espaco em branco, hierarquia forte, cards elegantes, texto humano e verde como sinal de acao, continuidade e progresso.

O sistema rejeita aparencia generica de IA, dark theme pesado, neon, glassmorphism exagerado, dashboards administrativos nas telas do aluno e qualquer conteudo que pareca oficial de instituicao real.

**Key Characteristics:**

- Claro e arejado, com muito espaco em branco.
- Verde como cor principal de acao, progresso e continuidade.
- Cards discretos, elegantes e pouco arredondados.
- Hierarquia visual forte para orientar o proximo passo.
- Linguagem humana, demonstrativa e nao oficial.

## 2. Colors

A paleta atual combina fundo claro, superficies brancas, texto slate e verde esmeralda como acento principal. O verde deve carregar acao e progresso; neutros devem manter a leitura limpa e confiavel.

### Primary

- **Verde Progresso** (`#178c54`): cor principal para botoes primarios, progresso, foco, XP e caminhos de continuidade.
- **Verde Profundo** (`#11693f`): usado para hover, textos fortes sobre fundos verdes suaves e enfase de progresso.
- **Verde Suave** (`#e9f7ef`): usado em badges, estados leves, chamadas de continuidade e fundos de apoio.

### Neutral

- **Branco de Superficie** (`#ffffff`): base de cards, formularios e areas de conteudo.
- **Fundo Claro do App** (`#f8fafc`): fundo geral para separar a aplicacao das superficies.
- **Slate de Texto** (`#020817`): texto principal e titulos.
- **Slate Muted** (`#64748b`): texto secundario, descricoes e metadados, mantendo contraste.
- **Borda Leve** (`#e2e8f0`): divisores, cards e inputs.
- **Slate Suave** (`#f1f5f9`): fundos secundarios, areas compactas e estados neutros.

### Named Rules

**The Green Means Progress Rule.** Verde deve indicar acao, continuidade, selecao ou progresso. Nao usar verde como decoracao gratuita.

**The Demonstrative Content Rule.** Cores e textos nao devem sugerir institucionalidade oficial, edital real ou orgao publico.

## 3. Typography

**Display Font:** system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif  
**Body Font:** system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif  
**Label/Mono Font:** system-ui para labels; nao ha fonte mono dedicada no sistema atual.

**Character:** A tipografia deve ser familiar, direta e legivel. O peso alto pode marcar saudacao, progresso e proximo passo, mas labels, tabelas e textos de apoio devem continuar calmos e funcionais.

### Hierarchy

- **Display** (900, 30px, 1.15): saudacoes, titulos principais da jornada e chamadas de alto nivel.
- **Headline** (700, 24px, 1.2): secoes como trilhas em andamento, simulados sugeridos e grupos de missao.
- **Title** (600, 20px, 1.25): titulos de cards, missoes, modulos e blocos de conteudo.
- **Body** (400, 16px, 1.6): textos explicativos, descricoes de missao e orientacoes. Manter linhas longas em ate 65-75ch quando houver prosa.
- **Label** (600, 14px, 1.4): botoes, navegacao, badges e metadados importantes. Evitar caixa alta rastreada como padrao.

### Named Rules

**The Human Label Rule.** Labels visiveis devem ser termos de usuario, como "Trilhas", "Revisoes" e "Continuar estudando", nunca slugs, enums ou estados internos.

## 4. Elevation

SuportIF usa elevacao discreta: bordas leves, superficies brancas e sombras pequenas para separar cards sem criar efeito de dashboard pesado. Profundidade deve apoiar escaneabilidade e estado, nao decorar a tela.

### Shadow Vocabulary

- **Card Resting** (`shadow-sm shadow-slate-950/[0.03]`): sombra padrao em cards comuns.
- **Progress Feature** (`shadow-md shadow-emerald-950/[0.04]`): sombra um pouco mais presente para cards de continuidade ou proximo passo.
- **Primary Action** (`shadow-sm shadow-emerald-900/20`): reforco sutil para botoes primarios verdes.

### Named Rules

**The Light Layer Rule.** Em repouso, cards devem parecer leves e confiaveis. Evitar sombras grandes, brilho, glassmorphism e fundos escuros pesados.

## 5. Components

### Buttons

- **Shape:** cantos discretos, raio medio de `6px`; nao usar arredondamento exagerado.
- **Primary:** fundo `#178c54`, texto branco, altura `40px`, peso `600`, padding horizontal de `16px`.
- **Hover / Focus:** hover aprofunda para verde mais escuro; foco usa anel verde visivel.
- **Secondary / Outline / Ghost:** devem permanecer claros, com bordas leves ou fundo verde suave. Usar para acoes secundarias, nao para competir com o proximo passo principal.

### Chips

- **Style:** badges e chips usam fundos suaves, texto de alto contraste e raio discreto.
- **State:** XP, nivel, area do aluno e status de progresso devem parecer informativos e positivos, sem linguagem tecnica.

### Cards / Containers

- **Corner Style:** `8px` como padrao.
- **Background:** branco para conteudo principal; verde suave apenas quando reforca continuidade, progresso ou sugestao.
- **Shadow Strategy:** sombras pequenas e bordas leves; evitar combinacoes decorativas de borda forte com sombra grande.
- **Border:** `#e2e8f0` ou verde muito suave quando o contexto for progresso.
- **Internal Padding:** `24px` em cards completos; `16px` em blocos compactos.

### Inputs / Fields

- **Style:** fundo claro, borda leve, raio discreto e labels legiveis.
- **Focus:** anel verde visivel, consistente com `--ring`.
- **Error / Disabled:** erro deve combinar cor e texto. Disabled deve reduzir enfase sem perder legibilidade.

### Navigation

- **Style:** navegacao simples, texto sem caixa alta rastreada, hover em verde suave.
- **Aluno:** deve reforcar jornada com entradas como Inicio, Trilhas, Simulados e Revisoes.
- **Tutor/Admin:** pode ser mais denso e utilitario, mas deve preservar a mesma linguagem visual limpa.
- **Mobile:** navegacao pode rolar horizontalmente quando necessario, mantendo alvos confortaveis.

### Signature Component

**Mapa de Trilha.** Modulos, missoes e progresso devem ser tratados como caminho de aprendizado. A composicao deve sugerir sequencia e continuidade, nao apenas uma lista administrativa de registros.

## 6. Do's and Don'ts

### Do:

- **Do** usar verde como sinal de acao, continuidade, progresso e feedback positivo.
- **Do** manter bastante espaco em branco e hierarquia forte para que o estudante saiba o proximo passo.
- **Do** escrever textos humanos, demonstrativos e seguros, deixando claro que conteudo e ficticio quando necessario.
- **Do** fazer cards elegantes, com raio de `8px`, bordas leves e sombras discretas.
- **Do** separar mentalmente a area do aluno das areas de tutor/admin: a tela do aluno deve parecer jornada de aprendizado.

### Don't:

- **Don't** fazer as telas do aluno parecerem admin dashboard, backoffice ou sistema interno.
- **Don't** mostrar slugs, enums, IDs, nomes de modelos, termos de banco ou estados internos para usuarios finais.
- **Don't** usar dark theme pesado, neon, glassmorphism exagerado, gradientes decorativos ou visual generico de IA.
- **Don't** criar conteudo que pareca oficial do IFRO, IBGE, governo, edital, concurso, orgao publico ou instituicao real.
- **Don't** transformar XP, badges e progresso em gamificacao infantil; a sensacao deve ser premium, educacional e confiavel.
