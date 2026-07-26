import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface WorkflowCardProps {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
  count?: number;
  value?: string;
  ctaLabel?: string;
}

export function WorkflowCard({
  title,
  href,
  description,
  icon: Icon,
  count,
  value,
  ctaLabel = "Open",
}: WorkflowCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {value && <p className="text-2xl font-semibold">{value}</p>}
        {typeof count === "number" && !value && (
          <p className="text-2xl font-semibold">{count}</p>
        )}
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href={href}>{ctaLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
