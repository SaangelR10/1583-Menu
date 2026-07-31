import { NextRequest } from "next/server";
import { CSRF_COOKIE } from "./auth/cookies";

/**
 * Doble-submit CSRF check para los endpoints que dependen de la cookie ambiente de refresh
 * (/auth/refresh, /auth/logout). El resto de mutaciones admin usan Authorization: Bearer,
 * que un sitio cruzado no puede adjuntar, asi que no lo requieren.
 */
export function verifyCsrf(request: NextRequest): boolean {
  const selfOrigin = request.nextUrl.origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== selfOrigin) return false;

  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken) return false;
  return cookieToken === headerToken;
}
