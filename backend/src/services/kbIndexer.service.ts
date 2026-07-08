import { prisma } from "../lib/prisma";
import { setChunkEmbedding } from "../lib/vectorSearch";
import { detectFileType, extractText, SupportedFileType } from "./documentParser.service";
import { chunkText } from "./chunking.service";
import { embedTexts } from "./embedding.service";

export async function indexDocument(documentId: string, buffer: Buffer, filename: string, mimeType: string) {
  const doc = await prisma.knowledgeDocument.findUniqueOrThrow({ where: { id: documentId } });

  try {
    await prisma.knowledgeDocument.update({ where: { id: documentId }, data: { status: "PROCESSING" } });

    const fileType = detectFileType(filename, mimeType) as SupportedFileType;
    const text = await extractText(buffer, fileType);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error("No extractable text found in document");
    }

    const embeddings = await embedTexts(chunks.map((c) => c.content));

    // Replace any existing chunks (used by re-index)
    await prisma.documentChunk.deleteMany({ where: { documentId } });

    const created = await prisma.$transaction(
      chunks.map((chunk) =>
        prisma.documentChunk.create({
          data: {
            documentId,
            businessId: doc.businessId,
            chunkIndex: chunk.index,
            content: chunk.content,
            tokenCount: chunk.wordCount,
          },
        })
      )
    );

    for (let i = 0; i < created.length; i++) {
      await setChunkEmbedding(created[i].id, embeddings[i]);
    }

    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: "INDEXED", indexedAt: new Date(), errorMessage: null },
    });
  } catch (err: any) {
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: "FAILED", errorMessage: err.message?.slice(0, 500) ?? "Unknown error" },
    });
    throw err;
  }
}

export async function reindexDocument(documentId: string, buffer: Buffer, filename: string, mimeType: string) {
  return indexDocument(documentId, buffer, filename, mimeType);
}
