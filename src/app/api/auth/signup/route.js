import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert into custom users table
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash,
        is_anonymous: false,
        confirmed_at: new Date().toISOString()
      })
      .select('id, email')
      .single();

    if (error) {
      // Handle unique violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'User already exists' },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Signup successful',
      user: data
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error during signup' },
      { status: 500 }
    );
  }
}
