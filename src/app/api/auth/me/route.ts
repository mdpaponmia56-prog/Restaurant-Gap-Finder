import { NextResponse } from "next/server";
import { getCurrentUser, ensureDefaultAdminUser } from "@/lib/auth";

export async function GET() {
  try {
    // Ensure default admin exists
    await ensureDefaultAdminUser();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to get current user session: " + err.message },
      { status: 500 }
    );
  }
}
