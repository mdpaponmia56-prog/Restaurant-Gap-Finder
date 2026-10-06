import { NextRequest, NextResponse } from "next/server";
import { ResearchWorkerService } from "@/lib/services/research-worker";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, action } = body;

    if (!jobId || !action) {
      return NextResponse.json(
        { error: "jobId and action (PAUSE | RESUME | CANCEL) are required." },
        { status: 400 }
      );
    }

    if (action === "PAUSE") {
      await ResearchWorkerService.pauseJob(jobId);
      return NextResponse.json({ success: true, message: "Research paused." });
    } else if (action === "RESUME") {
      await ResearchWorkerService.resumeJob(jobId);
      return NextResponse.json({ success: true, message: "Research resumed." });
    } else if (action === "CANCEL") {
      await ResearchWorkerService.cancelJob(jobId);
      return NextResponse.json({ success: true, message: "Research cancelled." });
    } else {
      return NextResponse.json(
        { error: `Unknown action "${action}". Must be PAUSE, RESUME, or CANCEL.` },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to control research job: " + err.message },
      { status: 500 }
    );
  }
}
