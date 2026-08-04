# Auditoria do MVP SuportIF

Este documento resume o que esta implementado de forma real no MVP e o que ainda permanece fora do escopo.

## Fluxos reais implementados

- Login com usuario real do banco, senha com hash e sessao httpOnly.
- Redirecionamento por papel: aluno, tutor/professor e admin.
- Dashboard do aluno com XP, nivel, progresso, revisoes, badges e proximo passo.
- Matricula do aluno em trilha publica.
- Visualizacao de trilhas, modulos e missoes a partir do banco.
- Registro de atividade ao abrir missao.
- Resposta de exercicio de multipla escolha.
- Persistencia de tentativa em `ExerciseAttempt`.
- Atualizacao de `MissionProgress`.
- Concessao de XP com dedupe em `XPTransaction`.
- Criacao e conclusao de revisoes em `ReviewSchedule`.
- Envio de simulado com `SimulationAttempt` e `SimulationAnswer`.
- Calculo de resultado, pontos fortes e pontos fracos do simulado.
- Criacao de revisoes a partir de erros em simulado.
- Painel tutor com turmas, alunos, progresso, revisoes, simulados, dificuldades e sinais.
- Criacao de observacao do tutor em `TeacherNote`.
- Admin basico com criacao/edicao de trilhas, modulos, missoes, exercicios, simulados e badges.

## Tabelas principais usadas

- `User`
- `Session`
- `Profile`
- `ClassGroup`
- `ClassMembership`
- `Track`
- `Module`
- `Mission`
- `Skill`
- `ContentTag`
- `Exercise`
- `ExerciseOption`
- `ExerciseAttempt`
- `Enrollment`
- `MissionProgress`
- `ReviewSchedule`
- `Simulation`
- `SimulationQuestion`
- `SimulationAttempt`
- `SimulationAnswer`
- `XPTransaction`
- `Badge`
- `UserBadge`
- `EngagementSignal`
- `TeacherNote`
- `ActivityLog`

## Paginas com dados reais

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

## Acoes que persistem dados

- `loginAction`: valida credenciais e cria sessao.
- `logoutAction`: remove sessao.
- `startTrackAction`: cria/reativa `Enrollment`.
- `answerExerciseAction`: cria `ExerciseAttempt`, atualiza progresso, XP, badges e revisao.
- `completeReviewAction`: marca revisao como feita e concede XP com dedupe.
- `submitSimulationAction`: cria tentativa, respostas, resultado, revisoes e XP de simulado.
- `createTeacherNoteAction`: cria observacao do tutor.
- `saveTrackAction`: cria/edita trilha.
- `saveModuleAction`: cria/edita modulo.
- `saveMissionAction`: cria/edita missao.
- `saveExerciseAction`: cria/edita exercicio e alternativas.
- `saveSimulationAction`: cria/edita simulado e questoes.
- `saveBadgeAction`: cria/edita badge.

## O que ainda e placeholder ou simplificado

- Conteudo educacional do seed e demonstrativo, ficticio e nao oficial.
- Revisao espacada usa regra simples, nao algoritmo avancado.
- Engajamento usa sinais simples do seed e agregacoes basicas.
- Admin nao possui exclusao destrutiva.
- Admin nao possui editor rico nem fluxo de publicacao.
- Simulados nao possuem controle avancado de tempo.
- Badges possuem regras simples.

## Fora do MVP

- IA tutora real.
- Execucao real de codigo.
- Integracao com IFRO, SUAP, SIGAA, Moodle, IBGE ou qualquer sistema oficial.
- Importacao automatica de edital ou PDF.
- Ranking avancado.
- Chat, forum e notificacoes.
- App mobile nativo.
- Marketplace.
- Analytics avancado.

## Riscos conhecidos

- O conteudo demonstrativo deve ser substituido por material revisado antes de uso real.
- Regras de gamificacao sao simples e precisam de calibragem com usuarios reais.
- Admin basico permite edicao de conteudo, mas ainda nao possui revisao editorial.
- A remocao destrutiva foi evitada para proteger historico de progresso e tentativas.

## Validacao manual do MVP

Aluno:

1. Login como `aluno@suportif.dev`.
2. Abrir `/app`.
3. Abrir `/app/trilhas`.
4. Abrir uma trilha, modulo e missao.
5. Responder exercicio.
6. Ver feedback, XP, progresso e revisao.
7. Abrir `/app/simulados`.
8. Responder simulado e ver resultado.

Professor:

1. Login como `professor@suportif.dev`.
2. Abrir `/tutor`.
3. Abrir `/tutor/turmas`.
4. Abrir detalhe de turma e aluno.
5. Criar observacao.

Admin:

1. Login como `admin@suportif.dev`.
2. Abrir `/admin`.
3. Abrir paginas de CRUD.
4. Criar ou editar conteudo demonstrativo.
5. Confirmar bloqueio de `/admin` para aluno e professor.
