"use client";

import { useState, useTransition } from "react";
import { Download, Image, Link2, Share2 } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import type { DashboardSchema } from "@/modules/ai";
import { createDashboardShareAction } from "@/modules/analytics";

interface DashboardExportToolbarProps {
  projectId: string;
  schema: DashboardSchema;
  targetRef: React.RefObject<HTMLElement | null>;
}

export function DashboardExportToolbar({ projectId, schema, targetRef }: DashboardExportToolbarProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function downloadImage() {
    const node = targetRef.current;
    if (!node) return;
    const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${schema.title || "dashboard"}.png`;
    link.click();
  }

  async function downloadPdf() {
    const node = targetRef.current;
    if (!node) return;
    const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: "#ffffff" });
    const img = document.createElement("img");
    img.src = dataUrl;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
    });
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [img.width, img.height],
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
    pdf.save(`${schema.title || "dashboard"}.pdf`);
  }

  function share() {
    startTransition(async () => {
      const result = await createDashboardShareAction(projectId, schema.title ?? null, schema);
      if (result.ok && result.url) {
        setShareUrl(result.url);
        try {
          await navigator.clipboard.writeText(result.url);
        } catch {
          // ignore
        }
      } else {
        setShareUrl(result.error ?? "Could not create link");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={downloadImage}>
        <Image className="mr-2 h-4 w-4" />
        Image
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={downloadPdf}>
        <Download className="mr-2 h-4 w-4" />
        PDF
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={share} disabled={isPending}>
        <Share2 className="mr-2 h-4 w-4" />
        {isPending ? "Sharing..." : "Share"}
      </Button>
      {shareUrl && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link2 className="h-4 w-4" />
          {shareUrl.startsWith("http") ? (
            <a href={shareUrl} target="_blank" rel="noreferrer" className="underline">
              {shareUrl}
            </a>
          ) : (
            <span className="text-destructive">{shareUrl}</span>
          )}
        </div>
      )}
    </div>
  );
}
