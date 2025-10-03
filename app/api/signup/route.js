// app/api/signup/route.js
import { NextResponse } from 'next/server';
import { admin } from '@/lib/admin';

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const lower = (email || '').toLowerCase().trim();

    if (!lower || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // 1) Check allowlist (Firestore)
    const snap = await admin.firestore().collection('allowlist').doc(lower).get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: 'This email is not invited.' },
        { status: 403 }
      );
    }

    // 2) Create user if new; otherwise update their password
    try {
      const existing = await admin.auth().getUserByEmail(lower);
      await admin.auth().updateUser(existing.uid, { password });
      return NextResponse.json({ ok: true, existing: true });
    } catch {
      // user not found → create
      await admin.auth().createUser({
        email: lower,
        password,
        emailVerified: false,
      });
      return NextResponse.json({ ok: true, created: true });
    }
  } catch (err) {
    console.error('signup route error:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
