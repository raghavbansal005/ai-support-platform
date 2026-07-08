/**
 * Simple, dependency-free chunker: splits on paragraph boundaries first,
 * then greedily packs paragraphs into ~chunkSize-word windows with overlap.
 * Good enough for support-doc style content (FAQs, policies, guides).
 */
export interface Chunk {
  content: string;
  index: number;
  wordCount: number;
}

export function chunkText(text: string, chunkSizeWords = 220, overlapWords = 40): Chunk[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const paragraphs = normalized.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const chunks: Chunk[] = [];
  let currentWords: string[] = [];

  const flush = () => {
    if (currentWords.length === 0) return;
    chunks.push({
      content: currentWords.join(" "),
      index: chunks.length,
      wordCount: currentWords.length,
    });
  };

  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    if (currentWords.length + words.length > chunkSizeWords && currentWords.length > 0) {
      flush();
      // start next chunk with overlap from the tail of the previous one
      const overlap = currentWords.slice(-overlapWords);
      currentWords = [...overlap, ...words];
    } else {
      currentWords = [...currentWords, ...words];
    }

    // paragraph itself larger than chunk size: hard-split it
    while (currentWords.length > chunkSizeWords * 1.5) {
      const slice = currentWords.slice(0, chunkSizeWords);
      chunks.push({ content: slice.join(" "), index: chunks.length, wordCount: slice.length });
      currentWords = currentWords.slice(chunkSizeWords - overlapWords);
    }
  }
  flush();

  return chunks.length ? chunks : [{ content: normalized, index: 0, wordCount: normalized.split(/\s+/).length }];
}
