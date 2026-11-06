import { NextResponse } from 'next/server';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { SystemLogger } from './logger';

export async function validateRequestBody<T>(
  request: Request,
  schema: ZodSchema<T>,
  endpoint: string
): Promise<{ data: T } | { errorResponse: NextResponse }> {
  try {
    const raw: unknown = await request.json();
    const parsed = schema.parse(raw);
    return { data: parsed };
  } catch (err: unknown) {
    let message = 'Malformed JSON request body';
    if (err instanceof ZodError) {
      message = err.issues
        .map((issue: ZodIssue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
    } else if (err instanceof Error) {
      message = err.message;
    }

    await SystemLogger.log({
      level: 'WARN',
      httpStatus: 400,
      errorCategory: 'HTTP_400',
      message: `Validation error on ${endpoint}: ${message}`,
      requestEndpoint: endpoint,
      requestMethod: request.method,
      sourceService: 'ValidationMiddleware',
    });

    return {
      errorResponse: NextResponse.json(
        { error: 'BAD_REQUEST', message },
        { status: 400 }
      ),
    };
  }
}