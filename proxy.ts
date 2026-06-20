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
    pathname === "/favicon.png" ||
    pathname === "/kordyne-logo.svg" ||
    pathname === "/kordyne-email-logo.jpg" ||
    pathname === "/kordyne-email-logo-dark.png" ||
    pathname === "/robots.txt" ||
    pathname === "/.well-known/security.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/design-app/") ||
    pathname.startsWith("/design-app/connect") ||
    pathname.startsWith("/design-app/onshape")
  );
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

function parseBasicCredentials(authHeader: string) {
  if (!authHeader.startsWith("Basic ")) return null;

  const encoded = authHeader.split(" ")[1] ?? "";
  const decoded = atob(encoded);
  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex < 1) return null;

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

function parseAdditionalCredentials(rawCredentials: string | undefined) {
  if (!rawCredentials?.trim()) return [];

  return rawCredentials
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(":");

      if (separatorIndex < 1) return null;

      return {
        username: entry.slice(0, separatorIndex),
        password: entry.slice(separatorIndex + 1),
      };
    })
    .filter(
      (credential): credential is { username: string; password: string } =>
        Boolean(credential?.username && credential.password)
    );
}

function isAllowedSiteLockCredential(username: string, password: string) {
  const credentials = [
    ...(process.env.SITE_LOCK_USERNAME && process.env.SITE_LOCK_PASSWORD
      ? [
          {
            username: process.env.SITE_LOCK_USERNAME,
            password: process.env.SITE_LOCK_PASSWORD,
          },
        ]
      : []),
    ...parseAdditionalCredentials(process.env.SITE_LOCK_ADDITIONAL_CREDENTIALS),
  ];

  return credentials.some(
    (credential) =>
      constantTimeEqual(username, credential.username) &&
      constantTimeEqual(password, credential.password)
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

    if (!authHeader) {
      return unauthorized();
    }

    try {
      const credentials = parseBasicCredentials(authHeader);

      if (
        !credentials ||
        !isAllowedSiteLockCredential(credentials.username, credentials.password)
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


