import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Security Headers
  const response = NextResponse.next();
  
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");
  // Content Type Sniffing protection
  response.headers.set("X-Content-Type-Options", "nosniff");
  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Strict Transport Security (HSTS)
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // 2. API Protection for sensitive routes
  if (pathname.startsWith("/api/billing/checkout") || pathname.startsWith("/api/login")) {
    // Basic check: require a valid referer from our own domain in production
    const referer = request.headers.get("referer");
    const host = request.headers.get("host");
    
    if (process.env.NODE_ENV === "production" && referer && host) {
      if (!referer.includes(host)) {
         return new NextResponse(
           JSON.stringify({ message: "Invalid request origin." }),
           { status: 403, headers: { "content-type": "application/json" } }
         );
      }
    }
  }

  return response;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
