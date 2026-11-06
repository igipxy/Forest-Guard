import { NextResponse } from 'next/server';
import { WeatherService } from '@/services/weather.service';
import { FireRiskEngineService } from '@/services/fire-risk.service';
import { WeatherData } from '@fire-monitoring/shared';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const weatherService = new WeatherService();
  const riskEngine = new FireRiskEngineService();

  const history = await weatherService.getHistoricalWeather('DAILY');
  const trends = history.map((w: WeatherData) => riskEngine.computeRisk(w));
  return NextResponse.json({ trends }, { status: 200 });
}
