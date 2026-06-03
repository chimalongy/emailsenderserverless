import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-fallback';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find the user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid login credentials' },
        { status: 401 }
      );
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid login credentials' },
        { status: 401 }
      );
    }

    // Create JWT payload
    const payload = {
      id: user.id,
      email: user.email,
    };

    // Sign token
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // Update last_sign_in_at
    await supabase
      .from('users')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('id', user.id);

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: payload
    });

    // Set cookie
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
