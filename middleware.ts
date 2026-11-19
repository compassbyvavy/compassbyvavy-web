import { NextResponse, type NextRequest } from "next/server";
import { redirectFor } from "@/lib/shell/redirects";

/**
 * Edge middleware, not proxy.ts. OpenNext on Cloudflare only bundles the
 * edge runtime, and Next 16's proxy file is Node-only.
 */
export function middleware(request: NextRequest) {
  const result = redirectFor(request.nextUrl.pathname);
  if (!result) return NextResponse.next();
  const url = request.nextUrl.clone();
  const [path, search] = result.destination.split("?");
  url.pathname = path;
  url.search = search ? `?${search}` : "";
  return NextResponse.redirect(url, result.status);
}

export const config = {
  matcher: [
    "/discover/:path*",
    "/camps",
    "/camps/:path*",
    "/learn",
    "/learn/:path*",
    "/saved",
    "/saved/:path*",
    "/calendar",
    "/sign-in",
  ],
};
