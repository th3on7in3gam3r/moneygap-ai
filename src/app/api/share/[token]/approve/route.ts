import { z } from "zod";
import { addShareApproval } from "@/lib/agency/share";

const schema = z.object({
  opportunityId: z.string().uuid().nullable().optional(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(2000).nullable().optional(),
  authorName: z.string().min(1).max(120),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const result = await addShareApproval({ token, ...parsed.data });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 403 });
  }
  return Response.json({ approval: result.approval });
}
