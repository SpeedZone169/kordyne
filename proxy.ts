import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Kordyne Preview"',
      "Cache-Control": "no-store",
    },
  });
}

function isExcludedPath(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/kordyne-logo.svg" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/api/cron/")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isExcludedPath(pathname)) {
    return NextResponse.next({ request });
  }

  const siteLockEnabled = process.env.SITE_LOCK_ENABLED === "true";

  if (siteLockEnabled) {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Basic ")) {
      return unauthorized();
    }

    try {
      const encoded = authHeader.split(" ")[1] ?? "";
      const decoded = atob(encoded);
      const [username, password] = decoded.split(":");

      if (
        username !== process.env.SITE_LOCK_USERNAME ||
        password !== process.env.SITE_LOCK_PASSWORD
      ) {
        return unauthorized();
      }
    } catch {
      return unauthorized();
    }
  }

  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};