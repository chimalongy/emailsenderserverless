import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-fallback';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.id;
  } catch (err) {
    return null;
  }
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('sales_letter_templates')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sales_letter_templates: user?.sales_letter_templates || {}
    });
  } catch (error) {
    console.error('Unexpected error in GET templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { templates } = body;

    if (!templates) {
      return NextResponse.json({ error: 'Templates payload is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ sales_letter_templates: templates })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user templates:', error);
      return NextResponse.json({ error: error.message || 'Failed to save templates' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Templates saved successfully' });
  } catch (error) {
    console.error('Unexpected error in POST templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
