import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Routes reachable without a session. Everything else redirects to /sign-in.
const PUBLIC_PATHS = ["/sign-in", "/auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

// Refreshes the Supabase auth session on every request and guards protected
// routes: logged-out users hitting a protected path are redirected to
// /sign-in. Must return the `supabaseResponse` object so refreshed auth
// cookies are propagated to the browser.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Auth-code rescue: magic-link / signup-confirmation emails sometimes land
  // on a path other than /auth/callback (e.g. when Supabase falls back to the
  // Site URL root). Forward any such `?code=` to the callback handler before
  // route protection can redirect to /sign-in and strip the code.
  const code = request.nextUrl.searchParams.get("code");
  if (code && request.nextUrl.pathname !== "/auth/callback") {
    const url = request.nextUrl.clone();
    const landedOn = request.nextUrl.pathname;
    url.pathname = "/auth/callback";
    url.searchParams.set("next", landedOn === "/" ? "/" : landedOn);
    return NextResponse.redirect(url);
  }

  // IMPORTANT: do not run code between createServerClient and getUser().
  // This refreshes the session token when needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guard protected routes: send logged-out users to sign-in, preserving
  // where they were headed so we can bounce them back after login.
  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
