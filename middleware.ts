import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// shortcut: Next 16 calls this file deprecated in favour of proxy.ts, but proxy.ts runs on Node, which
// OpenNext on Cloudflare only supports experimentally. Move to proxy.ts once OpenNext supports it fully.
// Only keeps the login session fresh. Who can see what is enforced by row-level security, not here.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );
  await client.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/confirm).*)"],
};
