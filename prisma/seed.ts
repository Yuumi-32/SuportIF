import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";
import { calculateLevel, buildXpDedupeKey } from "../src/lib/xp/level";
import { calculateSimulationResult } from "../src/lib/simulations/results";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "suportif123";

const trackDefinitions = [
  {
    title: "Redes de Computadores",
    slug: "redes-de-computadores",
    area: "Tecnologia",
    level: "BASIC",
    coverIcon: "network",
    color: "emerald",
    description:
      "Aprenda a ler os elementos básicos de uma rede: endereços, serviços, navegação e testes simples.",
    modules: [
      "O que é uma rede de computadores?",
      "IP, máscara e gateway na prática",
      "DNS sem mistério",
      "HTTP e HTTPS no navegador",
      "Testes com ping e traceroute",
      "Portas e serviços essenciais"
    ]
  },
  {
    title: "Linux Básico",
    slug: "linux-basico",
    area: "Sistemas Operacionais",
    level: "INTRODUCTORY",
    coverIcon: "terminal",
    color: "slate",
    description:
      "Construa confiança para navegar no terminal, entender arquivos e usar comandos com segurança.",
    modules: [
      "Primeiros passos no Linux",
      "Primeiros passos no terminal Linux",
      "Comandos essenciais do dia a dia",
      "Navegação entre pastas",
      "Arquivos, donos e permissões",
      "Pipes e redirecionamento com calma"
    ]
  },
  {
    title: "Programação do Zero",
    slug: "programacao-do-zero",
    area: "Programação",
    level: "INTRODUCTORY",
    coverIcon: "code",
    color: "blue",
    description:
      "Organize o raciocínio de programação em passos pequenos, com exemplos e prática progressiva.",
    modules: [
      "Como pensar em algoritmos",
      "Variáveis e tipos de informação",
      "Decisões com condicionais",
      "Repetições com laços",
      "Funções para organizar código",
      "Listas para guardar conjuntos",
      "Mini projeto guiado"
    ]
  },
  {
    title: "Matemática para Tecnologia",
    slug: "matematica-para-tecnologia",
    area: "Matemática",
    level: "BASIC",
    coverIcon: "calculator",
    color: "violet",
    description:
      "Revise matemática aplicada a situações de tecnologia, dados, medidas e leitura de gráficos.",
    modules: [
      "Porcentagem aplicada à tecnologia",
      "Regra de três em problemas reais",
      "Unidades de medida em tecnologia",
      "Potência e notação científica",
      "Funções e gráficos na prática",
      "Lógica matemática para resolver problemas"
    ]
  },
  {
    title: "Inglês Técnico",
    slug: "ingles-tecnico",
    area: "Idiomas",
    level: "INTRODUCTORY",
    coverIcon: "book-open",
    color: "cyan",
    description:
      "Leia mensagens, interfaces e documentações curtas em inglês técnico com menos travamento.",
    modules: [
      "Termos comuns de interface",
      "Mensagens de erro no terminal",
      "Vocabulário de redes",
      "Vocabulário de programação",
      "Leitura de README sem medo"
    ]
  },
  {
    title: "Cybersegurança Inicial",
    slug: "cyberseguranca-inicial",
    area: "Segurança",
    level: "BASIC",
    coverIcon: "shield",
    color: "rose",
    description:
      "Comece por hábitos defensivos, leitura de sinais de risco e análise responsável de cenários simples.",
    modules: [
      "Ética e segurança responsável",
      "Senhas fortes e autenticação",
      "Como reconhecer phishing",
      "Leitura inicial de logs",
      "Portas e serviços sob olhar defensivo",
      "Mini desafios defensivos"
    ]
  },
  {
    title: "Concurso / Edital",
    slug: "concurso-edital",
    area: "Estudos por edital",
    level: "INTRODUCTORY",
    coverIcon: "file-text",
    color: "amber",
    description:
      "Simule uma organização genérica de estudos por edital, sem conteúdo oficial ou prova real.",
    modules: [
      "Como cadastrar um edital fictício",
      "Disciplinas e blocos de estudo",
      "Assuntos priorizados",
      "Questões como prática",
      "Simulados para medir ritmo",
      "Como transformar estudo em rotina"
    ]
  }
] as const;

const modulePresentation: Record<
  string,
  {
    title: string;
    shortDescription: string;
    objective: string;
    quickExplanation: string;
    detailedExplanation: string;
    analogy: string;
    practicalExample: string;
    guidedExercisePrompt: string;
    challengePrompt: string;
    summary: string;
    attentionPoints?: string[];
  }
