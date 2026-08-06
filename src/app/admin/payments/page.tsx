import { requireSuperAdmin } from "@/modules/auth";
import { listPaymentInvoicesAction } from "@/modules/workspaces";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefundButton } from "@/components/refund-button";

export default async function AdminPaymentsPage() {
  await requireSuperAdmin();
  const { items } = await listPaymentInvoicesAction();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment management</CardTitle>
          <CardDescription>View paid invoices and issue refunds.</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid invoices found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Organization</th>
                    <th className="text-left py-2 px-2">Invoice</th>
                    <th className="text-left py-2 px-2">Amount</th>
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((invoice) => (
                    <tr key={invoice.id} className="border-b">
                      <td className="py-2 px-2">{invoice.organizationName}</td>
                      <td className="py-2 px-2">{invoice.number ?? invoice.id}</td>
                      <td className="py-2 px-2">
                        {(invoice.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                      </td>
                      <td className="py-2 px-2">
                        {new Date(invoice.createdAt * 1000).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-2">{invoice.status}</td>
                      <td className="py-2 px-2">
                        <div className="flex gap-2 items-center">
                          {invoice.pdfUrl ? (
                            <a
                              href={invoice.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              PDF
                            </a>
                          ) : null}
                          {invoice.paymentIntentId ? (
                            <RefundButton paymentIntentId={invoice.paymentIntentId} />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
