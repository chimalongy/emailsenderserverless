import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { configure } from "@trigger.dev/sdk";
import { tasks } from "@trigger.dev/sdk";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

// Admin client (bypasses RLS for inserts/checks)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST(request) {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: No authentication token provided' },
        { status: 401 }
      );
    }

    const userSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or expired session' },
        { status: 401 }
      );
    }

    // ── 2. Parse body ─────────────────────────────────────────────────────────
    const body = await request.json();
    const { name, domain, startDate } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Automation name is required.' },
        { status: 400 }
      );
    }
    if (!domain?.trim()) {
      return NextResponse.json(
        { success: false, error: 'A sending domain is required.' },
        { status: 400 }
      );
    }
    if (!startDate) {
      return NextResponse.json(
        { success: false, error: 'A start date is required.' },
        { status: 400 }
      );
    }

    // ── 3. Duplicate name check ───────────────────────────────────────────────
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('auto_outbounds')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', name.trim()) // case-insensitive match
      .maybeSingle();

    if (checkError) {
      console.error('Duplicate check error:', checkError);
      return NextResponse.json(
        { success: false, error: 'Database error while checking for duplicates.' },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'duplicate_name',
          message: `An outbound automation named "${name.trim()}" already exists. Please choose a different name.`,
        },
        { status: 409 }
      );
    }

    // ── 4. Insert ─────────────────────────────────────────────────────────────
    const { data: created, error: insertError } = await supabaseAdmin
      .from('auto_outbounds')
      .insert({
        user_id: user.id,
        name: name.trim(),
        domain: domain.trim(),
        start_date: startDate,
        status: 'active',
        emails_sent: 0,
        campaigns_completed: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create outbound automation.' },
        { status: 500 }
      );
    }

    // trigger a auto-outbound setup trigger. dev task here
    const payload = {
      autoOutboundId: created.id,
      userId: user.id,
      domain: domain.trim(),
      name: name.trim(),
      startDate
    };
    console.log(JSON.stringify(payload));

    const handle = await tasks.trigger("auto-outbound-setup", payload);


    return NextResponse.json({ success: true, data: created, triggerRunId: handle.id }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in auto-outbounds/create:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected server error.' },
      { status: 500 }
    );
  }
}
