import { Badge } from "@/components/ui/badge";

export function DataQualityBadge({ quality }: { quality: "live" | "partial" | "simulated" }) {
  const labels = {
    live: "Live data",
    partial: "Partial data",
    simulated: "Simulated data",
  };

  const variants: Record<typeof quality, "default" | "secondary" | "destructive" | "outline"> = {
    live: "default",
    partial: "secondary",
    simulated: "outline",
  };

  return <Badge variant={variants[quality]}>{labels[quality]}</Badge>;
}
