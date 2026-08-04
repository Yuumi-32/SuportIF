import { prisma } from "@/lib/prisma/client";

export async function getStudentSimulations(userId: string) {
  return prisma.simulation.findMany({
    include: {
      track: true,
      module: true,
      questions: {
        select: {
          id: true
        }
      },
      attempts: {
        where: {
          userId
        },
        orderBy: {
          finishedAt: "desc"
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });
}

export async function getStudentSimulation(userId: string, simulationId: string) {
  return prisma.simulation.findUnique({
    where: {
      id: simulationId
    },
    include: {
      track: true,
      module: true,
      attempts: {
        where: {
          userId
        },
        orderBy: {
          finishedAt: "desc"
        },
        take: 5
      },
      questions: {
        orderBy: {
          order: "asc"
        },
        include: {
          exercise: {
            include: {
              mission: {
                include: {
                  module: {
                    include: {
                      track: true
                    }
                  }
                }
              },
              options: {
                select: {
                  id: true,
                  text: true
                },
                orderBy: {
                  id: "asc"
                }
              }
            }
          }
        }
      }
    }
  });
}

export async function getStudentSimulationResult(
  userId: string,
  simulationId: string,
  attemptId?: string
) {
  return prisma.simulationAttempt.findFirst({
    where: {
      userId,
      simulationId,
      ...(attemptId ? { id: attemptId } : {})
    },
    include: {
      simulation: {
        include: {
          questions: {
            select: {
              id: true
            }
          }
        }
      },
      answers: {
        include: {
          selectedOption: {
            select: {
              id: true,
              text: true,
              isCorrect: true,
              feedback: true
            }
          },
          exercise: {
            include: {
              skill: true,
              mission: {
                include: {
                  module: {
                    include: {
                      track: true
                    }
                  }
                }
              },
              options: {
                where: {
                  isCorrect: true
                },
                select: {
                  id: true,
                  text: true,
                  feedback: true
                },
                take: 1
              }
            }
          }
        },
        orderBy: {
          id: "asc"
        }
      }
    },
    orderBy: {
      finishedAt: "desc"
    }
  });
}

export async function getSimulationReviewRecommendations(
  userId: string,
  missionSkillPairs: Array<{ missionId: string; skillId?: string | null }>
) {
  if (missionSkillPairs.length === 0) {
    return [];
  }

  return prisma.reviewSchedule.findMany({
    where: {
      userId,
      status: {
        in: ["PENDING", "OVERDUE"]
      },
      OR: missionSkillPairs.map((pair) => ({
        missionId: pair.missionId,
        skillId: pair.skillId ?? null
      }))
    },
    include: {
      skill: true,
      mission: {
        include: {
          module: {
            include: {
              track: true
            }
          }
        }
      }
    },
    orderBy: {
      dueAt: "asc"
    }
  });
}

export async function getSimulationAttemptHistory(userId: string, simulationId: string) {
  return prisma.simulationAttempt.findMany({
    where: {
      userId,
      simulationId
    },
    select: {
      id: true,
      score: true,
      finishedAt: true,
      startedAt: true
    },
    orderBy: {
      finishedAt: "asc"
    }
  });
}
