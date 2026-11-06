import { NextResponse } from 'next/server';
import { WeatherService } from '@/services/weather.service';

export async function POST(request: Request): Promise<NextResponse> {
  let adm4: string | undefined;
  try {
    const body = (await request.json()) as { adm4?: string };
    adm4 = body.adm4;
  } catch {
    // Use default station code
  }

  const weatherService = new WeatherService();
  const weather = await weatherService.getLatestWeather(adm4);
  return NextResponse.json(weather, { status: 200 });
}
