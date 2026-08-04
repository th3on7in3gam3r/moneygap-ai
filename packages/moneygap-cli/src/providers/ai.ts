export type AIProvider = {
  id: string;
  complete: (prompt: string) => Promise<string>;
};

function stub(id: string): AIProvider {
  return {
    id,
    async complete() {
      throw new Error(
        `${id} provider is not configured. Set an API key in a future MoneyGap CLI release — scans work offline without AI.`,
      );
    },
  };
}

export const openaiProvider = stub("openai");
export const claudeProvider = stub("claude");
export const geminiProvider = stub("gemini");

export const providers = {
  openai: openaiProvider,
  claude: claudeProvider,
  gemini: geminiProvider,
};
