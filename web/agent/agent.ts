import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { defineAgent } from "eve";

const directBaseUrl = process.env.VIVADEO_AUTO_LLM_BASE_URL;
const directApiKey = process.env.VIVADEO_AUTO_LLM_API_KEY;
const directModel = process.env.VIVADEO_AUTO_LLM_MODEL || "gpt-5.6-luna";

const model = directBaseUrl && directApiKey
  ? createOpenAICompatible({
      name: "vivadeo-auto",
      baseURL: directBaseUrl,
      apiKey: directApiKey,
    })(directModel)
  : (process.env.VIVADEO_EVE_MODEL || "openai/gpt-5.6-luna-fast");

export default defineAgent({
  model,
  defaultTools: false,
  compaction: { thresholdPercent: 0.75 },
  limits: { maxOutputTokensPerSession: 24_000 },
});
