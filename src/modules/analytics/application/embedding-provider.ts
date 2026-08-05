export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  cosine(a: number[], b: number[]): number;
}
