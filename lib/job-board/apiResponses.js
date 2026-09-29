import { NextResponse } from 'next/server';

export function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
