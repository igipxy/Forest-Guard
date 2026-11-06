'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls, { ErrorData, Events } from 'hls.js';
import { CameraDevice } from '@fire-monitoring/shared';
import { AlertTriangle, WifiOff, RefreshCw, Maximize2, Loader2 } from 'lucide-react';

interface HlsVideoPlayerProps {
  camera: CameraDevice;
  onRetryValidation?: (cameraId: string) => void;
}

const MAX_HLS_RECOVERIES = 2;

export const HlsVideoPlayer: React.FC<HlsVideoPlayerProps> = ({
  camera,
  onRetryValidation,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const recoveryCountRef = useRef<number>(0);
  const [runtimeStreamError, setRuntimeStreamError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);

  useEffect(() => {
    setRuntimeStreamError(null);
    recoveryCountRef.current = 0;

    if (camera.status === 'OFFLINE') {
      setIsBuffering(false);
      return;
    }

    if (camera.streamStatus === 'CHECKING') {
      setIsBuffering(true);
      return;
    }

    if (camera.streamStatus === 'UNAVAILABLE' || !camera.streamPlayable) {
      setIsBuffering(false);
      setRuntimeStreamError(
        camera.errorMessage ?? 'Stream manifest unreachable despite ONLINE camera status.'
      );
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });

      hls.loadSource(camera.streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => null);
        });
      });

      hls.on(Hls.Events.ERROR, (_event: Events.ERROR, data: ErrorData) => {
        if (!data.fatal) return;

        if (
          data.type === Hls.ErrorTypes.NETWORK_ERROR &&
          recoveryCountRef.current < MAX_HLS_RECOVERIES
        ) {
          recoveryCountRef.current += 1;
          hls?.startLoad();
          return;
        }

        if (
          data.type === Hls.ErrorTypes.MEDIA_ERROR &&
          recoveryCountRef.current < MAX_HLS_RECOVERIES
        ) {
          recoveryCountRef.current += 1;
          hls?.recoverMediaError();
          return;
        }

        setIsBuffering(false);
        setRuntimeStreamError(`HLS Fatal Error: ${data.details}`);
        hls?.destroy();
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = camera.streamUrl;
      const handleLoaded = () => {
        setIsBuffering(false);
        video.play().catch(() => null);
      };
      video.addEventListener('loadedmetadata', handleLoaded);
      return () => {
        video.removeEventListener('loadedmetadata', handleLoaded);
      };
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [
    camera.status,
    camera.streamStatus,
    camera.streamPlayable,
    camera.streamUrl,
    camera.errorMessage,
  ]);

  const handleFullscreen = (): void => {
    if (containerRef.current?.requestFullscreen) {
      void containerRef.current.requestFullscreen();
    }
  };

  if (camera.status === 'OFFLINE') {
    return (
      <div className="relative flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-slate-800 bg-[#0B1220] p-4 text-center">
        <WifiOff className="mb-2 h-8 w-8 text-red-500" />
        <p className="text-sm font-semibold text-slate-200">CAMERA OFFLINE</p>
        <p className="mt-1 max-w-xs text-xs text-slate-400">
          {camera.errorMessage ?? 'No heartbeat signal from Camera Management Web.'}
        </p>
      </div>
    );
  }

  if (camera.streamStatus === 'CHECKING') {
    return (
      <div className="relative flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-sky-500/30 bg-[#0B1220] p-4 text-center">
        <Loader2 className="mb-2 h-8 w-8 animate-spin text-sky-400" />
        <p className="text-sm font-semibold text-sky-300">CHECKING HLS STREAM...</p>
      </div>
    );
  }

  if (camera.streamStatus === 'UNAVAILABLE' || !camera.streamPlayable || runtimeStreamError) {
    return (
      <div className="relative flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-amber-500/40 bg-[#0B1220] p-4 text-center">
        <AlertTriangle className="mb-2 h-8 w-8 text-amber-500" />
        <p className="text-sm font-semibold text-amber-400">
          CAMERA ONLINE — STREAM UNAVAILABLE
        </p>
        <p className="mt-1 max-w-xs text-xs text-slate-400">
          {runtimeStreamError ?? camera.errorMessage}
        </p>
        {onRetryValidation && (
          <button
            type="button"
            onClick={() => onRetryValidation(camera.id)}
            className="mt-3 inline-flex items-center gap-1.5 rounded bg-sky-500/20 px-3 py-1 text-xs font-medium text-sky-400 hover:bg-sky-500/30"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Re-validate Stream
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-lg bg-black"
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
        controls={false}
      />
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-sky-400">
          Synchronizing HLS stream...
        </div>
      )}
      <button
        type="button"
        onClick={handleFullscreen}
        title="Open Fullscreen"
        className="absolute bottom-2 right-2 rounded bg-slate-900/80 p-1.5 text-slate-200 opacity-0 transition-opacity group-hover:opacity-100 hover:text-sky-400"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
};