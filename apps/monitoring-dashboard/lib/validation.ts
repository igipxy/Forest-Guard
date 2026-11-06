import { NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { SystemLogger } from './logger';

export async function validateRequestBody<T>(
  request: Request,
  schema: ZodSchema<T>,
  endpoint: string
): Promise<{ data: T } | { errorResponse: NextResponse }> {
  try {
    const raw = await request.json();
    const parsed = schema.parse(raw);
    return { data: parsed };
  } catch (err) {
    const message =
      err instanceof ZodError
        ? err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
        : 'Malformed JSON request body';

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