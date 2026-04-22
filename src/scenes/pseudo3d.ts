/**
 * Pseudo-3D enhancement layer.
 *
 * Drops sprite shadows, Y-sort depth, and ambient lighting over the
 * existing 2D top-down game to make it read as "almost 3D" without
 * rewriting to a real 3D engine.
 *
 * Toggle with USE_PSEUDO_3D. Shadows, Y-sort, and lighting are all
 * opt-in at the scene level via enable(scene, options).
 */
import * as Phaser from 'phaser';

/** Master switch — set false to disable all pseudo-3D effects. */
export const USE_PSEUDO_3D = true;

interface ShadowedSprite {
  target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | Phaser.GameObjects.GameObject;
  shadow: Phaser.GameObjects.Ellipse;
  /** Offset below the sprite for the shadow anchor. */
  offsetY: number;
  /** Shadow ellipse dimensions. */
  width: number;
  height: number;
  /** If set, shadow intensity fluctuates (e.g., torches). */
  flicker: boolean;
}

/**
 * Scene-level pseudo-3D controller. Tracks shadows + Y-sorted objects,
 * runs updates per frame.
 */
export class Pseudo3d {
  private scene: Phaser.Scene;
  private shadows: ShadowedSprite[] = [];
  private ySortObjects: Phaser.GameObjects.GameObject[] = [];
  private vignette: Phaser.GameObjects.Rectangle | null = null;
  private ambientOverlay: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Attach a soft drop shadow to a sprite. Shadow is an ellipse below
   * the sprite's feet that follows it around the scene. Width/height
   * default to reasonable values for a character-sized sprite.
   */
  addShadow(
    target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | Phaser.GameObjects.GameObject,
    opts?: { width?: number; height?: number; offsetY?: number; alpha?: number; flicker?: boolean }
  ): Phaser.GameObjects.Ellipse {
    const width = opts?.width ?? 22;
    const height = opts?.height ?? 6;
    const offsetY = opts?.offsetY ?? 16;
    const alpha = opts?.alpha ?? 0.45;

    const t = target as Phaser.GameObjects.Components.Transform;
    const shadow = this.scene.add.ellipse(t.x, t.y + offsetY, width, height, 0x000000, alpha);
    // Depth: slightly below target so it sits under it but above the ground
    shadow.setDepth(((target as Phaser.GameObjects.Components.Depth).depth ?? 10) - 0.5);

    this.shadows.push({ target, shadow, offsetY, width, height, flicker: opts?.flicker ?? false });
    return shadow;
  }

  /**
   * Register a sprite for Y-sorted depth. Sprite's depth = y coordinate,
   * so taller (further-south-on-screen) things render in front. Combined
   * with the fact that sprite bottoms are the visual "feet," this gives
   * a natural character-walks-behind-tree illusion.
   */
  ySort(obj: Phaser.GameObjects.GameObject): void {
    this.ySortObjects.push(obj);
  }

  /**
   * Add an ambient lighting vignette that darkens the scene edges so the
   * camera center feels "lit" and corners fall off — subtle depth cue.
   */
  addAmbientVignette(color = 0x0a0605, edgeAlpha = 0.35, cam?: Phaser.Cameras.Scene2D.Camera): void {
    const c = cam ?? this.scene.cameras.main;
    // Four rectangles fade from transparent at center to the edge alpha
    // at the border. Simpler than a true radial gradient but effective.
    const top = this.scene.add.rectangle(c.centerX, 40, c.width, 80, color, edgeAlpha);
    const bot = this.scene.add.rectangle(c.centerX, c.height - 40, c.width, 80, color, edgeAlpha);
    const left = this.scene.add.rectangle(40, c.centerY, 80, c.height, color, edgeAlpha * 0.7);
    const right = this.scene.add.rectangle(c.width - 40, c.centerY, 80, c.height, color, edgeAlpha * 0.7);
    for (const r of [top, bot, left, right]) {
      r.setScrollFactor(0);
      r.setDepth(298);  // above world, below HUD modals
      r.setBlendMode(Phaser.BlendModes.MULTIPLY);
    }
  }

  /**
   * Add a soft warm ambient overlay (dawn/dusk tint). Set alpha low
   * (0.08-0.15). Call with color = 0xfff0b0 for warm, 0x4060a0 for cool.
   */
  addAmbientTint(color: number, alpha: number, cam?: Phaser.Cameras.Scene2D.Camera): void {
    const c = cam ?? this.scene.cameras.main;
    if (this.ambientOverlay) this.ambientOverlay.destroy();
    this.ambientOverlay = this.scene.add.rectangle(
      c.centerX, c.centerY, c.width, c.height, color, alpha,
    );
    this.ambientOverlay.setScrollFactor(0);
    this.ambientOverlay.setDepth(297);
    this.ambientOverlay.setBlendMode(Phaser.BlendModes.OVERLAY);
  }

  /** Per-frame update — follows shadows, applies Y-sort depths. */
  update(time: number): void {
    // Update shadow positions
    for (let i = this.shadows.length - 1; i >= 0; i--) {
      const s = this.shadows[i];
      const t = s.target as Phaser.GameObjects.Components.Transform & { active?: boolean; destroyed?: boolean };
      // If target is destroyed, remove its shadow too
      if (!t || (t as unknown as { scene: unknown }).scene === undefined || (t.active === false && t.destroyed === true)) {
        s.shadow.destroy();
        this.shadows.splice(i, 1);
        continue;
      }
      try {
        s.shadow.x = t.x;
        s.shadow.y = t.y + s.offsetY;
        if (s.flicker) {
          // Subtle alpha pulse for torches / lanterns
          s.shadow.setAlpha(0.35 + Math.sin(time * 0.005) * 0.08);
        }
      } catch { /* target destroyed */ }
    }

    // Y-sort depth
    for (const obj of this.ySortObjects) {
      const o = obj as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Depth;
      if (o.setDepth && typeof o.y === 'number') {
        o.setDepth(10 + o.y * 0.01);
      }
    }
  }

  /** Cleanup — call on scene shutdown. */
  destroy(): void {
    for (const s of this.shadows) {
      try { s.shadow.destroy(); } catch { /* ignore */ }
    }
    this.shadows = [];
    this.ySortObjects = [];
    if (this.vignette) this.vignette.destroy();
    if (this.ambientOverlay) this.ambientOverlay.destroy();
  }
}
