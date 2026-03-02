import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../lib/session.js";

export default async function GuestLayout({ children }) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value || null;

  const session = verifySessionToken(token, {
    secret: process.env.AUTH_SECRET,
  });

  // Nu e logat
  if (!session) {
    redirect("/login?next=/guest");
  }

  // Acceptam doar admin/guest
  if (session.role !== "admin" && session.role !== "guest") {
    redirect("/login");
  }

  return children;
}
