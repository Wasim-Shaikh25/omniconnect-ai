"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { askBusinessBrainAction } from "@/modules/ai";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";

const PRESETS = [
  "What should I focus on today?",
  "Summarize my workspace performance.",
  "What content should I create next?",
  "Which conversations need attention?",
];

export default function BusinessBrainPage() {
  const [state, action, pending] = useActionState(askBusinessBrainAction, {});
  const [question, setQuestion] = useState("");

  const handlePreset = (preset: string) => {
    setQuestion(preset);
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </header>

      <section className="mb-8">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Business Brain
        </h1>
        <p className="text-sm text-muted-foreground">
          Ask OmniConnect anything about your workspace. Answers are grounded in
          your stores, products, conversations, and followers.
        </p>
      </section>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Ask a question</CardTitle>
          <CardDescription>
            Choose a preset or type your own. No data leaves your workspace
            except to generate the answer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePreset(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>
            <div>
              <Label htmlFor="question">Your question</Label>
              <Textarea
                id="question"
                name="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What should I focus on today?"
                rows={4}
                required
                maxLength={2000}
              />
            </div>
            <Button type="submit" disabled={pending || !question.trim()}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Thinking…
                </>
              ) : (
                "Ask OmniConnect"
              )}
            </Button>
          </form>
          {state.error && (
            <p className="mt-4 text-sm text-destructive">{state.error}</p>
          )}
        </CardContent>
      </Card>

      {state.answer && (
        <Card>
          <CardHeader>
            <CardTitle>Answer</CardTitle>
            <CardDescription>
              Confidence: {state.answer.confidence} · Sources: {state.answer.sources.length > 0 ? state.answer.sources.join(", ") : "workspace context"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">
              {state.answer.answer}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
