/**
 * Folders API Route
 * Handles CRUD operations for flashcard folders
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * GET - Fetch all folders for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 });
    }

    // Fetch user's folders
    const { data: folders, error } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Folders API] Fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
    }

    // If no folders exist, create default "Unsorted" folder
    if (!folders || folders.length === 0) {
      const { data: unsortedFolder, error: createError } = await supabase
        .from("folders")
        .insert({ user_id: user.id, name: "Unsorted" })
        .select()
        .single();

      if (createError) {
        console.error("[Folders API] Failed to create default folder:", createError);
        return NextResponse.json({ folders: [] });
      }

      return NextResponse.json({ folders: [unsortedFolder] });
    }

    return NextResponse.json({ folders });
  } catch (error: any) {
    console.error("[Folders API] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST - Create a new folder
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Folders API] POST request received');
    
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      console.error('[Folders API] No authorization header');
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    console.log('[Folders API] Token:', token ? 'Present' : 'Missing');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[Folders API] Auth error:', authError);
      console.error('[Folders API] User:', user);
      return NextResponse.json({ error: "Invalid authentication", details: authError?.message }, { status: 401 });
    }

    console.log('[Folders API] User authenticated:', user.id);

    const body = await request.json();
    const { name } = body;
    console.log('[Folders API] Folder name:', name);

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      console.error('[Folders API] Invalid folder name');
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    // Create folder
    console.log('[Folders API] Attempting to insert folder:', { user_id: user.id, name: name.trim() });
    const { data: folder, error } = await supabase
      .from("folders")
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single();

    if (error) {
      console.error('[Folders API] Database error:', JSON.stringify(error, null, 2));
      if (error.code === "23505") { // Unique constraint violation
        return NextResponse.json({ error: "Folder already exists" }, { status: 409 });
      }
      return NextResponse.json({ 
        error: "Failed to create folder", 
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    console.log('[Folders API] Folder created successfully:', folder);
    return NextResponse.json({ folder });
  } catch (error: any) {
    console.error("[Folders API] POST error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * PATCH - Rename a folder
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name } = body;

    if (!id || !name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Folder ID and name are required" }, { status: 400 });
    }

    // Update folder
    const { error } = await supabase
      .from("folders")
      .update({ name: name.trim() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[Folders API] Update error:", error);
      return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Folders API] PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE - Delete a folder (sets flashcard folder_id to NULL)
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("id");

    if (!folderId) {
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });
    }

    // Delete folder (ON DELETE SET NULL will handle flashcards)
    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", folderId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[Folders API] Delete error:", error);
      return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Folders API] DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