> = {
  "O que é uma rede de computadores?": {
    title: "O que é uma rede de computadores?",
    shortDescription: "Entenda como dispositivos trocam informações em um cenário simples e fictício.",
    objective: "Reconhecer a ideia de rede como conexão entre dispositivos que precisam se comunicar.",
    quickExplanation:
      "Uma rede conecta computadores, celulares, servidores e outros dispositivos para que eles troquem dados.",
    detailedExplanation:
      "Nesta missão demonstrativa, a rede aparece como um conjunto de dispositivos ligados por regras de comunicação. O foco é entender a ideia, não decorar normas ou equipamentos específicos.",
    analogy:
      "Pense em uma rede como uma pequena cidade: cada dispositivo tem um endereço e as mensagens precisam encontrar o caminho certo.",
    practicalExample:
      "Um notebook envia uma solicitação ao roteador, que encaminha a comunicação até um serviço na internet e traz a resposta de volta.",
    guidedExercisePrompt: "Qual descrição combina melhor com uma rede de computadores?",
    challengePrompt: "Em um laboratório fictício, escolha a situação que realmente exige comunicação em rede.",
    summary: "Rede é a base para dispositivos compartilharem dados, serviços e acesso a outros sistemas."
  },
  "IP, máscara e gateway na prática": {
    title: "IP, máscara e gateway na prática",
    shortDescription: "Veja o papel de endereço, rede local e saída para outras redes.",
    objective: "Diferenciar IP, máscara e gateway em um cenário doméstico demonstrativo.",
    quickExplanation:
      "IP identifica um dispositivo. Máscara indica qual parte do endereço pertence à rede. Gateway é o caminho usado para sair da rede local.",
    detailedExplanation:
      "Pense no IP como o endereço de uma casa. A máscara mostra qual é o bairro. O gateway é a saída principal para falar com outros bairros.",
    analogy:
      "Em um bairro fictício, o IP é a casa, a máscara delimita o bairro e o gateway é a avenida que leva para fora dele.",
    practicalExample:
      "Seu computador 192.168.1.10 usa o roteador 192.168.1.1 como gateway para acessar a internet.",
    guidedExercisePrompt: "Em uma rede doméstica demonstrativa, qual endereço normalmente representa o gateway?",
    challengePrompt:
      "Dado um cenário com IP, máscara e gateway fictícios, identifique qual configuração está incoerente.",
    summary: "IP identifica, máscara define a rede e gateway permite comunicação com outras redes.",
    attentionPoints: [
      "Não confundir gateway com DNS.",
      "A mesma rede local precisa de endereços compatíveis.",
      "Os números usados aqui são apenas exemplos demonstrativos."
    ]
  },
  "Primeiros passos no terminal Linux": {
    title: "Primeiros passos no terminal Linux",
    shortDescription: "Ganhe familiaridade com comandos curtos e leitura de respostas do terminal.",
    objective: "Entender o terminal como uma forma direta de conversar com o sistema.",
    quickExplanation:
      "O terminal recebe comandos em texto e devolve respostas que ajudam a navegar, listar arquivos e executar tarefas.",
    detailedExplanation:
      "A missão mostra o terminal como uma ferramenta de estudo. Antes de comandos avançados, importa saber onde você está, o que existe na pasta atual e como ler mensagens simples.",
    analogy:
      "É como pedir instruções por escrito: você envia uma frase objetiva e o sistema responde com o resultado ou com um aviso.",
    practicalExample: "Ao digitar `pwd`, o usuário vê a pasta atual; com `ls`, vê os itens daquele local.",
    guidedExercisePrompt: "Qual comando demonstrativo ajuda a descobrir a pasta atual?",
    challengePrompt: "Escolha a sequência mais coerente para se orientar antes de abrir um arquivo fictício.",
    summary: "Terminal é uma interface de texto útil para navegar, executar comandos e entender o sistema."
  },
  "Porcentagem aplicada à tecnologia": {
    title: "Porcentagem aplicada à tecnologia",
    shortDescription: "Use porcentagem para interpretar progresso, acertos, uso de recurso e comparações.",
    objective: "Aplicar porcentagem em situações simples de estudo e tecnologia.",
    quickExplanation:
      "Porcentagem mostra uma parte em relação a 100. Ela ajuda a comparar desempenho, progresso e uso de recursos.",
    detailedExplanation:
      "Nesta missão, porcentagem aparece como linguagem para medir avanço. Se 8 de 10 questões foram corretas, o resultado é 80%.",
    analogy:
      "Imagine uma barra de progresso: quando metade está preenchida, ela representa 50% do caminho.",
    practicalExample: "Um simulado com 15 acertos em 20 questões corresponde a 75% de acerto.",
    guidedExercisePrompt: "Se uma missão tem 4 etapas e 3 foram concluídas, qual porcentagem representa o progresso?",
    challengePrompt: "Escolha a interpretação correta para um painel fictício com 60% de acertos.",
    summary: "Porcentagem transforma partes de um todo em uma medida fácil de comparar."
  },
  "Como transformar estudo em rotina": {
    title: "Como transformar estudo em rotina",
    shortDescription: "Organize revisões e simulados em um ciclo pequeno, repetível e realista.",
    objective: "Reconhecer uma rotina de estudo simples baseada em prática, revisão e ajuste.",
    quickExplanation:
      "Uma rotina boa combina estudo curto, exercício, revisão do erro e novo teste depois de algum tempo.",
    detailedExplanation:
      "A missão usa um edital fictício para demonstrar organização. Não há conteúdo oficial: o objetivo é validar o fluxo de rotina dentro da plataforma.",
    analogy:
      "É como treinar uma música: tocar um pouco, corrigir o trecho difícil e voltar nele depois.",
    practicalExample:
      "O estudante faz uma missão curta hoje, agenda revisão para amanhã e usa o próximo simulado para medir evolução.",
    guidedExercisePrompt: "Qual sequência representa uma rotina de estudo mais sustentável?",
    challengePrompt: "Escolha o ajuste mais adequado para um estudante fictício com revisões atrasadas.",
    summary: "Rotina de estudo nasce de ciclos pequenos: aprender, praticar, revisar e medir novamente."
  }
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function buildMissionContent(trackTitle: string, moduleTitle: string) {
  const preparedContent = modulePresentation[moduleTitle];

  if (preparedContent) {
    return {
      ...preparedContent,
      slug: slugify(preparedContent.title),
      attentionPoints: [
        "Conteúdo demonstrativo e não oficial.",
        ...(preparedContent.attentionPoints ?? [
          "Use os cenários desta plataforma apenas como apoio visual.",
          "Valide conteúdo real depois com material fornecido pelo usuário."
        ])
      ]
    };
  }

  return {
    title: moduleTitle,
    slug: slugify(moduleTitle),
    shortDescription: `Uma missão curta da trilha ${trackTitle}, criada para demonstrar o fluxo de estudo.`,
    objective: `Entender a ideia principal de ${moduleTitle} em uma situação simples e fictícia.`,
    quickExplanation: `${moduleTitle} aparece aqui como um passo pequeno da jornada, com foco em clareza antes de profundidade.`,
    detailedExplanation: `A missão apresenta ${moduleTitle} por meio de uma explicação guiada, exemplo curto e exercício de fixação. O conteúdo continua demonstrativo e não representa ementa, edital ou material oficial.`,
    analogy: `Pense neste tema como uma placa no caminho: ela ajuda você a saber qual direção tomar antes de seguir para a próxima etapa.`,
    practicalExample: `Um estudante lê a explicação, responde uma questão curta sobre ${moduleTitle} e usa o feedback para decidir se revisa ou avança.`,
    guidedExercisePrompt: `Qual alternativa descreve melhor a função de ${moduleTitle} no cenário apresentado?`,
    challengePrompt: `Escolha a aplicação mais coerente de ${moduleTitle} em uma situação fictícia de estudo.`,
    summary: `${moduleTitle} foi trabalhado como uma etapa inicial, com prática curta e feedback imediato.`,
    attentionPoints: [
      "Conteúdo demonstrativo, fictício e não oficial.",
      "Validar conteúdo real posteriormente com material fornecido pelo usuário.",
      "As atividades servem para validar experiência, progresso e revisão."
    ]
  };
}

async function resetDatabase() {
  await prisma.simulationAnswer.deleteMany();
  await prisma.simulationAttempt.deleteMany();
  await prisma.simulationQuestion.deleteMany();
  await prisma.simulation.deleteMany();
  await prisma.exerciseAttempt.deleteMany();
  await prisma.exerciseOption.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.reviewSchedule.deleteMany();
  await prisma.userSkillProgress.deleteMany();
  await prisma.missionProgress.deleteMany();
  await prisma.xPTransaction.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.engagementSignal.deleteMany();
  await prisma.teacherNote.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.missionPrerequisite.deleteMany();
  await prisma.missionTag.deleteMany();
  await prisma.missionSkill.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.module.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.track.deleteMany();
  await prisma.contentTag.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.classMembership.deleteMany();
  await prisma.classGroup.deleteMany();
  await prisma.examTopic.deleteMany();
  await prisma.examSubject.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.session.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await resetDatabase();

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  async function createUser(input: {
    name: string;
    email: string;
    role: "STUDENT" | "TEACHER" | "ADMIN";
    totalXp: number;
    streak: number;
    lastLoginDaysAgo?: number;
  }) {
    return prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        lastLoginAt:
          input.lastLoginDaysAgo === undefined ? new Date() : daysFromNow(-input.lastLoginDaysAgo),
        profile: {
          create: {
            totalXp: input.totalXp,
            level: calculateLevel(input.totalXp),
            streak: input.streak,
            bio: "Perfil demonstrativo, fictício e não oficial para validação local do MVP."
          }
        }
      },
      include: { profile: true }
    });
  }

  const admin = await createUser({
    name: "Admin SuportIF",
    email: "admin@suportif.dev",
    role: "ADMIN",
    totalXp: 0,
    streak: 0
  });

  const teacher = await createUser({
    name: "Prof. Marina Costa",
    email: "professor@suportif.dev",
    role: "TEACHER",
    totalXp: 0,
    streak: 0
  });

  const students = [
    await createUser({
      name: "Lucas Andrade",
      email: "aluno@suportif.dev",
      role: "STUDENT",
      totalXp: 760,
      streak: 4,
      lastLoginDaysAgo: 1
    }),
    await createUser({
      name: "Ana Ribeiro",
      email: "ana.demo@suportif.dev",
      role: "STUDENT",
      totalXp: 340,
      streak: 2,
      lastLoginDaysAgo: 3
    }),
    await createUser({
      name: "Bruno Martins",
      email: "bruno.demo@suportif.dev",
      role: "STUDENT",
      totalXp: 120,
      streak: 0,
      lastLoginDaysAgo: 12
    }),
    await createUser({
      name: "Carla Nunes",
      email: "carla.demo@suportif.dev",
      role: "STUDENT",
      totalXp: 520,
      streak: 5,
      lastLoginDaysAgo: 0
    }),
    await createUser({
      name: "Diego Souza",
      email: "diego.demo@suportif.dev",
      role: "STUDENT",
      totalXp: 80,
      streak: 0,
      lastLoginDaysAgo: 20
    })
  ];

  const classGroup = await prisma.classGroup.create({
    data: {
      name: "Turma Demonstrativa SuportIF",
      description:
        "Turma fictícia para validar acompanhamento de engajamento e progresso. Não representa turma real.",
      isDemo: true
    }
  });

  await prisma.classMembership.createMany({
    data: [
      { userId: teacher.id, classGroupId: classGroup.id, roleInClass: "TEACHER" },
      ...students.map((student) => ({
        userId: student.id,
        classGroupId: classGroup.id,
        roleInClass: "STUDENT" as const
      }))
    ]
  });

  const tags = await Promise.all(
    [
      ["Demonstrativo", "demonstrativo"],
      ["Fictício", "ficticio"],
      ["Não oficial", "nao-oficial"],
      ["Fundamentos", "fundamentos"],
      ["Revisão", "revisao"]
    ].map(([name, slug]) =>
      prisma.contentTag.create({
        data: {
          name,
          slug
        }
      })
    )
  );

  const missions: Array<{
    trackSlug: string;
    moduleSlug: string;
    missionId: string;
    skillId: string;
    skillSlug: string;
    exercises: Array<{ id: string; correctOptionId: string; wrongOptionId: string }>;
  }> = [];

  const tracks = new Map<string, { id: string; slug: string }>();
  let previousMissionIdByTrack = new Map<string, string>();

  for (const trackDefinition of trackDefinitions) {
    const track = await prisma.track.create({
      data: {
        title: trackDefinition.title,
        slug: trackDefinition.slug,
        description: `${trackDefinition.description} Conteúdo demonstrativo, fictício e não oficial.`,
        area: trackDefinition.area,
        level: trackDefinition.level,
        coverIcon: trackDefinition.coverIcon,
        color: trackDefinition.color,
        isPublic: true,
        isDemo: true
      }
    });
    tracks.set(track.slug, track);

    for (const [moduleIndex, moduleTitle] of trackDefinition.modules.entries()) {
      const moduleSlug = slugify(moduleTitle);
      const trackModule = await prisma.module.create({
        data: {
          trackId: track.id,
          title: moduleTitle,
          slug: moduleSlug,
          description: `Uma etapa curta para estudar ${moduleTitle} com explicação, exemplo e prática demonstrativa.`,
          order: moduleIndex + 1,
          isDemo: true
        }
      });

      const skill = await prisma.skill.create({
        data: {
          name: moduleTitle,
          slug: `${track.slug}-${moduleSlug}`,
          description: `Habilidade demonstrativa vinculada a ${moduleTitle}, sem conteúdo oficial cadastrado.`
        }
      });

      const missionContent = buildMissionContent(track.title, moduleTitle);
      const mission = await prisma.mission.create({
        data: {
          moduleId: trackModule.id,
          title: missionContent.title,
          slug: missionContent.slug,
          shortDescription: missionContent.shortDescription,
          objective: missionContent.objective,
          quickExplanation: missionContent.quickExplanation,
          detailedExplanation: missionContent.detailedExplanation,
          analogy: missionContent.analogy,
          practicalExample: missionContent.practicalExample,
          guidedExercisePrompt: missionContent.guidedExercisePrompt,
          challengePrompt: missionContent.challengePrompt,
          summary: missionContent.summary,
          attentionPoints: missionContent.attentionPoints,
          difficulty: moduleIndex === 0 ? "INTRODUCTORY" : "BASIC",
          xpReward: moduleIndex === 0 ? 40 : 60,
          estimatedMinutes: 8 + moduleIndex,
          order: 1,
          isDemo: true,
          skills: {
            create: {
              skillId: skill.id
            }
          },
          tags: {
            create: tags.map((tag) => ({ tagId: tag.id }))
          }
        }
      });

      const previousMissionId = previousMissionIdByTrack.get(track.slug);
      if (previousMissionId) {
        await prisma.missionPrerequisite.create({
          data: {
            missionId: mission.id,
            prerequisiteId: previousMissionId
          }
        });
      }
      previousMissionIdByTrack = new Map(previousMissionIdByTrack).set(track.slug, mission.id);

      const guidedExercise = await prisma.exercise.create({
        data: {
          missionId: mission.id,
          type: "MULTIPLE_CHOICE",
          prompt: missionContent.guidedExercisePrompt,
          explanation:
            "Use a explicação da missão para escolher a alternativa mais coerente neste cenário fictício.",
          difficulty: moduleIndex === 0 ? "INTRODUCTORY" : "BASIC",
          skillId: skill.id,
          order: 1,
          isDemo: true,
          options: {
            create: [
              {
                text: `A alternativa que conecta ${moduleTitle} ao objetivo estudado na missão.`,
                isCorrect: true,
                feedback: "Correto. Você conectou a explicação ao cenário proposto."
              },
              {
                text: `Uma resposta que mistura ${moduleTitle} com outro assunto sem relação direta.`,
                isCorrect: false,
                feedback: "Ainda não. Volte na explicação mastigada e procure a relação principal."
              },
              {
                text: "Uma resposta que usa uma informação que não foi apresentada na missão.",
                isCorrect: false,
                feedback: "Use apenas as informações apresentadas no cenário da plataforma."
              }
            ]
          }
        },
        include: { options: true }
      });

      const challengeExercise = await prisma.exercise.create({
        data: {
          missionId: mission.id,
          type: "MULTIPLE_CHOICE",
          prompt: missionContent.challengePrompt,
          explanation:
            "Tente resolver sem ajuda. A resposta é validada pelas alternativas cadastradas no banco.",
          difficulty: "BASIC",
          skillId: skill.id,
          order: 2,
          isDemo: true,
          options: {
            create: [
              {
                text: `Aplicar ${moduleTitle} ao cenário apresentado na missão.`,
                isCorrect: true,
                feedback: "Correto. A decisão segue o cenário e mostra boa leitura do problema."
              },
              {
                text: "Ignorar os dados da missão e escolher uma conclusão sem apoio no cenário.",
                isCorrect: false,
                feedback: "Volte ao enunciado e use os dados que aparecem na tela."
              },
              {
                text: "Tentar resolver por um caminho que não faz parte desta atividade.",
                isCorrect: false,
                feedback: "Esta atividade é resolvida pela leitura do cenário e das alternativas."
              }
            ]
          }
        },
        include: { options: true }
      });

      missions.push({
        trackSlug: track.slug,
        moduleSlug,
        missionId: mission.id,
        skillId: skill.id,
        skillSlug: skill.slug,
        exercises: [guidedExercise, challengeExercise].map((exercise) => ({
          id: exercise.id,
          correctOptionId: exercise.options.find((option) => option.isCorrect)?.id ?? exercise.options[0].id,
          wrongOptionId: exercise.options.find((option) => !option.isCorrect)?.id ?? exercise.options[0].id
        }))
      });
    }
  }

  const badges = await Promise.all(
    [
      {
        title: "Primeira Missão",
        slug: "primeira-missao",
        description: "Badge demonstrativa por concluir a primeira missão.",
        icon: "sparkle",
        rule: "Completar uma missão demonstrativa."
      },
      {
        title: "Revisão em Dia",
        slug: "revisao-em-dia",
        description: "Badge demonstrativa por concluir uma revisão.",
        icon: "calendar-check",
        rule: "Finalizar uma revisão pendente."
      },
      {
        title: "Simulado Concluído",
        slug: "simulado-concluido",
        description: "Badge demonstrativa por finalizar um simulado.",
        icon: "clipboard-check",
        rule: "Enviar um simulado básico."
      },
      {
        title: "Consistência",
        slug: "consistencia",
        description: "Badge demonstrativa por manter uma sequência curta de estudo.",
        icon: "flame",
        rule: "Manter streak demonstrativo maior que três."
      },
      {
        title: "Superação",
        slug: "superacao",
        description: "Badge demonstrativa por melhorar em uma habilidade fraca.",
        icon: "trending-up",
        rule: "Melhorar desempenho em assunto marcado como fraco."
      }
    ].map((badge) =>
      prisma.badge.create({
        data: {
          ...badge,
          isDemo: true
        }
      })
    )
  );

  const enrollmentPlan = [
    { student: students[0], trackSlugs: ["redes-de-computadores", "linux-basico", "programacao-do-zero"] },
    { student: students[1], trackSlugs: ["linux-basico", "matematica-para-tecnologia"] },
    { student: students[2], trackSlugs: ["redes-de-computadores", "cyberseguranca-inicial"] },
    { student: students[3], trackSlugs: ["ingles-tecnico", "programacao-do-zero"] },
    { student: students[4], trackSlugs: ["concurso-edital", "matematica-para-tecnologia"] }
  ];

  for (const plan of enrollmentPlan) {
    for (const trackSlug of plan.trackSlugs) {
      const track = tracks.get(trackSlug);
      if (!track) continue;
      await prisma.enrollment.create({
        data: {
          userId: plan.student.id,
          trackId: track.id,
          status: "ACTIVE",
          startedAt: daysFromNow(-8)
        }
      });
    }
  }

  const progressPlan = [
    { student: students[0], completed: 8, inProgress: 3 },
    { student: students[1], completed: 4, inProgress: 2 },
    { student: students[2], completed: 2, inProgress: 2 },
    { student: students[3], completed: 6, inProgress: 1 },
    { student: students[4], completed: 1, inProgress: 1 }
  ];

  for (const plan of progressPlan) {
    const plannedMissions = missions.slice(0, plan.completed + plan.inProgress);

    for (const [index, mission] of plannedMissions.entries()) {
      const completed = index < plan.completed;
      await prisma.missionProgress.create({
        data: {
          userId: plan.student.id,
          missionId: mission.missionId,
          status: completed ? "COMPLETED" : "IN_PROGRESS",
          masteryStatus: completed ? (index % 3 === 0 ? "MASTERED" : "PROFICIENT") : "IN_PROGRESS",
          completedAt: completed ? daysFromNow(-Math.max(1, plan.completed - index)) : null,
          lastStudiedAt: daysFromNow(-Math.max(0, plan.completed - index)),
          attemptsCount: completed ? 2 : 1,
          correctCount: completed ? 2 : 0
        }
      });

      await prisma.userSkillProgress.upsert({
        where: {
          userId_skillId: {
            userId: plan.student.id,
            skillId: mission.skillId
          }
        },
        update: {
          masteryStatus: completed ? "PROFICIENT" : "IN_PROGRESS",
          score: completed ? 80 : 35,
          lastPracticedAt: daysFromNow(-1)
        },
        create: {
          userId: plan.student.id,
          skillId: mission.skillId,
          masteryStatus: completed ? "PROFICIENT" : "IN_PROGRESS",
          score: completed ? 80 : 35,
          lastPracticedAt: daysFromNow(-1)
        }
      });

      for (const [exerciseIndex, exercise] of mission.exercises.entries()) {
        const correct = completed || exerciseIndex === 0;
        const selectedOptionId = correct ? exercise.correctOptionId : exercise.wrongOptionId;
        await prisma.exerciseAttempt.create({
          data: {
            userId: plan.student.id,
            exerciseId: exercise.id,
            selectedOptionId,
            isCorrect: correct,
            feedback: correct
              ? "Resposta correta registrada no cenário demonstrativo."
              : "Resposta incorreta registrada para demonstrar revisão e feedback."
          }
        });
      }

      if (completed) {
        await prisma.xPTransaction.create({
          data: {
            userId: plan.student.id,
            amount: 60,
            reason: "MISSION_COMPLETED",
            referenceType: "MISSION",
            referenceId: mission.missionId,
            dedupeKey: buildXpDedupeKey(plan.student.id, "MISSION_COMPLETED", mission.missionId)
          }
        });
      }
    }
  }

  await prisma.userBadge.createMany({
    data: [
      { userId: students[0].id, badgeId: badges[0].id, earnedAt: daysFromNow(-7) },
      { userId: students[0].id, badgeId: badges[2].id, earnedAt: daysFromNow(-2) },
      { userId: students[0].id, badgeId: badges[3].id, earnedAt: daysFromNow(-1) },
      { userId: students[1].id, badgeId: badges[0].id, earnedAt: daysFromNow(-4) },
      { userId: students[3].id, badgeId: badges[0].id, earnedAt: daysFromNow(-5) },
      { userId: students[3].id, badgeId: badges[3].id, earnedAt: daysFromNow(-1) }
    ]
  });

  await prisma.reviewSchedule.createMany({
    data: [
      {
        userId: students[0].id,
        missionId: missions[1].missionId,
        skillId: missions[1].skillId,
        dueAt: daysFromNow(1),
        intervalDays: 1,
        status: "PENDING"
      },
      {
        userId: students[0].id,
        missionId: missions[2].missionId,
        skillId: missions[2].skillId,
        dueAt: daysFromNow(-1),
        intervalDays: 3,
        status: "OVERDUE"
      },
      {
        userId: students[1].id,
        missionId: missions[3].missionId,
        skillId: missions[3].skillId,
        dueAt: daysFromNow(2),
        intervalDays: 1,
        status: "PENDING"
      },
      {
        userId: students[2].id,
        missionId: missions[4].missionId,
        skillId: missions[4].skillId,
        dueAt: daysFromNow(-4),
        intervalDays: 7,
        status: "OVERDUE"
      },
      {
        userId: students[3].id,
        missionId: missions[5].missionId,
        skillId: missions[5].skillId,
        dueAt: daysFromNow(-2),
        intervalDays: 3,
        status: "DONE",
        completedAt: daysFromNow(-1)
      }
    ]
  });

  const simulationDefinitions = [
    {
      title: "Diagnóstico rápido de Redes",
      description: "Simulado fictício e não oficial para medir leitura inicial de fundamentos de rede.",
      type: "TRACK" as const,
      trackSlug: "redes-de-computadores",
      exercises: missions
        .filter((mission) => mission.trackSlug === "redes-de-computadores")
        .flatMap((mission) => mission.exercises)
        .slice(0, 6)
    },
    {
      title: "Prática mista de tecnologia",
      description: "Simulado fictício com assuntos variados para validar revisão, resultado e progresso.",
      type: "MIXED" as const,
      trackSlug: undefined,
      exercises: missions.flatMap((mission) => mission.exercises).slice(0, 8)
    },
    {
      title: "Ritmo de estudo por edital fictício",
      description: "Estrutura genérica de simulado. Não contém conteúdo real de concurso.",
      type: "DEMO_EXAM" as const,
      trackSlug: "concurso-edital",
      exercises: missions
        .filter((mission) => mission.trackSlug === "concurso-edital")
        .flatMap((mission) => mission.exercises)
        .slice(0, 6)
    }
  ];

  const createdSimulations = [];
  for (const simulationDefinition of simulationDefinitions) {
    const track = simulationDefinition.trackSlug ? tracks.get(simulationDefinition.trackSlug) : undefined;
    const simulation = await prisma.simulation.create({
      data: {
        title: simulationDefinition.title,
        description: simulationDefinition.description,
        type: simulationDefinition.type,
        trackId: track?.id,
        isDemo: true,
        questions: {
          create: simulationDefinition.exercises.map((exercise, index) => ({
            exerciseId: exercise.id,
            order: index + 1
          }))
        }
      }
    });
    createdSimulations.push({ simulation, exercises: simulationDefinition.exercises });
  }

  const firstSimulation = createdSimulations[0];
  const firstSimulationAnswers = firstSimulation.exercises.map((exercise, index) => {
    const mission = missions.find((item) => item.exercises.some((missionExercise) => missionExercise.id === exercise.id));
    return {
      exercise,
      skillSlug: mission?.skillSlug ?? "habilidade-demonstrativa",
      isCorrect: index < 4
    };
  });
  const simulationResult = calculateSimulationResult(firstSimulationAnswers);

  const simulationAttempt = await prisma.simulationAttempt.create({
    data: {
      userId: students[0].id,
      simulationId: firstSimulation.simulation.id,
      startedAt: daysFromNow(-2),
      finishedAt: daysFromNow(-2),
      score: simulationResult.score,
      correctCount: simulationResult.correctCount,
      wrongCount: simulationResult.wrongCount,
      strongSkillsJson: simulationResult.strongSkills,
      weakSkillsJson: simulationResult.weakSkills
    }
  });

  await prisma.simulationAnswer.createMany({
    data: firstSimulationAnswers.map((answer) => ({
      attemptId: simulationAttempt.id,
      exerciseId: answer.exercise.id,
      selectedOptionId: answer.isCorrect ? answer.exercise.correctOptionId : answer.exercise.wrongOptionId,
      isCorrect: answer.isCorrect
    }))
  });

  await prisma.engagementSignal.createMany({
    data: [
      {
        userId: students[0].id,
        classGroupId: classGroup.id,
        type: "OVERDUE_REVIEWS",
        severity: "ATTENTION",
        message: "Aluno com revisão demonstrativa atrasada.",
        suggestedAction: "Recomendar revisão curta antes da próxima missão."
      },
      {
        userId: students[2].id,
        classGroupId: classGroup.id,
        type: "INACTIVE",
        severity: "ATTENTION",
        message: "Aluno sem acesso recente no ambiente demonstrativo.",
        suggestedAction: "Chamar para monitoria ou indicar missão mastigada."
      },
      {
        userId: students[4].id,
        classGroupId: classGroup.id,
        type: "ABANDONED_TRACK",
        severity: "HIGH_RISK",
        message: "Trilha iniciada e sem continuidade no seed demonstrativo.",
        suggestedAction: "Recomendar trilha de fundamentos e simplificar o desafio."
      },
      {
        userId: students[3].id,
        classGroupId: classGroup.id,
        type: "MISSING_SIMULATION",
        severity: "NORMAL",
        message: "Aluno ainda não fez simulado diagnóstico demonstrativo.",
        suggestedAction: "Indicar simulado básico quando concluir mais uma missão."
      }
    ]
  });

  await prisma.teacherNote.create({
    data: {
      teacherId: teacher.id,
      studentId: students[2].id,
      note: "Observação fictícia: sugerir revisão guiada de fundamentos antes de avançar."
    }
  });

  const exam = await prisma.exam.create({
    data: {
      title: "Edital demonstrativo genérico",
      description: "Estrutura fictícia para validar cadastro de edital. Não representa edital real.",
      organization: "Organização fictícia",
      isDemo: true,
      subjects: {
        create: [
          {
            title: "Disciplina demonstrativa",
            order: 1,
            topics: {
              create: [
                { title: "Assunto demonstrativo", order: 1 },
                { title: "Questões demonstrativas", order: 2 }
              ]
            }
          }
        ]
      }
    }
  });

  await prisma.activityLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "SEED_ADMIN_CREATED",
        entityType: "USER",
        entityId: admin.id
      },
      {
        userId: teacher.id,
        action: "SEED_CLASS_READY",
        entityType: "CLASS_GROUP",
        entityId: classGroup.id
      },
      {
        userId: students[0].id,
        action: "SEED_SIMULATION_ATTEMPT",
        entityType: "SIMULATION",
        entityId: firstSimulation.simulation.id
      },
      {
        userId: admin.id,
        action: "SEED_EXAM_STRUCTURE",
        entityType: "EXAM",
        entityId: exam.id
      }
    ]
  });

  console.log("Seed demonstrativo concluído.");
  console.log("Usuários locais: admin@suportif.dev, professor@suportif.dev, aluno@suportif.dev");
  console.log(`Senha local: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
