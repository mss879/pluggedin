import { NextResponse } from "next/server";
import { getAdminSession, isSessionVerified } from "@/lib/admin-auth";

/** Tells the admin UI whether the current session has passed email 2FA. */
export async function GET(request: Request) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ admin: false, verified: false }, { status: 401 });
  }
  return NextResponse.json({ admin: true, verified: await isSessionVerified(session) });
}
