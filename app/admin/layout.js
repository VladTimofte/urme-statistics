import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../lib/session.js";

export default async function AdminLayout({ children }) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value || null;

  const session = verifySessionToken(token, {
    secret: process.env.AUTH_SECRET,
  });

  // not logged in
  if (!session) {
    redirect("/login?next=/admin");
  }

  // guest trying to access admin
  if (session.role !== "admin") {
    redirect("/guest");
  }

  return children;
}
