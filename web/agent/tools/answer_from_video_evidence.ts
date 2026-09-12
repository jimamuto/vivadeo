import { defineTool } from "eve/tools";
import { z } from "zod";
import { getBackendHeaders, getBackendUrl } from "../../lib/backend";
import { requireWorkspaceCaller } from "../lib/workspace";

const inputSchema = z.object({
  question: z.string().min(1).max(3000),
  videoIds: z.array(z.string()).max(50).default([]),
  modality: z.enum(["auto", "visual", "transcript", "hybrid"]).default("auto"),
  searchMode: z.enum(["top", "all"]).default("top"),
  outputFormat: z.enum(["answer", "rows", "comparison"]).default("answer"),
  comparisonVideoIds: z.array(z.string()).max(10).default([]),
});

export default defineTool({
  description: "Answer a question from authorized transcript or visual evidence in the caller's Vivadeo workspace. Use an empty videoIds list to search the active workspace scope.",
  inputSchema,
  label: { start: () => "Searching video evidence" },
  async execute(input, ctx) {
    const { workspaceId } = requireWorkspaceCaller(ctx);
    const response = await fetch(getBackendUrl("/v1/search/chat"), {
      method: "POST",
      headers: getBackendHeaders({ "content-type": "application/json" }, workspaceId),
      body: JSON.stringify({
        messages: [{ role: "user", content: input.question }],
        results: input.searchMode === "all" ? 100 : 8,
        video_ids: input.videoIds,
        modality: input.modality,
        search_mode: input.searchMode,
        output_format: input.outputFormat,
        comparison_video_ids: input.comparisonVideoIds,
        provider: "vivadeo-auto",
      }),
      signal: ctx.abortSignal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload && typeof payload.detail === "string" ? payload.detail : "Video evidence could not be searched.";
      throw new Error(message);
    }
    return payload;
  },
});
