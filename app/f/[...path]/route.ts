import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

// Opens a stored file through a one-minute signed link. Storage access rules decide who may open what,
// so the same route serves Kevin and, later, each client for their own files.
export async function GET(request: NextRequest, { params }: RouteContext<"/f/[...path]">) {
  const { path } = await params;
  const db = await supabase();
  const { data: claims } = await db.auth.getClaims();
  if (!claims) return NextResponse.redirect(new URL("/login", request.url));

  const { data, error } = await db.storage.from("hub").createSignedUrl(path.join("/"), 60);
  if (error || !data) return new NextResponse("File not found, or you don't have access to it.", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
