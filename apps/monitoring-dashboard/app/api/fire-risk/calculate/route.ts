import { NextResponse } from 'next/server';
import { FireRiskEngineService } from '@/services/fire-risk.service';
import { WeatherService } from '@/services/weather.service';

export async function POST(request: Request): Promise<NextResponse> {
  const weatherService = new WeatherService();
  const riskEngine = new FireRiskEngineService();

  let dryDaysOverride: number | undefined;
  try {
    const body = (await request.json()) as { dryDays?: number };
    if (typeof body.dryDays === 'number') {
      dryDaysOverride = body.dryDays;
    }
  } catch {
    // Use default weather telemetry
  }

  const latestWeather = await weatherService.getLatestWeather();
  const prediction = riskEngine.computeRisk(latestWeather, dryDaysOverride);
  return NextResponse.json(prediction, { status: 200 });
}
