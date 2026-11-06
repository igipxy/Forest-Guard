import { NextResponse } from 'next/server';
import { NotificationService } from '@/services/notification.service';
import { resolveServerAuthContext } from '@/lib/auth';

const notificationService = new NotificationService();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const authContext = await resolveServerAuthContext(request);

  try {
    const updated = await notificationService.transitionAlertStatus(
      params.id,
      'ACKNOWLEDGED',
      authContext.userId
    );

    if (!updated) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: `Alert with ID ${params.id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: 'ACKNOWLEDGE_FAILED',
        message: err instanceof Error ? err.message : 'Failed to acknowledge alert',
      },
      { status: 500 }
    );
  }
}