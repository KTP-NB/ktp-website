import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FirebaseScrypt } from 'firebase-scrypt';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // 1. Initialize Supabase Admin Client using your Service Role Key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY, 
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 2. Find the brother in the system
    const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = usersData.users.find(u => u.email === email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Check if they still need migrating
    const { firebase_hash, firebase_salt } = user.user_metadata || {};
    if (!firebase_hash || !firebase_salt) {
      return NextResponse.json({ message: "Already migrated" }, { status: 200 });
    }

    // 4. Initialize the Firebase Decryption Ring (Node.js loves this!)
    const scrypt = new FirebaseScrypt({
      memCost: parseInt(process.env.FIREBASE_MEM_COST),
      rounds: parseInt(process.env.FIREBASE_ROUNDS),
      saltSeparator: process.env.FIREBASE_SALT_SEPARATOR,
      signerKey: process.env.FIREBASE_SIGNER_KEY
    });

    // 5. Verify their plaintext password against the old Firebase Hash
    const isValid = await scrypt.verify(password, firebase_salt, firebase_hash);

    if (isValid) {
      // 6. SUCCESS! Natively update their password to standard Bcrypt
      await supabase.auth.admin.updateUserById(user.id, {
        password: password,
        user_metadata: {
          ...user.user_metadata,
          firebase_hash: null, 
          firebase_salt: null
        }
      });
      
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

  } catch (error) {
    console.error("Migration API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}