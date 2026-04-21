/**
 * Ambient weather effects for outdoor scenes.
 * Falling particles with zone-specific color/speed/density.
 * Enabled per-scene from the world-scene list below.
 */
import * as Phaser from 'phaser';

export type WeatherKind = 'none' | 'rain' | 'snow' | 'ash' | 'petals' | 'fog' | 'embers';

const WEATHER_BY_SCENE: Record<string, WeatherKind> = {
  TownScene: 'petals',
  GreenhollowScene: 'petals',
  MossbarrowScene: 'fog',
  IronveilScene: 'none',
  DuskmereScene: 'rain',
  AshenmereScene: 'fog',
  AshfieldsScene: 'embers',
  FrosthollowScene: 'snow',
  ShatteredCoastScene: 'rain',
  // Dungeons get ash/embers inside (DepthsFloor3, AshenTowerF3)
  DepthsFloor3Scene: 'ash',
  AshenTowerF1Scene: 'embers',
  AshenTowerF2Scene: 'embers',
  AshenTowerF3Scene: 'embers',
  FrozenHollowF1Scene: 'snow',
  FrozenHollowF2Scene: 'snow',
  FrozenHollowF3Scene: 'snow',
  ThroneBeneathF1Scene: 'ash',
  ThroneBeneathF2Scene: 'ash',
  ThroneBeneathF3Scene: 'ash',
};

export function getWeatherForScene(sceneKey: string): WeatherKind {
  return WEATHER_BY_SCENE[sceneKey] ?? 'none';
}

interface Particle {
  sprite: Phaser.GameObjects.GameObject;
  vx: number;
  vy: number;
  life: number;
}

export function spawnWeather(scene: Phaser.Scene, kind: WeatherKind, worldW: number, worldH: number): () => void {
  if (kind === 'none') return () => {};
  // Reduce motion accessibility
  const reduceMotion = (window as { __reduceMotion?: boolean }).__reduceMotion === true;
  if (reduceMotion) return () => {};

  const particles: Particle[] = [];
  const count = kind === 'fog' ? 6 : kind === 'rain' ? 80 : kind === 'snow' ? 60 : kind === 'embers' ? 35 : 40;

  const spawn = () => {
    if (kind === 'fog') {
      const x = Phaser.Math.Between(0, worldW);
      const y = Phaser.Math.Between(0, worldH);
      const r = Phaser.Math.Between(80, 180);
      const g = scene.add.circle(x, y, r, 0xaaaaaa, 0.08);
      g.setDepth(200);
      scene.tweens.add({
        targets: g,
        x: x + Phaser.Math.Between(-200, 200),
        alpha: 0.12,
        duration: 18000 + Math.random() * 10000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      particles.push({ sprite: g, vx: 0, vy: 0, life: Infinity });
      return;
    }

    if (kind === 'rain') {
      const line = scene.add.rectangle(
        Phaser.Math.Between(0, worldW),
        Phaser.Math.Between(-20, worldH),
        1, 10, 0x88aaee, 0.6,
      ).setDepth(220);
      line.setRotation(0.15);
      particles.push({ sprite: line, vx: 1.5, vy: 9, life: 1 });
      return;
    }

    if (kind === 'snow') {
      const flake = scene.add.circle(
        Phaser.Math.Between(0, worldW),
        Phaser.Math.Between(-20, worldH),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.Between(5, 9) / 10,
      ).setDepth(220);
      particles.push({
        sprite: flake,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 0.8 + Math.random() * 0.7,
        life: 1,
      });
      return;
    }

    if (kind === 'ash') {
      const ash = scene.add.rectangle(
        Phaser.Math.Between(0, worldW),
        Phaser.Math.Between(-20, worldH),
        2, 2, 0x444444, 0.7,
      ).setDepth(220);
      particles.push({
        sprite: ash,
        vx: (Math.random() - 0.3) * 0.4,
        vy: 0.5 + Math.random() * 0.5,
        life: 1,
      });
      return;
    }

    if (kind === 'embers') {
      const color = [0xff8040, 0xffa040, 0xff6020][Math.floor(Math.random() * 3)];
      const ember = scene.add.circle(
        Phaser.Math.Between(0, worldW),
        Phaser.Math.Between(0, worldH),
        Phaser.Math.Between(1, 2),
        color, 0.85,
      ).setDepth(220);
      particles.push({
        sprite: ember,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.3 + Math.random() * 0.6), // embers rise
        life: 1,
      });
      return;
    }

    if (kind === 'petals') {
      const color = [0xffc0cb, 0xff9999, 0xffffff, 0xf8d878][Math.floor(Math.random() * 4)];
      const petal = scene.add.rectangle(
        Phaser.Math.Between(0, worldW),
        Phaser.Math.Between(-20, worldH),
        3, 2, color, 0.8,
      ).setDepth(220);
      petal.setRotation(Math.random() * Math.PI);
      particles.push({
        sprite: petal,
        vx: (Math.random() - 0.3) * 0.8,
        vy: 0.4 + Math.random() * 0.5,
        life: 1,
      });
      return;
    }
  };

  // Seed with particles
  for (let i = 0; i < count; i++) spawn();

  // Update loop
  let running = true;
  const step = () => {
    if (!running) return;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (!p.sprite.active) {
        particles.splice(i, 1);
        continue;
      }
      const s = p.sprite as Phaser.GameObjects.Rectangle;
      if (p.life !== Infinity) {
        s.x += p.vx;
        s.y += p.vy;
        // Slight rotation drift for petals
        if (kind === 'petals') s.rotation += 0.02;
        // Respawn if offscreen
        if (s.y > worldH + 20 || s.y < -30 || s.x < -30 || s.x > worldW + 30) {
          s.destroy();
          particles.splice(i, 1);
          spawn();
        }
      }
    }
    if (running) requestAnimationFrame(step);
  };
  step();

  return () => {
    running = false;
    for (const p of particles) {
      if (p.sprite.active) p.sprite.destroy();
    }
    particles.length = 0;
  };
}
