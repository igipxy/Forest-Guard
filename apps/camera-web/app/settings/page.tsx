import React from 'react';

export default function CameraSettingsPage(): React.JSX.Element {
  return (
    <main style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Camera Management Settings</h1>
      <p>Configure stream probe timeouts and heartbeat TTL thresholds.</p>
    </main>
  );
}
