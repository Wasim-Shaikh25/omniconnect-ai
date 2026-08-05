import { describe, it, expect, vi } from "vitest";
import { TransformersEmbeddingProvider } from "./transformers-embedding-provider";

describe("TransformersEmbeddingProvider", () => {
  it("falls back to keyword embeddings when modelPath is empty", async () => {
    const fallback = { embed: vi.fn().mockResolvedValue([0.1, 0.2]), cosine: vi.fn().mockReturnValue(0.9) };
    const provider = new TransformersEmbeddingProvider({ modelPath: "", fallback });
    const vector = await provider.embed("hello");
    expect(fallback.embed).toHaveBeenCalledWith("hello");
    expect(vector).toEqual([0.1, 0.2]);
  });

  it("uses the fallback cosine", async () => {
    const fallback = { embed: vi.fn().mockResolvedValue([1, 0]), cosine: vi.fn().mockReturnValue(0.5) };
    const provider = new TransformersEmbeddingProvider({ modelPath: "", fallback });
    expect(provider.cosine([1, 0], [0, 1])).toBe(0.5);
  });

  it("falls back when local model loading fails", async () => {
    const fallback = { embed: vi.fn().mockResolvedValue([0.3, 0.4]), cosine: vi.fn() };
    const provider = new TransformersEmbeddingProvider({ modelPath: "/nonexistent/model", fallback });
    const vector = await provider.embed("test");
    expect(fallback.embed).toHaveBeenCalledWith("test");
    expect(vector).toEqual([0.3, 0.4]);
  });
});
