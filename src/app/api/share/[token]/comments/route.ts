import { z } from "zod";
import { addShareComment } from "@/lib/agency/share";

const schema = z.object({
  authorName: z.string().min(1).max(120),
  authorEmail: z.string().email().nullable().optional(),
  body: z.string().min(1).max(4000),
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
  const result = await addShareComment({ token, ...parsed.data });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 403 });
  }
  return Response.json({ comment: result.comment });
}
