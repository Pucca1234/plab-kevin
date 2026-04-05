import { NextResponse } from "next/server";
import { getRequestUser } from "../../lib/supabase/requestUser";
import { supabaseServer } from "../../lib/supabaseServer";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("filter_templates")
    .select("*")
    .or(`user_id.eq.${user.id},is_shared.eq.true`)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; config?: unknown; is_shared?: boolean; is_default?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { name, config, is_shared, is_default } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  if (!config || typeof config !== "object") {
    return NextResponse.json({ error: "config is required." }, { status: 400 });
  }

  if (is_default) {
    await supabaseServer
      .from("filter_templates")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true);
  }

  const { data, error } = await supabaseServer
    .from("filter_templates")
    .insert({
      user_id: user.id,
      name: name.trim(),
      config,
      is_shared: is_shared ?? false,
      is_default: is_default ?? false
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template: data }, { status: 201 });
}
