import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { listMyTicketsAction } from "@/modules/support";
import { createTicketAction } from "@/modules/support";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CreateTicketForm } from "@/components/create-ticket-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket } from "lucide-react";

export default async function SupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tickets = await listMyTicketsAction();

  return (
    <div className="page-container">
      <div className="container max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Support"
          description="Create support tickets and track their status."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Support" },
          ]}
        />

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>Open a ticket</CardTitle>
              <CardDescription>Describe your issue and we will get back to you.</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateTicketForm action={createTicketAction} />
            </CardContent>
          </Card>
        </div>

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>My tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <EmptyState
                  icon={Ticket}
                  title="No tickets yet"
                  description="Create a support ticket to get help with issues or questions."
                />
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
        </div>
      </div>
    </div>
  );
}
