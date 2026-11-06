import { cameraEventBus } from '@/services/camera-registry.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      sendEvent({ type: 'SSE_CONNECTED', timestamp: new Date().toISOString() });

      const unsubscribe = cameraEventBus.subscribe((event) => {
        sendEvent(event);
      });

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
      }, 15_000);

      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  });
}