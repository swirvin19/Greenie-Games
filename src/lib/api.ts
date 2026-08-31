import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof AuthError) return jsonError(401, err.message);
  if (err instanceof ZodError) {
    return jsonError(400, err.issues.map((i) => i.message).join("; "));
  }
  if (err instanceof HttpError) {
    return jsonError(err.statusCode, err.message);
  }
  console.error(err);
  return jsonError(500, "Internal server error");
}

export class HttpError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
