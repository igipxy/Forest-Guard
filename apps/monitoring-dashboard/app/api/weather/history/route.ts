import { NextResponse } from 'next/server';
import { WeatherService } from '@/services/weather.service';
import { WeatherTimeRange } from '@fire-monitoring/shared';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const rawRange = searchParams.get('range');
  const range: WeatherTimeRange =
    rawRange === 'WEEKLY' || rawRange === 'MONTHLY' ? rawRange : 'DAILY';

  const weatherService = new WeatherService();
  const records = await weatherService.getHistoricalWeather(range);
  return NextResponse.json({ range, records }, { status: 200 });
}
