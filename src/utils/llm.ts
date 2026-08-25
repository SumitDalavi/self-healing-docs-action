import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const STALENESS_PROMPT = `You are a technical documentation reviewer.
You will receive:
1. The old version of a code block.
2. The new version of a code block.
3. A documentation section that refers to this code.

Is the documentation section now stale or inaccurate because of the code change?
Answer in JSON: { "isStale": true/false, "reasoning": "..." }`;

export async function checkStaleness(oldCode: string, newCode: string, docContent: string): Promise<{ isStale: boolean, reasoning: string }> {
  const userMessage = `--- OLD CODE ---\n${oldCode}\n\n--- NEW CODE ---\n${newCode}\n\n--- DOC CONTENT ---\n${docContent}`;
  const res = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: STALENESS_PROMPT },
      { role: 'user', content: userMessage }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1
  });

  return JSON.parse(res.choices[0].message.content || '{"isStale": false, "reasoning": "Failed to parse"}');
}

const REPAIR_PROMPT = `You are a technical documentation writer.
A documentation section has been identified as stale because of a code change.
You will be provided with:
1. The stale documentation section.
2. The new code.
3. The reasoning for why it is stale.

Rewrite ONLY the parts of the documentation that are inaccurate. Preserve the original style, tone, and formatting. Do not hallucinate external context.
Return your answer in JSON: { "repaired_doc": "..." }`;

export async function repairDoc(staleDoc: string, newCode: string, reasoning: string): Promise<string> {
  const userMessage = `--- STALE DOC ---\n${staleDoc}\n\n--- NEW CODE ---\n${newCode}\n\n--- REASONING ---\n${reasoning}`;
  const res = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: REPAIR_PROMPT },
      { role: 'user', content: userMessage }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1
  });

  const parsed = JSON.parse(res.choices[0].message.content || '{"repaired_doc": ""}');
  return parsed.repaired_doc || staleDoc;
}
