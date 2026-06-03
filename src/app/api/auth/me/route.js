import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-fallback';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // We don't need to check the DB on every request if we trust the JWT, 
      // but we can just return the payload.
      return NextResponse.json({
        user: {
          id: decoded.id,
          email: decoded.email
        }
      });
    } catch (err) {
      // Invalid or expired token
      return NextResponse.json({ user: null }, { status: 401 });
    }
  } catch (error) {
    console.error('Me endpoint error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
