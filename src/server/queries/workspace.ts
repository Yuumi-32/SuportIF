import { prisma } from "@/lib/prisma/client";

export async function getWorkspaceData(userId: string) {
  const [events, notes] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: [{ dateKey: "asc" }, { time: "asc" }]
    }),
    prisma.studyNote.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  return {
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      dateKey: event.dateKey,
      time: event.time,
      type: event.type
    })),
    notes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      folder: note.folder,
      color: note.color
    }))
  };
}
