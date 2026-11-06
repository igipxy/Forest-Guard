'use client';

import React, { useMemo, useState } from 'react';
import {
  CameraDevice,
  ContributingFactor,
  DailyFireRiskReport,
  FireRiskPrediction,
  SystemAlert,
  SystemLogEntry,
  UserRole,
  WeatherData,
} from '@fire-monitoring/shared';
import { RuleBasedFireRiskModel } from '@/services/fire-risk.service';
import { HlsVideoPlayer } from '@/components/camera/HlsVideoPlayer';
import { Flame, Plus } from 'lucide-react';

type ModuleTab =
  | 'Overview'
  | 'Weather Monitoring'
  | 'Live Cameras'
  | 'Fire Risk Analysis'
  | 'Daily Reports'
  | 'Alerts & Notifications'
  | 'System Logs'
  | 'Settings';

const MODULES: readonly ModuleTab[] = [
  'Overview',
  'Weather Monitoring',
  'Live Cameras',
  'Fire Risk Analysis',
  'Daily Reports',
  'Alerts & Notifications',
  'System Logs',
  'Settings',
];

const fireRiskModel = new RuleBasedFireRiskModel();

export default function MonitoringCenterShell(): React.JSX.Element {
  const [activeModule, setActiveModule] = useState<ModuleTab>('Overview');
  const [role, setRole] = useState<UserRole>('OPERATOR');
  const [dryDays, setDryDays] = useState<number>(6);

  const [weather, setWeather] = useState<WeatherData>({
    id: 'w-init-01',
    stationId: '35.73.01.1001',
    locationName: 'Malang Highland Sector A',
    temperatureC: 31.8,
    windSpeedKmh: 21.4,
    pressureHpa: null,
    uvIndex: null,
    solarRadiationWm2: null,
    precipitationMm: 0.0,
    lastRainfallAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
    humidityPct: 44.0,
    recordedAt: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
    isFallback: false,
    dataSource: 'BMKG_LIVE',
  });

  const [cameras, setCameras] = useState<CameraDevice[]>([
    {
      id: 'cam-01',
      name: 'Tower Alpha - North Pine Ridge',
      code: 'CCTV-MLG-01',
      location: 'Sector A - North Pine Ridge',
      status: 'ONLINE',
      streamStatus: 'PLAYABLE',
      streamPlayable: true,
      streamProtocol: 'HLS',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      isDemoStream: true,
      lastHeartbeatAt: new Date().toISOString(),
      lastConnectedAt: new Date().toISOString(),
      errorStatus: 'NONE',
      errorMessage: null,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cam-02',
      name: 'Tower Bravo - Savanna Basin',
      code: 'CCTV-MLG-02',
      location: 'Sector B - Savanna Basin',
      status: 'ONLINE',
      streamStatus: 'UNAVAILABLE',
      streamPlayable: false,
      streamProtocol: 'HLS',
      streamUrl: 'https://invalid-relay.local/live.m3u8',
      isDemoStream: true,
      lastHeartbeatAt: new Date().toISOString(),
      lastConnectedAt: new Date().toISOString(),
      errorStatus: 'STREAM_UNREACHABLE',
      errorMessage: 'Camera is ONLINE, but #EXTM3U manifest validation failed (HTTP 502)',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cam-03',
      name: 'Tower Charlie - East Corridor',
      code: 'CCTV-MLG-03',
      location: 'Sector C - East Transmission Corridor',
      status: 'OFFLINE',
      streamStatus: 'UNAVAILABLE',
      streamPlayable: false,
      streamProtocol: 'HLS',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      isDemoStream: true,
      lastHeartbeatAt: new Date(Date.now() - 3600_000).toISOString(),
      lastConnectedAt: new Date(Date.now() - 7200_000).toISOString(),
      errorStatus: 'HEARTBEAT_EXPIRED',
      errorMessage: 'Camera heartbeat expired (>90s without telemetry).',
      updatedAt: new Date().toISOString(),
    },
  ]);

  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [newCamName, setNewCamName] = useState<string>('');
  const [newCamCode, setNewCamCode] = useState<string>('');
  const [newCamLocation, setNewCamLocation] = useState<string>('');
  const [newCamUrl] = useState<string>(
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
  );

  const [alerts, setAlerts] = useState<SystemAlert[]>([
    {
      id: 'alt-init-1',
      dedupKey: 'CAMERA_STREAM_UNAVAILABLE:cam-02',
      title: 'HLS Stream Unavailable on Online Camera (CCTV-MLG-02)',
      severity: 'WARNING',
      category: 'CAMERA',
      status: 'CREATED',
      occurrenceCount: 1,
      lastSeenAt: new Date().toISOString(),
      description: 'Tower Bravo is ONLINE, but HLS manifest validation returned HTTP 502.',
      location: 'Sector B - Savanna Basin',
      relatedCameraId: 'cam-02',
      isRead: false,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedAt: null,
      createdAt: new Date().toISOString(),
    },
  ]);

  const [logs] = useState<SystemLogEntry[]>([
    {
      id: 'log-init-1',
      timestamp: new Date().toISOString(),
      level: 'WARN',
      httpStatus: 502,
      errorCategory: 'STREAM_FAILURE',
      message: 'HLS probe failed for CCTV-MLG-02: missing #EXTM3U header',
      requestEndpoint: 'https://invalid-relay.local/live.m3u8',
      requestMethod: 'GET',
      sourceService: 'CameraSyncService',
      stackTrace:
        'Error: HLS 502 Bad Gateway\n    at CameraSyncService.probeManifest (camera.service.ts:112:15)',
    },
  ]);

  const [reports, setReports] = useState<DailyFireRiskReport[]>([
    {
      id: 'rep-2026-11-06',
      reportDate: '2026-11-06',
      maxTemperatureC: 33.4,
      avgWindSpeedKmh: 21.4,
      totalPrecipitationMm: 0.0,
      avgHumidityPct: 44.0,
      lastRainfallAt: weather.lastRainfallAt,
      dailyRiskScore: 54,
      riskClassification: 'MODERATE',
      highestRiskPeriod: '13:00 - 15:00 WIB',
      vulnerableAreas: ['Sector B - Savanna Basin'],
      riskFactorAnalysis:
        'Environmental Susceptibility Report: Warm temperatures and 6 dry days elevated afternoon susceptibility.',
      recommendedActions: [
        'Maintain 15-minute BMKG synchronization cadence.',
        'Inspect HLS relay on Tower Bravo (CCTV-MLG-02).',
      ],
      recordCount: 8,
      generatedAt: new Date().toISOString(),
    },
  ]);

  // Evaluate fire susceptibility using the canonical RuleBasedFireRiskModel
  const riskPrediction: Omit<FireRiskPrediction, 'id' | 'predictedAt'> = useMemo(
    () => fireRiskModel.evaluate(weather, dryDays),
    [weather, dryDays]
  );

  const handleRegisterCamera = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!newCamName.trim() || !newCamCode.trim()) return;

    const created: CameraDevice = {
      id: `cam-${Date.now()}`,
      name: newCamName.trim(),
      code: newCamCode.trim(),
      location: newCamLocation.trim() || 'Sector D - Highland Perimeter',
      status: 'ONLINE',
      streamStatus: 'PLAYABLE',
      streamPlayable: true,
      streamProtocol: 'HLS',
      streamUrl: newCamUrl.trim(),
      isDemoStream: true,
      lastHeartbeatAt: new Date().toISOString(),
      lastConnectedAt: new Date().toISOString(),
      errorStatus: 'NONE',
      errorMessage: null,
      updatedAt: new Date().toISOString(),
    };

    setCameras((prev: CameraDevice[]) => [created, ...prev]);
    setShowRegisterModal(false);
    setNewCamName('');
    setNewCamCode('');
    setNewCamLocation('');
  };

  const updateCameraState = (
    code: string,
    nextStatus: 'ONLINE' | 'OFFLINE',
    nextStreamStatus: 'PLAYABLE' | 'UNAVAILABLE'
  ): void => {
    setCameras((prev: CameraDevice[]) =>
      prev.map((c: CameraDevice): CameraDevice => {
        if (c.code !== code) return c;
        const isPlayable = nextStatus === 'ONLINE' && nextStreamStatus === 'PLAYABLE';
        return {
          ...c,
          status: nextStatus,
          streamStatus: nextStatus === 'OFFLINE' ? 'UNAVAILABLE' : nextStreamStatus,
          streamPlayable: isPlayable,
          errorStatus:
            nextStatus === 'OFFLINE'
              ? 'HARDWARE_FAULT'
              : isPlayable
              ? 'NONE'
              : 'INVALID_MANIFEST',
          errorMessage:
            nextStatus === 'OFFLINE'
              ? 'Camera transitioned to OFFLINE.'
              : isPlayable
              ? null
              : 'Invalid HLS stream (#EXTM3U check failed).',
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const triggerExtremeDrySpell = (): void => {
    setDryDays(14);
    setWeather((prev: WeatherData): WeatherData => ({
      ...prev,
      temperatureC: 40.5,
      humidityPct: 19.0,
      windSpeedKmh: 39.0,
      uvIndex: 10.5,
      precipitationMm: 0.0,
      dataSource: 'DEMO_SIMULATION',
      isFallback: true,
      syncedAt: new Date().toISOString(),
    }));

    const extremeAlert: SystemAlert = {
      id: `alt-ext-${Date.now()}`,
      dedupKey: 'FIRE_RISK:EXTREME',
      title: 'Extreme Fire Susceptibility Detected (Score 96/100)',
      severity: 'CRITICAL',
      category: 'FIRE_RISK',
      status: 'CREATED',
      occurrenceCount: 1,
      lastSeenAt: new Date().toISOString(),
      description:
        'Heuristic environmental susceptibility reached EXTREME (40.5°C, 19% humidity, 14 dry days).',
      location: 'Sector A & Sector B',
      relatedCameraId: null,
      isRead: false,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedAt: null,
      createdAt: new Date().toISOString(),
    };
    setAlerts((prev: SystemAlert[]) => [extremeAlert, ...prev]);
  };

  const acknowledgeAlert = (id: string): void => {
    setAlerts((prev: SystemAlert[]) =>
      prev.map((a: SystemAlert): SystemAlert =>
        a.id === id
          ? {
              ...a,
              status: 'ACKNOWLEDGED',
              acknowledged: true,
              isRead: true,
              acknowledgedBy: 'operator-01',
              acknowledgedAt: new Date().toISOString(),
            }
          : a
      )
    );
  };

  const handleGenerateDailyReport = (): void => {
    const today = new Date().toISOString().slice(0, 10);
    const createdReport: DailyFireRiskReport = {
      id: `rep-${Date.now()}`,
      reportDate: today,
      maxTemperatureC: weather.temperatureC,
      avgWindSpeedKmh: weather.windSpeedKmh,
      totalPrecipitationMm: weather.precipitationMm,
      avgHumidityPct: weather.humidityPct,
      lastRainfallAt: weather.lastRainfallAt,
      dailyRiskScore: riskPrediction.riskScore,
      riskClassification: riskPrediction.classification,
      highestRiskPeriod: '13:30 - 15:30 WIB',
      vulnerableAreas: riskPrediction.vulnerableAreas,
      riskFactorAnalysis: `Environmental Susceptibility Report generated for ${today}: Risk score ${riskPrediction.riskScore}/100 (${riskPrediction.classification}).`,
      recommendedActions: [
        'Deploy patrol observation on high-susceptibility sectors.',
        'Confirm HLS stream playability across all online towers.',
      ],
      recordCount: 8,
      generatedAt: new Date().toISOString(),
    };
    setReports((prev: DailyFireRiskReport[]) => [createdReport, ...prev]);
  };

  const onlineCamerasCount = cameras.filter((c: CameraDevice) => c.status === 'ONLINE').length;
  const offlineCamerasCount = cameras.filter((c: CameraDevice) => c.status === 'OFFLINE').length;

  return (
    <div className="flex min-h-screen bg-[#0B1220] text-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-slate-800 bg-[#111827] p-4">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <Flame className="h-6 w-6 text-[#38BDF8]" />
          <div>
            <span className="text-sm font-bold tracking-wide text-slate-100">
              FOREST GUARD
            </span>
            <p className="text-[11px] text-slate-400">Monitoring & CCTV Center</p>
          </div>
        </div>

        <nav className="space-y-1">
          {MODULES.map((mod: ModuleTab) => (
            <button
              key={mod}
              type="button"
              onClick={() => setActiveModule(mod)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                activeModule === mod
                  ? 'bg-[#38BDF8]/15 text-[#38BDF8]'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <span>{mod}</span>
              {mod === 'Alerts & Notifications' && (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400">
                  {alerts.filter((a: SystemAlert) => a.status === 'CREATED').length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-[#111827] px-6 py-3.5">
          <div>
            <h1 className="text-lg font-bold text-slate-100">
              Fire Risk Monitoring & Live CCTV Dashboard
            </h1>
            <p className="text-xs text-slate-400">
              Data Source:{' '}
              <span className="font-semibold text-[#38BDF8]">{weather.dataSource}</span> | Last
              Sync: {new Date(weather.syncedAt).toLocaleTimeString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setRole((r: UserRole) => (r === 'OPERATOR' ? 'ADMIN' : 'OPERATOR'))
              }
              className="rounded border border-slate-700 bg-[#172033] px-3 py-1.5 text-xs font-semibold text-slate-200"
            >
              Role: {role}
            </button>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
          {/* KPI Summary Row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-[#172033] p-4">
              <p className="text-xs text-slate-400">Ambient Temperature</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">
                {weather.temperatureC !== null
                  ? `${weather.temperatureC.toFixed(1)} °C`
                  : 'Unavailable'}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Humidity:{' '}
                {weather.humidityPct !== null
                  ? `${weather.humidityPct.toFixed(1)}%`
                  : 'Unavailable'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#172033] p-4">
              <p className="text-xs text-slate-400">Susceptibility Score</p>
              <p className="mt-1 text-2xl font-bold text-[#F59E0B]">
                {riskPrediction.riskScore}/100 ({riskPrediction.classification})
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Weather-Based Indicator (Not Confirmed Fire)
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#172033] p-4">
              <p className="text-xs text-slate-400">CCTV Fleet Status</p>
              <p className="mt-1 text-2xl font-bold text-[#22C55E]">
                {onlineCamerasCount} Online / {offlineCamerasCount} Offline
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Total Registered: {cameras.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#172033] p-4">
              <p className="text-xs text-slate-400">Atmospheric Pressure & UV</p>
              <p className="mt-1 text-lg font-bold text-slate-200">
                {weather.pressureHpa !== null ? `${weather.pressureHpa} hPa` : 'Unavailable'} /{' '}
                {weather.uvIndex !== null ? `UV ${weather.uvIndex}` : 'Unavailable'}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Unprovided BMKG sensors shown as Unavailable
              </p>
            </div>
          </div>

          {/* Module: Weather Monitoring */}
          {(activeModule === 'Overview' || activeModule === 'Weather Monitoring') && (
            <section className="rounded-xl border border-slate-800 bg-[#172033] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-100">
                    BMKG Weather Telemetry ({weather.locationName})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Source Badge: {weather.dataSource}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={triggerExtremeDrySpell}
                    className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30"
                  >
                    Simulate Extreme Dry Spell
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Module: Live Cameras */}
          {(activeModule === 'Overview' || activeModule === 'Live Cameras') && (
            <section className="rounded-xl border border-slate-800 bg-[#172033] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-100">
                  Live CCTV Camera Fleet & Stream Validation
                </h2>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#38BDF8] px-3 py-1.5 text-xs font-semibold text-slate-950"
                >
                  <Plus className="h-4 w-4" /> Register Camera
                </button>
              </div>

              {showRegisterModal && (
                <form
                  onSubmit={handleRegisterCamera}
                  className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-700 bg-[#111827] p-4 md:grid-cols-4"
                >
                  <input
                    placeholder="Camera Name"
                    value={newCamName}
                    onChange={(e) => setNewCamName(e.target.value)}
                    className="rounded border border-slate-700 bg-[#172033] px-3 py-1.5 text-xs text-slate-100"
                    required
                  />
                  <input
                    placeholder="Camera Code"
                    value={newCamCode}
                    onChange={(e) => setNewCamCode(e.target.value)}
                    className="rounded border border-slate-700 bg-[#172033] px-3 py-1.5 text-xs text-slate-100"
                    required
                  />
                  <input
                    placeholder="Sector / Location"
                    value={newCamLocation}
                    onChange={(e) => setNewCamLocation(e.target.value)}
                    className="rounded border border-slate-700 bg-[#172033] px-3 py-1.5 text-xs text-slate-100"
                    required
                  />
                  <button
                    type="submit"
                    className="rounded bg-[#22C55E] px-3 py-1.5 text-xs font-semibold text-slate-950"
                  >
                    Save Camera
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {cameras.map((cam: CameraDevice) => (
                  <div
                    key={cam.id}
                    className="rounded-lg border border-slate-800 bg-[#111827] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-100">{cam.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {cam.code} — {cam.location}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <span
                          data-testid={`status-badge-${cam.code}`}
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            cam.status === 'ONLINE'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {cam.status}
                        </span>
                        <span
                          data-testid={`stream-badge-${cam.code}`}
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            cam.streamStatus === 'PLAYABLE'
                              ? 'bg-sky-500/20 text-sky-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {cam.streamStatus}
                        </span>
                      </div>
                    </div>

                    <HlsVideoPlayer camera={cam} />

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        data-testid={`set-online-${cam.code}`}
                        onClick={() => updateCameraState(cam.code, 'ONLINE', 'PLAYABLE')}
                        className="rounded bg-emerald-500/15 px-2 py-1 text-[10px] text-emerald-300"
                      >
                        Set Online + Valid HLS
                      </button>
                      <button
                        type="button"
                        data-testid={`set-broken-stream-${cam.code}`}
                        onClick={() => updateCameraState(cam.code, 'ONLINE', 'UNAVAILABLE')}
                        className="rounded bg-amber-500/15 px-2 py-1 text-[10px] text-amber-300"
                      >
                        Simulate Invalid HLS
                      </button>
                      <button
                        type="button"
                        data-testid={`set-offline-${cam.code}`}
                        onClick={() => updateCameraState(cam.code, 'OFFLINE', 'UNAVAILABLE')}
                        className="rounded bg-red-500/15 px-2 py-1 text-[10px] text-red-300"
                      >
                        Set Offline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Module: Fire Risk Analysis */}
          {activeModule === 'Fire Risk Analysis' && (
            <section className="rounded-xl border border-slate-800 bg-[#172033] p-5">
              <h2 className="text-sm font-bold text-slate-100">
                Weighted Heuristic Fire Susceptibility Breakdown ({riskPrediction.modelVersion})
              </h2>
              <p className="mt-1 text-xs text-amber-300">{riskPrediction.disclaimer}</p>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
                {riskPrediction.contributingFactors.map((f: ContributingFactor) => (
                  <div
                    key={f.parameter}
                    className="rounded-lg border border-slate-800 bg-[#111827] p-3"
                  >
                    <p className="text-xs text-slate-400">
                      {f.parameter} ({Math.round(f.weight * 100)}%)
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-100">{f.value}</p>
                    <p className="mt-1 text-xs text-[#38BDF8]">
                      +{f.contributionScore} pts ({f.impactLevel})
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Module: Daily Reports */}
          {activeModule === 'Daily Reports' && (
            <section className="rounded-xl border border-slate-800 bg-[#172033] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-100">
                  Daily Fire Risk Reports
                </h2>
                <button
                  type="button"
                  onClick={handleGenerateDailyReport}
                  className="rounded-lg bg-[#38BDF8] px-3 py-1.5 text-xs font-semibold text-slate-950"
                >
                  Generate Daily Report
                </button>
              </div>
              <div className="space-y-3">
                {reports.map((rep: DailyFireRiskReport) => (
                  <div
                    key={rep.id}
                    className="rounded-lg border border-slate-800 bg-[#111827] p-4"
                  >
                    <p className="text-xs font-bold text-slate-100">
                      Environmental Susceptibility Report — {rep.reportDate} (Score:{' '}
                      {rep.dailyRiskScore}/100 {rep.riskClassification})
                    </p>
                    <p className="mt-1 text-xs text-slate-300">{rep.riskFactorAnalysis}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Module: Alerts & Notifications */}
          {activeModule === 'Alerts & Notifications' && (
            <section className="rounded-xl border border-slate-800 bg-[#172033] p-5">
              <h2 className="mb-3 text-sm font-bold text-slate-100">
                Real-Time Alerts (Lifecycle: CREATED → ACKNOWLEDGED → RESOLVED)
              </h2>
              <div className="space-y-2.5">
                {alerts.map((alt: SystemAlert) => (
                  <div
                    key={alt.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#111827] p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                          {alt.severity}
                        </span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                          {alt.status}
                        </span>
                        <p className="text-xs font-bold text-slate-100">{alt.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{alt.description}</p>
                    </div>
                    {alt.status === 'CREATED' && (
                      <button
                        type="button"
                        onClick={() => acknowledgeAlert(alt.id)}
                        className="rounded bg-[#38BDF8]/20 px-3 py-1 text-xs font-semibold text-[#38BDF8]"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Module: System Logs */}
          {activeModule === 'System Logs' && (
            <section className="rounded-xl border border-slate-800 bg-[#172033] p-5">
              <h2 className="mb-3 text-sm font-bold text-slate-100">
                System Logs (Active RBAC Role: {role})
              </h2>
              <div className="space-y-2">
                {logs.map((log: SystemLogEntry) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-slate-800 bg-[#111827] p-3 text-xs"
                  >
                    <p className="font-semibold text-slate-200">
                      [{log.level}] {log.sourceService} — {log.message}
                    </p>
                    {role === 'ADMIN' && log.stackTrace ? (
                      <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-2 text-[11px] text-slate-400">
                        {log.stackTrace}
                      </pre>
                    ) : (
                      <p className="mt-1 text-[11px] italic text-slate-500">
                        Stack trace restricted to ADMIN role.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Module: Settings */}
          {activeModule === 'Settings' && (
            <section className="rounded-xl border border-slate-800 bg-[#172033] p-5">
              <h2 className="text-sm font-bold text-slate-100">
                Alert Thresholds & Monitoring Preferences
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Server secrets (SUPABASE_SERVICE_ROLE_KEY, CAMERA_API_SECRET) are isolated on the
                server and never exposed to the client.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}