import { NextRequest, NextResponse } from "next/server";
import { REFRESH_COOKIE } from "@/lib/auth/cookies";

const PUBLIC_ADMIN_PATHS = ["/admin/login"];

/**
 * Guard de UX para las paginas /admin/*: solo redirige segun la *presencia* de la cookie de
 * refresh (edge-safe, sin tocar la DB). La autorizacion real de cada request mutante ocurre en
 * el propio route handler via requireAdmin() verificando el JWT de acceso — este proxy no es
 * el limite de seguridad, solo evita el flash de UI a usuarios sin sesion.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasRefreshCookie = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);

  if (pathname.startsWith("/admin")) {
    const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some((path) => pathname.startsWith(path));
    if (isPublicAdminPath) {
      return NextResponse.next();
    }
    if (!hasRefreshCookie) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
