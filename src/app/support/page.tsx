import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { listMyTicketsAction } from "@/modules/support";
import { createTicketAction } from "@/modules/support";
import { CreateTicketForm } from "@/components/create-ticket-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tickets = await listMyTicketsAction();

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Support</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Open a ticket</CardTitle>
          <CardDescription>Describe your issue and we will get back to you.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTicketForm action={createTicketAction} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no tickets yet.</p>
          ) : (
            <ul className="divide-y">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{ticket.title}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{ticket.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{ticket.category}</p>
                  {ticket.comments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {ticket.comments
                        .filter((c) => !c.isInternal)
                        .map((comment) => (
                          <p key={comment.id} className="text-sm">
                            <span className="font-medium">{comment.userEmail}:</span> {comment.message}
                          </p>
                        ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
