import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, problemType, description, timestamp, userAgent } = body;

    if (!description || !problemType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store the report in database
    const { data, error } = await supabase
      .from("problem_reports")
      .insert({
        email: email || "anonymous",
        problem_type: problemType,
        description,
        user_agent: userAgent,
        created_at: timestamp,
      })
      .select()
      .single();

    if (error) {
      console.error("Error storing problem report:", error);
      return NextResponse.json(
        { error: "Failed to store report" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, reportId: data.id });
  } catch (error) {
    console.error("Error in report-problem API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
