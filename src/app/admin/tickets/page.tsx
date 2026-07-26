import { listAllTicketsAction, getTicketByIdAction, updateTicketAction, addTicketCommentAction } from "@/modules/support";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketStatusForm, TicketCommentForm } from "@/components/ticket-detail-forms";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const tickets = await listAllTicketsAction();
  const selected = params.id ? await getTicketByIdAction(params.id) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
          <CardDescription>{tickets.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets yet.</p>
          ) : (
            <ul className="divide-y">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="py-2">
                  <a href={`/admin/tickets?id=${ticket.id}`} className="block text-sm hover:underline">
                    <span className="font-medium">{ticket.title}</span>
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">{ticket.status}</span>
                    <span className="block text-xs text-muted-foreground">{ticket.userEmail}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Ticket detail</CardTitle>
        </CardHeader>
        <CardContent>
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a ticket to view details.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded border px-2 py-1">{selected.status}</span>
                <span className="rounded border px-2 py-1">{selected.priority}</span>
                <span className="rounded border px-2 py-1">{selected.category}</span>
                <span className="text-muted-foreground">by {selected.userEmail}</span>
              </div>
              <h2 className="text-lg font-medium">{selected.title}</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.description}</p>

              <TicketStatusForm ticketId={selected.id} status={selected.status} action={updateTicketAction} />

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Comments</h3>
                {selected.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {selected.comments.map((comment) => (
                      <li key={comment.id} className="rounded border p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{comment.userEmail}</span>
                          {comment.isInternal && (
                            <span className="text-xs text-muted-foreground">internal</span>
                          )}
                        </div>
                        <p className="text-muted-foreground">{comment.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <TicketCommentForm ticketId={selected.id} action={addTicketCommentAction} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
