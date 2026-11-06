import React from 'react';

export default function CameraWebHomePage(): React.JSX.Element {
  return (
    <main style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Forest Guard — Camera Management Web (Port 3001)</h1>
      <p>Active REST & SSE Endpoints: /api/v1/cameras, /api/v1/cameras/:id/heartbeat, /api/v1/cameras/events</p>
    </main>
  );
}