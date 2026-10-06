import { NextRequest, NextResponse } from "next/server";
import { GooglePlacesService } from "@/lib/services/google-places";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { key } = body;

    const result = await GooglePlacesService.testConnection(key);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        valid: false,
        message: "Key verification error: " + err.message,
      },
      { status: 500 }
    );
  }
}
