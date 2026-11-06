import { NextResponse } from 'next/server';
import { ReportService } from '@/services/report.service';
import { WeatherService } from '@/services/weather.service';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

  const weatherService = new WeatherService();
  const reportService = new ReportService();

  try {
    const history = await weatherService.getHistoricalWeather('DAILY');
    const normalizedHistory = history.map((record) => ({
      ...record,
      recordedAt: `${dateParam}T12:00:00.000Z`,
    }));
    const report = await reportService.generateReportForDate(dateParam, normalizedHistory);
    return NextResponse.json({ reports: [report] }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: 'REPORT_NOT_AVAILABLE', message: err instanceof Error ? err.message : 'Unable to generate report' },
      { status: 404 }
    );
  }
}
