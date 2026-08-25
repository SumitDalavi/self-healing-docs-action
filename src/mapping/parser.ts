import { getEmbedding, computeSimilarity } from '../utils/embeddings';

export interface CodeChunk {
  id: string;
  content: string;
  embedding?: number[];
}

export interface DocChunk {
  id: string;
  heading: string;
  content: string;
  embedding?: number[];
}

export async function linkChunks(codeChunks: CodeChunk[], docChunks: DocChunk[]): Promise<Map<string, string[]>> {
  // Map of CodeChunk ID -> Array of DocChunk IDs that are highly related
  const mapping = new Map<string, string[]>();

  for (const c of codeChunks) {
    if (!c.embedding) c.embedding = await getEmbedding(c.content);
    
    const relatedDocs: string[] = [];
    for (const d of docChunks) {
      if (!d.embedding) d.embedding = await getEmbedding(d.content);

      const sim = computeSimilarity(c.embedding, d.embedding);
      // If similarity > 0.65, we consider the doc section relevant to the code chunk
      if (sim > 0.65) {
        relatedDocs.push(d.id);
      }
    }
    mapping.set(c.id, relatedDocs);
  }

  return mapping;
}
