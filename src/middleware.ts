import { NextRequest, NextResponse } from "next/server";

// /test 페이지는 production(main) 배포에서 접근 불가
// Vercel VERCEL_ENV: 'production' = main, 'preview' = develop, undefined = local
export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/test") &&
    process.env.VERCEL_ENV === "production"
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }
}

export const config = {
  matcher: "/test/:path*",
};
