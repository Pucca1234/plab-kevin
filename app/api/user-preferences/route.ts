import { NextResponse } from "next/server";
import { getRequestUser } from "../../lib/supabase/requestUser";
import { supabaseServer } from "../../lib/supabaseServer";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("user_preferences")
    .select("default_tab_config, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: data ?? null });
}

export async function PUT(request: Request) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { default_tab_config?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.default_tab_config !== undefined && body.default_tab_config !== null && typeof body.default_tab_config !== "object") {
    return NextResponse.json({ error: "default_tab_config must be an object or null." }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("user_preferences")
    .upsert(
      {
        user_id: user.id,
        default_tab_config: body.default_tab_config ?? null,
      },
      { onConflict: "user_id" }
    )
    .select("default_tab_config, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: data });
}
