import type { AIMessage } from "./ports";

export interface AIContext {
  messages: AIMessage[];
  model: string;
  fallback: string;
  operation: string;
  metadata: Record<string, unknown>;
}

export class AIContextBuilder {
  private messages: AIMessage[] = [];
  private _model = "gpt-4o-mini";
  private _fallback = "";
  private _operation = "completion";
  private _metadata: Record<string, unknown> = {};

  withSystem(content: string): this {
    this.messages.push({ role: "system", content });
    return this;
  }

  withUser(content: string): this {
    this.messages.push({ role: "user", content });
    return this;
  }

  withAssistant(content: string): this {
    this.messages.push({ role: "assistant", content });
    return this;
  }

  withHistory(history: AIMessage[]): this {
    this.messages.push(...history);
    return this;
  }

  withModel(model: string): this {
    this._model = model;
    return this;
  }

  withFallback(fallback: string): this {
    this._fallback = fallback;
    return this;
  }

  withOperation(operation: string): this {
    this._operation = operation;
    return this;
  }

  withMetadata(metadata: Record<string, unknown>): this {
    this._metadata = { ...this._metadata, ...metadata };
    return this;
  }

  build(): AIContext {
    return {
      messages: this.messages,
      model: this._model,
      fallback: this._fallback,
      operation: this._operation,
      metadata: this._metadata,
    };
  }
}
