import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

// Standard API response format
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message } satisfies ApiResponse, { status });
}

export function serverError(err: unknown) {
  console.error("[API ERROR]", err instanceof Error ? err.stack : err);
  const message = err instanceof Error ? err.message : "Internal server error";
  return error(message, 500);
}

// Validate request body against a Zod schema
export async function parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}

// Validate and return parsed body, or throw ApiValidationError
export async function validateBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ApiValidationError(err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; "));
    }
    throw err;
  }
}

export class ApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiValidationError";
  }
}

// Wrap route handler with error handling
export function withErrorHandling(handler: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        return error(err.message, 400);
      }
      return serverError(err);
    }
  };
}

// Date range query helper
export function dateRangeParams(url: URL) {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limit = parseInt(url.searchParams.get("limit") || "100", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  return { from, to, limit: Math.min(limit, 500), offset: Math.max(offset, 0) };
}

// Get today's date in Eastern time as YYYY-MM-DD
export function todayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

// Get current timestamp in ISO format
export function nowISO(): string {
  return new Date().toISOString();
}
