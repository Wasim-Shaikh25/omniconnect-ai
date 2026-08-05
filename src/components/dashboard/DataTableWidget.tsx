import type { TableData, TableRow } from "@/modules/ai";

interface DataTableWidgetProps {
  data: TableData;
}

function isNumberish(value: string | number | null): boolean {
  return typeof value === "number" || (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value));
}

function formatCell(value: string | number | null): string {
  if (value === null) return "—";
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US").format(value);
  }
  return value;
}

export function DataTableWidget({ data }: DataTableWidgetProps) {
  const numericColumns = new Set<string>();
  for (const row of data.rows) {
    for (const header of data.headers) {
      if (isNumberish(row[header])) {
        numericColumns.add(header);
      }
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            {data.headers.map((header) => (
              <th key={header} className="pb-2 font-medium text-muted-foreground">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.rows.map((row: TableRow, i) => (
            <tr key={i}>
              {data.headers.map((header) => (
                <td
                  key={header}
                  className={`py-2 ${numericColumns.has(header) ? "text-right tabular-nums" : "text-left"}`}
                >
                  {formatCell(row[header])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
