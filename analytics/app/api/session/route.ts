import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Lets client components (Nav) show who's signed in and gate admin-only
// links without threading session data through every server page layout.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ session: null }, { status: 401 });
  return NextResponse.json({
    session: { name: session.name, email: session.email, role: session.role },
  });
}
