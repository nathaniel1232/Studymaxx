/**
 * Study Plan API
 * 
 * GET  — Fetch user's active study plan
 * POST — Generate a new study plan from onboarding data
 * PATCH — Update plan item completion status
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ── Study Plan Generator ────────────────────────────────────

interface PlanItem {
  id: string;
  day: number;        // day number (1, 2, 3...)
  date: string;       // ISO date
  title: string;      // e.g. "Review Chapter 3: Cell Division"
  topic: string;      // e.g. "Cell Division"
  durationMinutes: number;
  type: "review" | "practice" | "quiz" | "deep_study";
  completed: boolean;
  completedAt: string | null;
}

function generateStudyPlan(params: {
  examDate: string;
  examSubject: string;
  dailyMinutes: number;
  struggles: string[];
  studyGoal: string;
}): PlanItem[] {
  const { examDate, examSubject, dailyMinutes, struggles } = params;
  const exam = new Date(examDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const totalDays = Math.max(1, Math.ceil((exam.getTime() - today.getTime()) / 86400000));
  const planDays = Math.min(totalDays, 30); // Cap at 30 days
  
  const items: PlanItem[] = [];
  const subject = examSubject || "your subject";
  
  // Generate topics based on typical study structure
  const studyPhases = getStudyPhases(planDays, subject, struggles);
  
  let itemId = 0;
  for (let day = 0; day < planDays; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split("T")[0];
    
    const phase = studyPhases[day % studyPhases.length];
    
    // Main study session
    items.push({
      id: `item_${++itemId}`,
      day: day + 1,
      date: dateStr,
      title: phase.title,
      topic: phase.topic,
      durationMinutes: Math.round(dailyMinutes * 0.6),
      type: phase.type,
      completed: false,
      completedAt: null,
    });
    
    // Short practice/review session
    if (dailyMinutes >= 30) {
      items.push({
        id: `item_${++itemId}`,
        day: day + 1,
        date: dateStr,
        title: day < planDays - 3 
          ? `Practice problems — ${subject}` 
          : `Final review — ${phase.topic}`,
        topic: phase.topic,
        durationMinutes: Math.round(dailyMinutes * 0.4),
        type: day < planDays - 3 ? "practice" : "quiz",
        completed: false,
        completedAt: null,
      });
    }
  }
  
  return items;
}

function getStudyPhases(totalDays: number, subject: string, struggles: string[]) {
  // Build a rotating schedule of study activities
  const phases: { title: string; topic: string; type: PlanItem["type"] }[] = [];
  
  const needsConceptWork = struggles.includes("understanding_concepts");
  const needsMemory = struggles.includes("memorization");
  const needsExamPrep = struggles.includes("exams");
  
  // Phase 1: Foundation (first third)
  const foundationCount = Math.max(2, Math.ceil(totalDays / 3));
  for (let i = 0; i < foundationCount; i++) {
    phases.push({
      title: needsConceptWork 
        ? `Break down key concepts — ${subject}` 
        : `Review core material — ${subject}`,
      topic: subject,
      type: "deep_study",
    });
  }
  
  // Phase 2: Practice (middle third)
  const practiceCount = Math.max(2, Math.ceil(totalDays / 3));
  for (let i = 0; i < practiceCount; i++) {
    phases.push({
      title: needsMemory
        ? `Flashcard review session — ${subject}`
        : `Work through practice problems — ${subject}`,
      topic: subject,
      type: "practice",
    });
  }
  
  // Phase 3: Test prep (final third)
  const testCount = Math.max(2, totalDays - foundationCount - practiceCount);
  for (let i = 0; i < testCount; i++) {
    phases.push({
      title: needsExamPrep
        ? `Timed practice test — ${subject}`
        : `Review weak areas — ${subject}`,
      topic: subject,
      type: i < testCount - 1 ? "review" : "quiz",
    });
  }
  
  return phases;
}

// ── Handlers ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("study_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plan: data || null });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { examDate, examSubject, dailyMinutes = 30, struggles = [], studyGoal = "" } = body;

    if (!examDate) {
      return NextResponse.json({ error: "Exam date is required" }, { status: 400 });
    }

    const items = generateStudyPlan({
      examDate,
      examSubject: examSubject || "Exam",
      dailyMinutes,
      struggles,
      studyGoal,
    });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("study_plans")
      .insert({
        user_id: user.id,
        title: `${examSubject || "Exam"} Study Plan`,
        exam_date: examDate,
        exam_subject: examSubject,
        daily_minutes: dailyMinutes,
        items,
      })
      .select()
      .single();

    if (error) {
      console.error("[StudyPlan] Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plan: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create plan" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { planId, itemId, completed } = body;

    if (!planId || !itemId) {
      return NextResponse.json({ error: "planId and itemId are required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch current plan
    const { data: plan, error: fetchError } = await supabase
      .from("study_plans")
      .select("*")
      .eq("id", planId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Update the specific item
    const items = (plan.items as PlanItem[]).map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          completed: completed !== undefined ? completed : !item.completed,
          completedAt: completed !== false ? new Date().toISOString() : null,
        };
      }
      return item;
    });

    const { error: updateError } = await supabase
      .from("study_plans")
      .update({ items, updated_at: new Date().toISOString() })
      .eq("id", planId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update plan" }, { status: 500 });
  }
}
