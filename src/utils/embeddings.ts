import OpenAI from 'openai';
import cosineSimilarity from 'cosine-similarity';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return res.data[0].embedding;
}

export function computeSimilarity(vecA: number[], vecB: number[]): number {
  return cosineSimilarity(vecA, vecB) || 0;
}
