import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const service = searchParams.get("service") || undefined;

    const where: any = {};
    if (service) where.service_name = service;

    const logs = await prisma.apiAuditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch audit logs: " + err.message },
      { status: 500 }
    );
  }
}
