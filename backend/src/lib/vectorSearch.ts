import { prisma } from "./prisma";

/** Store an embedding for a chunk that was created without one yet. */
export async function setChunkEmbedding(chunkId: string, embedding: number[]) {
  await prisma.documentChunk.update({
    where: { id: chunkId },
    data: { embedding: JSON.stringify(embedding) },
  });
}

export interface SimilarChunk {
  id: string;
  content: string;
  documentId: string;
  filename: string;
  score: number; // cosine similarity, 1 = identical direction, higher is better
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Tenant-scoped nearest-neighbor search done in application code instead of a SQL vector
 * operator, since plain SQLite has no vector type/index. Loads every embedded chunk for the
 * business and ranks them in memory.
 *
 * This is intentionally simple and fine at take-home/early-stage scale (a support KB is
 * typically a few hundred chunks per tenant, not millions). If a knowledge base grows large
 * enough for this to matter, swap this function for a real vector index (pgvector, Qdrant,
 * etc.) behind the same `searchSimilarChunks` signature - nothing else in the codebase needs
 * to change.
 */
export async function searchSimilarChunks(
  businessId: string,
  queryEmbedding: number[],
  topK = 5
): Promise<SimilarChunk[]> {
  const chunks = await prisma.documentChunk.findMany({
    where: { businessId, embedding: { not: null } },
    select: { id: true, content: true, documentId: true, embedding: true, document: { select: { filename: true } } },
  });

  const scored: SimilarChunk[] = chunks
    .map((c: (typeof chunks)[number]) => ({
      id: c.id,
      content: c.content,
      documentId: c.documentId,
      filename: c.document.filename,
      score: cosineSimilarity(queryEmbedding, JSON.parse(c.embedding as string)),
    }))
    .sort((a: SimilarChunk, b: SimilarChunk) => b.score - a.score);

  return scored.slice(0, topK);
}
