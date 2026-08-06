import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { listChatSessionsAction } from "@/modules/ai";
import { ChatInterface } from "@/components/chat-interface";

export default async function ChatPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user || !user.userId) {
    redirect("/login");
  }

  const projectId = user.projectId;
  if (!projectId) {
    redirect("/stores");
  }

  const { items: sessions } = await listChatSessionsAction(projectId);

  return (
    <main className="h-[calc(100vh-4rem)]">
      <ChatInterface projectId={projectId} initialSessions={sessions} />
    </main>
  );
}
