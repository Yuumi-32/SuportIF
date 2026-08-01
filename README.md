# SuportIF

SuportIF é uma plataforma aberta de estudos com trilhas interativas, missões curtas, exercícios guiados, revisões espaçadas, simulados e acompanhamento de progresso.

O MVP atual entrega um fluxo funcional ponta a ponta: aluno estuda e responde exercícios, tentativas são salvas, progresso/XP/revisões são atualizados, simulados geram resultado real, professores acompanham dados de turma e administradores gerenciam conteúdo demonstrativo.

## Avisos importantes

Todo conteúdo educacional incluído no seed é demonstrativo, fictício e não oficial.

O projeto não contém ementa oficial de curso, dados institucionais, conteúdo oficial de edital, integração com IFRO, SUAP, SIGAA, Moodle, IBGE ou qualquer outro sistema oficial.

O MVP não executa código enviado por usuário no backend. Exercícios de programação devem usar múltipla escolha, análise estática, pseudocódigo ou texto demonstrativo.

## Stack

- Next.js com App Router
- TypeScript
- Tailwind CSS
- shadcn/ui configurado manualmente com componentes base
- Prisma ORM
- PostgreSQL via Docker Compose
- Zod
- bcryptjs
- Cookie httpOnly com sessão persistida no banco
- React Hook Form
- Recharts
- Vitest

## Funcionalidades implementadas

- Landing page pública com dados reais do banco.
- Login real com usuários do PostgreSQL, hash de senha e sessão httpOnly.
- Papéis `STUDENT`, `TEACHER` e `ADMIN`.
- Dashboard do aluno com XP, nível, progresso, badges, revisões e próximo passo.
- Trilhas, módulos, missões e exercícios vindos do banco.
- Exercícios de múltipla escolha com feedback específico.
- Persistência de tentativas em `ExerciseAttempt`.
- Atualização de `MissionProgress`, XP, nível, badges e revisões.
- Revisões pendentes com ação real para marcar como feita.
- Simulados com envio real de respostas, resultado salvo, pontos fortes/fracos, revisões e XP com dedupe.
- Painel tutor com turmas, alunos, progresso, revisões, simulados, dificuldades, sinais de engajamento e observações.
- Admin básico com CRUD real para trilhas, módulos, missões, exercícios/alternativas, simulados e badges.
- Seed demonstrativo com usuários, turma, trilhas, módulos, missões, exercícios, badges, progresso, revisões, simulados e sinais de engajamento.

## Fora do MVP

- IA tutora real.
- Execução real de código no backend.
- Integrações com sistemas oficiais.
- Importação automática de edital/PDF.
- CRUD admin avançado com exclusão destrutiva.
- Editor rico de conteúdo.
- Ranking, chat, notificações, marketplace e app mobile nativo.
- Analytics avançado.

## Requisitos

- Node.js
- npm
- Docker
- Docker Compose

## Setup do zero

```bash
cp .env.example .env
npm install
docker compose up -d
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Acesse `http://localhost:3000`.

## Credenciais demo

Credenciais apenas para ambiente de desenvolvimento:

- `admin@suportif.dev`
- `professor@suportif.dev`
- `aluno@suportif.dev`
- `ana.demo@suportif.dev`
- `bruno.demo@suportif.dev`
- `carla.demo@suportif.dev`
- `diego.demo@suportif.dev`

Senha de todos:

```text
suportif123
```

## Scripts

```bash
npm run dev
npm run lint
npm run test
npx tsc --noEmit
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Rotas principais

- `/`
- `/login`
- `/app`
- `/app/trilhas`
- `/app/trilhas/[slug]`
- `/app/modulos/[id]`
- `/app/missoes/[id]`
- `/app/revisoes`
- `/app/simulados`
- `/app/simulados/[id]`
- `/app/simulados/[id]/resultado`
- `/tutor`
- `/tutor/turmas`
- `/tutor/turmas/[id]`
- `/tutor/alunos/[id]`
- `/admin`
- `/admin/trilhas`
- `/admin/modulos`
- `/admin/missoes`
- `/admin/exercicios`
- `/admin/simulados`
- `/admin/badges`

## Validação manual rápida

Aluno:

1. Entre como `aluno@suportif.dev`.
2. Abra `/app`.
3. Abra uma trilha, módulo e missão.
4. Responda um exercício e confira feedback, XP, progresso e revisão.
5. Abra `/app/simulados`, responda um simulado e confira o resultado.

Professor:

1. Entre como `professor@suportif.dev`.
2. Abra `/tutor`.
3. Abra turmas e detalhe de aluno.
4. Confira progresso, revisões, simulados, sinais e observações.

Admin:

1. Entre como `admin@suportif.dev`.
2. Abra `/admin`.
3. Abra as áreas de CRUD.
4. Crie ou edite conteúdo demonstrativo.
5. Confirme que professor e aluno não acessam `/admin`.

## Estrutura resumida

```text
prisma/
  schema.prisma
  seed.ts
src/
  app/
    admin/
    app/
    login/
    tutor/
    page.tsx
  components/
    admin/
    common/
    dashboard/
    exercises/
    layout/
    missions/
    reviews/
    simulations/
    teacher/
    tracks/
    ui/
  lib/
    auth/
    engagement/
    permissions/
    prisma/
    progress/
    reviews/
    simulations/
    tutor/
    validations/
    xp/
  server/
    actions/
    queries/
tests/
  unit/
docs/
```

## Licença

Este projeto usa a licença AGPL-3.0. Veja o arquivo `LICENSE`.
