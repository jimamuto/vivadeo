import { NextRequest } from "next/server";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";

type JobPayload = {
  id: string;
  status: string;
};

const TERMINAL_STATUSES = new Set(["succeeded", "failed", "canceled"]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const workspace = request.cookies.get("vivadeo_workspace")?.value;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const pushEvent = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      while (!request.signal.aborted) {
        try {
          const response = await fetch(getBackendUrl(`/v1/jobs/${jobId}`), {
            headers: getBackendHeaders(undefined, workspace),
            cache: "no-store",
          });
          if (!response.ok) {
            pushEvent("error", { status: response.status });
            break;
          }
          const payload = (await response.json()) as JobPayload;
          pushEvent("job", payload);
          if (TERMINAL_STATUSES.has(payload.status)) break;
        } catch (cause) {
          pushEvent("error", {
            message: cause instanceof Error ? cause.message : "Unknown error",
          });
          break;
        }
        await sleep(2000);
      }

      controller.close();
    },
    cancel() {
      return;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
