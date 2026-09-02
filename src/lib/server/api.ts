import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly possibleNextActions: string[] = [],
    public readonly errorDetails?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        ok: false,
        summary: error.message,
        error: {
          code: error.code,
          message: error.message,
          retryable: error.status >= 500,
          ...error.errorDetails,
        },
        possibleNextActions: error.possibleNextActions,
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        summary: "The request contains invalid or incomplete fields.",
        error: {
          code: "VALIDATION_ERROR",
          message: "Correct the fields described in details and try again.",
          retryable: false,
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        possibleNextActions: [],
      },
      { status: 400 },
    );
  }

  console.error(error);
  return NextResponse.json(
    {
      ok: false,
      summary: "Haggle could not complete that request.",
      error: {
        code: "INTERNAL_ERROR",
        message: "The marketplace encountered an unexpected error.",
        retryable: true,
      },
      possibleNextActions: [],
    },
    { status: 500 },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The request body must be valid JSON.");
  }
}
