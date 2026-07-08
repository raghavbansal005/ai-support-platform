import { EmbeddingModel, FlagEmbedding } from "fastembed";
import { env } from "../config/env";

// fastembed runs the embedding model locally via ONNX Runtime (CPU) - no API key, no
// per-request cost, no network call at inference time. The first call downloads and caches
// the model (~35MB for the default MiniLM model); every call after that is fully offline.
const MODEL_MAP: Record<string, EmbeddingModel> = {
  "all-MiniLM-L6-v2": EmbeddingModel.AllMiniLML6V2,
  "bge-small-en-v1.5": EmbeddingModel.BGESmallENV15,
  "bge-base-en-v1.5": EmbeddingModel.BGEBaseENV15,
};

let modelPromise: Promise<FlagEmbedding> | null = null;

function getModel(): Promise<FlagEmbedding> {
  if (!modelPromise) {
    const model = MODEL_MAP[env.embeddingModel] ?? EmbeddingModel.AllMiniLML6V2;
    modelPromise = FlagEmbedding.init({ model });
  }
  return modelPromise;
}

/** Embeds knowledge-base chunks at index time (passage embeddings). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const model = await getModel();
  const out: number[][] = [];
  for await (const batch of model.passageEmbed(texts, 32)) {
    out.push(...batch);
  }
  return out;
}

/** Embeds an incoming customer message at query time. */
export async function embedQuery(text: string): Promise<number[]> {
  const model = await getModel();
  return model.queryEmbed(text);
}
