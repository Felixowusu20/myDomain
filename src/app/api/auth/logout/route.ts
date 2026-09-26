import { jsonOk } from "@/lib/api";
import {
  ADMIN_SESSION_COOKIE,
  clearSessionCookie,
  SESSION_COOKIE,
} from "@/lib/session";

export async function POST() {
  await clearSessionCookie(SESSION_COOKIE);
  await clearSessionCookie(ADMIN_SESSION_COOKIE);
  return jsonOk({ ok: true });
}
