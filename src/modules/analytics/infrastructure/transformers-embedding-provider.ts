import { logger } from "@/shared/observability";
import type { FeatureExtractionPipeline, Tensor } from "@xenova/transformers";
import type { EmbeddingProvider } from "../application/embedding-provider";
import { keywordEmbeddingProvider } from "../application/embedding-providers/keyword-embedding-provider";

export interface TransformersEmbeddingProviderConfig {
  modelPath: string;
  fallback?: EmbeddingProvider;
}

export class TransformersEmbeddingProvider implements EmbeddingProvider {
  private readonly fallback: EmbeddingProvider;
  private readonly modelPath: string;
  private extractor: FeatureExtractionPipeline | null = null;
  private loadError: Error | null = null;

  constructor(config: TransformersEmbeddingProviderConfig) {
    this.modelPath = config.modelPath;
    this.fallback = config.fallback ?? keywordEmbeddingProvider;
  }

  private async loadExtractor() {
    if (this.extractor) return this.extractor;
    if (this.loadError) throw this.loadError;

    if (!this.modelPath) {
      this.loadError = new Error("TransformersEmbeddingProvider: modelPath is empty");
      throw this.loadError;
    }

    try {
      const { pipeline } = await import("@xenova/transformers");
      this.extractor = (await pipeline("feature-extraction", this.modelPath, {
        local_files_only: true,
      })) as FeatureExtractionPipeline;
      return this.extractor;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      logger.error("analytics.transformers.loadFailed", { modelPath: this.modelPath, error: message });
      this.loadError = new Error(`Failed to load local MiniLM model: ${message}`);
      throw this.loadError;
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!this.modelPath) {
      return this.fallback.embed(text);
    }

    try {
      const extractor = await this.loadExtractor();
      const output: Tensor = await extractor._call(text, { pooling: "mean", normalize: true });
      const data = output.data;
      if (Array.isArray(data)) return data.map(Number);
      return Array.from(data as Float32Array);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      logger.warn("analytics.transformers.embedFailed", { modelPath: this.modelPath, error: message, fallback: true });
      return this.fallback.embed(text);
    }
  }

  cosine(a: number[], b: number[]): number {
    return this.fallback.cosine(a, b);
  }
}
