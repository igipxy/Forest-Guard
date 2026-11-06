import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return NextResponse.json(
    {
      reportId: params.id,
      exportFormat: 'PDF_PRINT_READY',
      generatedAt: new Date().toISOString(),
    },
    { status: 200 }
  );
}
