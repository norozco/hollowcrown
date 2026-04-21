import { useEffect, useRef } from 'react';
import { useMapMarkerStore } from '../../state/mapMarkerStore';
import './Minimap.css';

declare global {
  interface Window {
    __currentMap?: {
      sceneKey?: string;
      zoneName: string | null;
      playerX: number;
      playerY: number;
      worldW: number;
      worldH: number;
      exits: Array<{ x: number; y: number }>;
      enemies: Array<{ x: number; y: number }>;
    };
  }
}

const W = 140;
const H = 90;

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const map = window.__currentMap;
      const canvas = canvasRef.current;
      if (!map || !canvas || !map.zoneName) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = '#0a0a10';
      ctx.fillRect(0, 0, W, H);

      // Exit markers — yellow dots
      ctx.fillStyle = '#c8a820';
      for (const exit of map.exits) {
        const ex = (exit.x / map.worldW) * W;
        const ey = (exit.y / map.worldH) * H;
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Enemy dots — red
      ctx.fillStyle = '#c03030';
      for (const enemy of map.enemies) {
        const ex = (enemy.x / map.worldW) * W;
        const ey = (enemy.y / map.worldH) * H;
        ctx.beginPath();
        ctx.arc(ex, ey, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player-placed pins — yellow diamonds
      const markers = map.sceneKey
        ? useMapMarkerStore.getState().forScene(map.sceneKey)
        : [];
      for (const marker of markers) {
        const mx = (marker.x / map.worldW) * W;
        const my = (marker.y / map.worldH) * H;
        ctx.fillStyle = '#ffd43a';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mx, my - 4);
        ctx.lineTo(mx + 3, my);
        ctx.lineTo(mx, my + 4);
        ctx.lineTo(mx - 3, my);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Player dot — white, pulsing
      const px = (map.playerX / map.worldW) * W;
      const py = (map.playerY / map.worldH) * H;
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
      ctx.fillStyle = `rgba(255,255,255,${pulse})`;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = '#3a2818';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const map = window.__currentMap;
  if (!map?.zoneName) return null;

  return (
    <div className="minimap">
      <div className="minimap__name">{map.zoneName}</div>
      <canvas ref={canvasRef} width={W} height={H} className="minimap__canvas" />
    </div>
  );
}
