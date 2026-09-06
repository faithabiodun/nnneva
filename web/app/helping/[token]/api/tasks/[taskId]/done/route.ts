import { type NextRequest } from "next/server";

import { forward } from "@/lib/partner";

export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/helping/[token]/api/tasks/[taskId]/done">,
) {
  const { token, taskId } = await ctx.params;
  return forward(
    `/partner/${encodeURIComponent(token)}/tasks/${encodeURIComponent(taskId)}/done`,
  );
}
