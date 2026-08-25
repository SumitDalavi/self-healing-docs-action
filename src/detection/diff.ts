import { checkStaleness, repairDoc } from '../utils/llm';

export interface DiffInfo {
  codeId: string;
  oldCode: string;
  newCode: string;
}

export interface RepairResult {
  docId: string;
  originalContent: string;
  isStale: boolean;
  reasoning: string;
  repairedContent?: string;
}

export async function processDiff(diff: DiffInfo, docContent: string): Promise<RepairResult> {
  const staleness = await checkStaleness(diff.oldCode, diff.newCode, docContent);
  
  if (!staleness.isStale) {
    return {
      docId: 'mock-doc-id',
      originalContent: docContent,
      isStale: false,
      reasoning: staleness.reasoning
    };
  }

  const repaired = await repairDoc(docContent, diff.newCode, staleness.reasoning);

  return {
    docId: 'mock-doc-id',
    originalContent: docContent,
    isStale: true,
    reasoning: staleness.reasoning,
    repairedContent: repaired
  };
}
