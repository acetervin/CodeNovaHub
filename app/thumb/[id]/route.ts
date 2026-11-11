import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Serves an upload's stored preview as an image. Row-level security decides who may see it, as for the file itself.
// A preview never changes (a new upload is a new row), so the browser keeps it.
export async function GET(_: Request, { params }: RouteContext<"/thumb/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const db = await supabase();
  const { data } = await db.from("assets").select("thumb").eq("id", id).maybeSingle();
  const m = data?.thumb ? /^data:(image\/(?:webp|jpeg));base64,(.+)$/.exec(data.thumb) : null;
  if (!m) return new NextResponse(null, { status: 404 });
  return new NextResponse(Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0)), {
    headers: { "content-type": m[1], "cache-control": "private, max-age=31536000, immutable" },
  });
}
