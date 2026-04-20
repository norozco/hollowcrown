import * as Phaser from 'phaser';
import { useCombatStore } from '../state/combatStore';
import { usePlayerStore } from '../state/playerStore';
import { type StatusEffects } from '../engine/combat';
import { generateTileset, TILE_SIZE } from './tiles/generateTiles';
import {
  generateCharacterSprite,
  playerPalette,
  SPRITE_H,
} from './sprites/generateSprites';
import { generateMonsterSprite } from './sprites/generateMonsters';
import { usePlayerStore as _PS } from '../state/playerStore';

/**
 * Visual battle scene — player sprite on the left, enemy on the right,
 * floating HP bars, attack slide animations, damage numbers.
 *
 * The React CombatOverlay renders action buttons on top of this scene.
 * This scene handles only the VISUAL side.
 */

export class CombatScene extends Phaser.Scene {
  private playerSprite!: Phaser.GameObjects.Sprite;
  private enemySprite!: Phaser.GameObjects.Sprite;
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private enemyHpBar!: Phaser.GameObjects.Graphics;
  private statusIconsGfx!: Phaser.GameObjects.Graphics;
  private playerHpText!: Phaser.GameObjects.Text;
  private enemyHpText!: Phaser.GameObjects.Text;
  // Name refs stored but only used for positioning in create.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private lastLogLength = 0;
  private playerBaseX = 0;
  private enemyBaseX = 0;
  private combatEnded = false;
  private deathScreenShown = false;
  private deathAnimPlayed = false;
  private savedReturnScene = 'TownScene';
  private savedReturnX = 0;
  private savedReturnY = 0;

  constructor() {
    super({ key: 'CombatScene' });
  }

  create(): void {
    const W = 1280, H = 720;

    // Remove combat-specific textures so they regenerate fresh each fight.
    // This prevents stale sprites from fight N appearing in fight N+1.
    if (this.textures.exists('combat-player')) this.textures.remove('combat-player');
    const monsterKey = useCombatStore.getState().monster?.key ?? 'wolf';
    const monsterSpriteKey = `monster-${monsterKey}`;
    if (this.textures.exists(monsterSpriteKey)) this.textures.remove(monsterSpriteKey);

    // Background — ALTTP-style battlefield with sky, ground layers, and details
    generateTileset(this);

    // Sky gradient (upper 40%)
    this.add.rectangle(W / 2, H * 0.1, W, H * 0.2, 0x304868);
    this.add.rectangle(W / 2, H * 0.2, W, H * 0.2, 0x405880);
    this.add.rectangle(W / 2, H * 0.35, W, H * 0.1, 0x506890);

    // Horizon line
    this.add.rectangle(W / 2, H * 0.4, W, 4, 0x88a850).setAlpha(0.5);

    // Ground layers (multiple shades for depth)
    this.add.rectangle(W / 2, H * 0.45, W, H * 0.1, 0x58b028);
    this.add.rectangle(W / 2, H * 0.55, W, H * 0.2, 0x48a020);
    this.add.rectangle(W / 2, H * 0.7, W, H * 0.2, 0x389018);
    this.add.rectangle(W / 2, H * 0.85, W, H * 0.3, 0x306818);

    // Distant trees/bushes on the horizon
    for (let ti = 0; ti < 8; ti++) {
      const tx = 60 + ti * 160 + Phaser.Math.Between(-30, 30);
      const ty = H * 0.38 + Phaser.Math.Between(-5, 5);
      this.add.circle(tx, ty, Phaser.Math.Between(12, 20), 0x2a6818).setAlpha(0.5).setDepth(1);
      this.add.circle(tx + 8, ty - 4, Phaser.Math.Between(8, 14), 0x3a7828).setAlpha(0.4).setDepth(1);
    }

    // Grass tufts scattered on the ground
    for (let gi = 0; gi < 20; gi++) {
      const gx = Phaser.Math.Between(20, W - 20);
      const gy = Phaser.Math.Between(Math.floor(H * 0.5), H - 10);
      const shade = [0x68c838, 0x58b828, 0x48a818][gi % 3];
      this.add.triangle(gx, gy, 0, 4, 2, -4, 4, 4, shade).setAlpha(0.6).setDepth(1);
    }

    // Rocks on the ground
    for (let ri = 0; ri < 5; ri++) {
      const rx = Phaser.Math.Between(50, W - 50);
      const ry = Phaser.Math.Between(Math.floor(H * 0.65), H - 30);
      const rs = Phaser.Math.Between(4, 10);
      this.add.circle(rx, ry, rs, 0x606058).setAlpha(0.4).setDepth(1);
    }

    // Vignette overlay (dark edges for arena feel)
    const vignette = this.add.graphics().setDepth(50);
    vignette.fillStyle(0x000000, 0.3);
    vignette.fillRect(0, 0, W, 40);
    vignette.fillRect(0, H - 30, W, 30);
    for (let vi = 0; vi < 20; vi++) {
      vignette.fillStyle(0x000000, 0.01 * (20 - vi));
      vignette.fillRect(0, 40 + vi * 2, W, 2);
      vignette.fillRect(0, H - 30 - vi * 2, W, 2);
    }

    // Floating dust particles
    for (let di = 0; di < 8; di++) {
      const dust = this.add.circle(
        Phaser.Math.Between(50, W - 50),
        Phaser.Math.Between(50, H - 50),
        Phaser.Math.Between(1, 2),
        0xffffff, 0.15,
      ).setDepth(2);
      this.tweens.add({
        targets: dust,
        x: dust.x + Phaser.Math.Between(-40, 40),
        y: dust.y + Phaser.Math.Between(-30, 10),
        duration: 4000 + Math.random() * 3000,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // Player sprite (left side, facing right)
    const character = usePlayerStore.getState().character;
    if (character) {
      const rk = character.race.key;
      const ck = character.characterClass.key;
      generateCharacterSprite(this, 'combat-player', playerPalette(rk, ck, character.playerChoice), rk, ck, undefined, character.gender);
    }
    this.playerBaseX = W * 0.25;
    const playerY = H * 0.55;
    this.playerSprite = this.add.sprite(this.playerBaseX, playerY, 'combat-player', 2); // face right
    this.playerSprite.setFlipX(true);
    this.playerSprite.setScale(3); // 3x zoom for battle view
    this.playerSprite.setDepth(10);

    // Player shadow
    this.add.ellipse(this.playerBaseX, playerY + SPRITE_H * 1.2, 60, 16, 0x000000).setAlpha(0.2).setDepth(9);

    // Enemy sprite (right side) — pixel art monster
    const monster = useCombatStore.getState().monster;
    this.enemyBaseX = W * 0.72;
    const enemyY = H * 0.48;

    // monsterKey and monsterSpriteKey already declared above (texture cleanup).
    generateMonsterSprite(this, monsterSpriteKey, monsterKey);

    // Scale: wolves 3x, skeletons 3.5x, bosses 4x
    const enemyScale = monsterKey === 'hollow_knight' ? 4 : monsterKey === 'skeleton' ? 3.5 : 3;

    this.enemySprite = this.add.sprite(this.enemyBaseX, enemyY, monsterSpriteKey, 0);
    this.enemySprite.setScale(enemyScale);
    this.enemySprite.setDepth(10);

    // Enemy shadow
    const shadowW = 48 * enemyScale * 0.8;
    this.add.ellipse(this.enemyBaseX, enemyY + 24 * enemyScale * 0.5, shadowW, 16, 0x000000).setAlpha(0.2).setDepth(9);

    // Names
    this.add.text(this.playerBaseX, playerY - SPRITE_H * 1.8, character?.name ?? 'Hero', {
      fontFamily: 'Courier New', fontSize: '16px', color: '#f4d488',
      stroke: '#1a1008', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(this.enemyBaseX, enemyY - 24 * enemyScale - 30, monster?.name ?? 'Enemy', {
      fontFamily: 'Courier New', fontSize: '16px', color: '#ff8888',
      stroke: '#1a1008', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    // HP bars (Phaser graphics — updated each frame)
    this.playerHpBar = this.add.graphics().setDepth(20);
    this.enemyHpBar = this.add.graphics().setDepth(20);
    this.statusIconsGfx = this.add.graphics().setDepth(22);
    this.playerHpText = this.add.text(this.playerBaseX, playerY - SPRITE_H * 1.5, '', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(21);
    this.enemyHpText = this.add.text(this.enemyBaseX, enemyY - 24 * enemyScale - 12, '', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(21);

    this.lastLogLength = useCombatStore.getState().state?.log.length ?? 0;
    this.combatEnded = false;
    this.deathScreenShown = false;
    this.deathAnimPlayed = false;
    // Save return info NOW before finish() clears it.
    const combatState = useCombatStore.getState();
    this.savedReturnScene = combatState.returnScene ?? 'TownScene';
    this.savedReturnX = combatState.returnX;
    this.savedReturnY = combatState.returnY;

    // Fade in
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Boss intro cutscene — dramatic name reveal for bosses
    const bossKeys: Record<string, { subtitle: string; color: string; glow: number }> = {
      hollow_king: { subtitle: 'THE GATEKEEPER', color: '#a060c0', glow: 0x8040c0 },
      drowned_warden: { subtitle: 'THE KEEPER OF THE POOL', color: '#4888c0', glow: 0x4060a0 },
      crownless_one: { subtitle: 'HE WHO WAS FORGOTTEN', color: '#c040c0', glow: 0x8040c0 },
      the_forgotten: { subtitle: 'BEFORE THE NAMES', color: '#2a0040', glow: 0x1a0020 },
    };
    const bossMonsterKey = useCombatStore.getState().monster?.key;
    if (bossMonsterKey && bossKeys[bossMonsterKey]) {
      const info = bossKeys[bossMonsterKey];
      const bossName = useCombatStore.getState().monster?.name ?? '';
      // Dark overlay that fades in, then out
      const darkOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(60);
      // Name text
      const nameText = this.add.text(W / 2, H / 2 - 20, bossName.toUpperCase(), {
        fontFamily: 'Courier New', fontSize: '52px', color: info.color,
        stroke: '#000000', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(62).setAlpha(0);
      // Subtitle
      const subText = this.add.text(W / 2, H / 2 + 30, info.subtitle, {
        fontFamily: 'Courier New', fontSize: '16px', color: '#d4a968',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(62).setAlpha(0);
      // Glow ring behind the name
      const glowCircle = this.add.circle(W / 2, H / 2, 0, info.glow, 0.3).setDepth(61);

      // Sequence: darken, show name, hold, fade out
      this.tweens.add({
        targets: darkOverlay, alpha: 0.7, duration: 400, ease: 'Sine.easeIn',
      });
      this.tweens.add({
        targets: nameText, alpha: 1, duration: 600, delay: 300, ease: 'Sine.easeOut',
      });
      this.tweens.add({
        targets: subText, alpha: 0.85, duration: 600, delay: 600, ease: 'Sine.easeOut',
      });
      this.tweens.add({
        targets: glowCircle, radius: 200, alpha: 0, duration: 1200, delay: 300, ease: 'Power2',
      });
      // Camera shake mid-intro
      this.time.delayedCall(800, () => this.cameras.main.shake(300, 0.005));
      // Fade everything out
      this.time.delayedCall(2400, () => {
        this.tweens.add({
          targets: [darkOverlay, nameText, subText],
          alpha: 0, duration: 500,
          onComplete: () => {
            darkOverlay.destroy();
            nameText.destroy();
            subText.destroy();
            glowCircle.destroy();
          },
        });
      });
    }
  }

  update(): void {
    const store = useCombatStore.getState();
    const { state, monster } = store;
    const character = usePlayerStore.getState().character;

    // Combat finished — return to world scene.
    if (!state && this.combatEnded) return;
    if (!state && !this.combatEnded) {
      this.combatEnded = true;
      // Re-read return info — finish() may have overridden it (e.g. death → TownScene).
      const finalReturn = store.returnScene ?? this.savedReturnScene;
      const rx = store.returnX || this.savedReturnX;
      const ry = store.returnY || this.savedReturnY;
      // If returning to default (death respawn), use default spawn, not combat_return.
      const spawnPoint = (rx === 0 && ry === 0) ? 'default' : 'combat_return';
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(finalReturn, { spawnPoint, combatReturnX: rx, combatReturnY: ry });
      });
      return;
    }
    if (!state || !monster || !character) return;

    // "YOU DIED" screen on defeat
    if (state.phase === 'defeat' && !this.deathScreenShown) {
      this.deathScreenShown = true;
      const W = 1280, H = 720;
      // Red flash
      this.cameras.main.flash(300, 100, 0, 0);
      // YOU DIED text with fade-in
      const diedText = this.add.text(W / 2, H / 2, 'YOU DIED', {
        fontFamily: 'Courier New',
        fontSize: '64px',
        color: '#c03030',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(100).setAlpha(0);
      this.tweens.add({
        targets: diedText,
        alpha: 1,
        duration: 800,
        ease: 'Power2',
      });
    }

    // Update HP bars
    this.drawHpBar(this.playerHpBar, this.playerBaseX - 40, this.playerSprite.y - SPRITE_H * 1.6, 80,
      state.playerHp, character.derived.maxHp, 0x40a060);
    this.playerHpText.setText(`${state.playerHp}/${character.derived.maxHp}`);
    this.playerHpText.setPosition(this.playerBaseX, this.playerSprite.y - SPRITE_H * 1.5);

    const eY = this.enemySprite.y;
    const eScale = this.enemySprite.scale;
    const eHalfH = 24 * eScale;
    this.drawHpBar(this.enemyHpBar, this.enemyBaseX - 40, eY - eHalfH - 22, 80,
      state.monsterHp, monster.maxHp, 0xa04040);
    this.enemyHpText.setText(`${state.monsterHp}/${monster.maxHp}`);
    this.enemyHpText.setPosition(this.enemyBaseX, eY - eHalfH - 12);

    // Status effect indicators under HP bars
    this.statusIconsGfx.clear();
    this.drawStatusIcons(this.playerBaseX - 40, this.playerSprite.y - SPRITE_H * 1.3, state.playerStatus);
    this.drawStatusIcons(this.enemyBaseX - 40, eY - eHalfH - 4, state.monsterStatus);

    // Detect new log entries → trigger animations
    if (state.log.length > this.lastLogLength) {
      const newEntries = state.log.slice(this.lastLogLength);
      this.lastLogLength = state.log.length;

      for (const entry of newEntries) {
        if (entry.type === 'player_hit') {
          this.animatePlayerAttack(true);
          this.showDamageNumber(this.enemyBaseX, eY - eHalfH, entry.text);
        } else if (entry.type === 'player_miss') {
          this.animatePlayerAttack(false);
        } else if (entry.type === 'enemy_hit') {
          this.animateEnemyAttack();
          this.showDamageNumber(this.playerBaseX, this.playerSprite.y - SPRITE_H, entry.text);
          this.flashSprite(this.playerSprite);
        } else if (entry.type === 'enemy_miss') {
          this.animateEnemyAttack();
        } else {
          // Status-effect damage numbers
          if (entry.text.includes('Poison burns')) {
            this.showDamageNumber(this.playerBaseX, this.playerSprite.y - SPRITE_H, entry.text, '#60c060');
          } else if (entry.text.includes('Fire sears')) {
            this.showDamageNumber(this.playerBaseX, this.playerSprite.y - SPRITE_H, entry.text, '#e08030');
          } else if (entry.text.includes('Wound bleeds')) {
            this.showDamageNumber(this.playerBaseX, this.playerSprite.y - SPRITE_H, entry.text, '#d04040');
          }

          // Enemy death animation (triggered once when victory log appears)
          if (entry.text.includes('falls') && !this.deathAnimPlayed) {
            this.deathAnimPlayed = true;
            this.tweens.add({
              targets: this.enemySprite,
              alpha: 0, y: this.enemySprite.y + 30, angle: 15,
              duration: 800, ease: 'Power2',
            });
            // Death particles — red burst
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              const particle = this.add.circle(
                this.enemyBaseX + Math.cos(angle) * 10,
                this.enemySprite.y + Math.sin(angle) * 10,
                4, 0xc04040,
              ).setDepth(20);
              this.tweens.add({
                targets: particle,
                x: particle.x + Math.cos(angle) * 40,
                y: particle.y + Math.sin(angle) * 40,
                alpha: 0, duration: 600, onComplete: () => particle.destroy(),
              });
            }
            // Brief white screen flash
            this.cameras.main.flash(200, 255, 255, 255);
          }

          // Fireball spell effect
          if (entry.text.includes('Fireball erupts')) {
            const fireball = this.add.circle(this.enemyBaseX, this.enemySprite.y, 10, 0xf08020).setDepth(15);
            this.tweens.add({
              targets: fireball, scale: 4, alpha: 0, duration: 500,
              onComplete: () => fireball.destroy(),
            });
            for (let i = 0; i < 6; i++) {
              const fp = this.add.circle(
                this.enemyBaseX + Phaser.Math.Between(-20, 20),
                this.enemySprite.y + Phaser.Math.Between(-20, 10),
                3, [0xf08020, 0xf0c040, 0xf04020][i % 3],
              ).setDepth(16);
              this.tweens.add({
                targets: fp, y: fp.y - 30, alpha: 0, duration: 400 + i * 100,
                onComplete: () => fp.destroy(),
              });
            }
          }

          // Cure Wounds healing effect
          if (entry.text.includes('Divine light')) {
            for (let i = 0; i < 8; i++) {
              const hp = this.add.circle(
                this.playerBaseX + Phaser.Math.Between(-15, 15),
                this.playerSprite.y + 10,
                3, i % 2 === 0 ? 0x40c060 : 0xffffff,
              ).setAlpha(0.7).setDepth(16);
              this.tweens.add({
                targets: hp, y: hp.y - 40 - i * 5, alpha: 0,
                duration: 600 + i * 80, delay: i * 50,
                onComplete: () => hp.destroy(),
              });
            }
          }

          // Sneak Attack — player goes transparent, slash lines at enemy
          if (entry.text.includes('from the shadows')) {
            this.tweens.add({
              targets: this.playerSprite, alpha: 0.1, duration: 100, yoyo: true,
              onYoyo: () => {
                for (let i = 0; i < 3; i++) {
                  const eX = this.enemyBaseX;
                  const eY = this.enemySprite.y;
                  const slash = this.add.line(
                    0, 0,
                    eX - 40 + i * 8, eY - 15 + i * 10,
                    eX + 5 + i * 8, eY + 5 + i * 10,
                    0xd4d4ff,
                  ).setLineWidth(2).setAlpha(0.9).setDepth(15);
                  this.tweens.add({ targets: slash, alpha: 0, duration: 300, delay: i * 60, onComplete: () => slash.destroy() });
                }
              },
            });
          }

          // Level-up during combat — gold flash + floating text
          if (entry.text.toLowerCase().includes('level up') || entry.text.toLowerCase().includes('level') && entry.text.includes('!')) {
            this.cameras.main.flash(300, 212, 169, 104);
            const W = 1280;
            const lvlText = this.add.text(
              this.playerBaseX,
              this.playerSprite.y - SPRITE_H * 2,
              'LEVEL UP!',
              { fontFamily: 'Courier New', fontSize: '28px', color: '#f4d488', stroke: '#1a1008', strokeThickness: 4 },
            ).setOrigin(0.5).setDepth(40).setAlpha(0);
            void W; // suppress unused warning
            this.tweens.add({
              targets: lvlText,
              alpha: 1, y: lvlText.y - 30,
              duration: 400, ease: 'Power2',
              onComplete: () => {
                this.tweens.add({
                  targets: lvlText, alpha: 0, duration: 600, delay: 800,
                  onComplete: () => lvlText.destroy(),
                });
              },
            });
          }

          // ── Enemy special ability animations ──
          const pX = this.playerBaseX;
          const pY = this.playerSprite.y;
          const eX = this.enemyBaseX;
          const eY = this.enemySprite.y;

          // Fire: flame cone / breath
          if (entry.text.includes('flame') || entry.text.includes('Flame') || entry.text.includes('fire') || entry.text.includes('burns')) {
            for (let i = 0; i < 10; i++) {
              const t = i / 10;
              const fx = eX + (pX - eX) * t + Phaser.Math.Between(-12, 12);
              const fy = eY + (pY - eY) * t + Phaser.Math.Between(-12, 12);
              const color = [0xf08020, 0xf0c040, 0xf04020, 0xe06020][i % 4];
              const flame = this.add.circle(fx, fy, Phaser.Math.Between(3, 7), color).setDepth(16);
              this.tweens.add({
                targets: flame, alpha: 0, scale: 2,
                duration: 400, delay: i * 30,
                onComplete: () => flame.destroy(),
              });
            }
            this.cameras.main.shake(150, 0.005);
          }

          // Ice / frost: crystal shards + white flash
          if (entry.text.includes('Frost') || entry.text.includes('frost') || entry.text.includes('cold') || entry.text.includes('Glacial')) {
            for (let i = 0; i < 8; i++) {
              const crystal = this.add.triangle(
                pX + Phaser.Math.Between(-30, 30),
                pY + Phaser.Math.Between(-30, 30),
                0, -6, 4, 0, -4, 0,
                0xa0d0f0,
              ).setDepth(16);
              this.tweens.add({
                targets: crystal, alpha: 0, scale: 2, duration: 500,
                onComplete: () => crystal.destroy(),
              });
            }
          }

          // Avalanche: falling ice shards + big shake
          if (entry.text.includes('Avalanche') || entry.text.includes('mountain')) {
            this.cameras.main.shake(400, 0.015);
            for (let i = 0; i < 15; i++) {
              const x = Phaser.Math.Between(pX - 60, pX + 60);
              const shard = this.add.triangle(x, -10, 0, 0, 6, -12, 12, 0, 0x80c0e0).setDepth(20);
              this.tweens.add({
                targets: shard, y: pY + 20,
                duration: 400 + i * 30,
                onComplete: () => shard.destroy(),
              });
            }
          }

          // White Out: full white flash
          if (entry.text.includes('White') || entry.text.includes('white')) {
            this.cameras.main.flash(500, 255, 255, 255);
          }

          // Tidal Slam / water: splash
          if (entry.text.includes('Tidal') || entry.text.includes('wave') || entry.text.includes('water')) {
            for (let i = 0; i < 12; i++) {
              const angle = (i / 12) * Math.PI * 2;
              const drop = this.add.circle(pX, pY, Phaser.Math.Between(2, 5), 0x4888c0).setDepth(18);
              this.tweens.add({
                targets: drop,
                x: drop.x + Math.cos(angle) * 60,
                y: drop.y + Math.sin(angle) * 60,
                alpha: 0, duration: 500,
                onComplete: () => drop.destroy(),
              });
            }
            this.cameras.main.shake(150, 0.008);
          }

          // Erasure: dark overlay flash
          if (entry.text.includes('Erasure') || entry.text.includes('ceases')) {
            const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0).setDepth(100);
            this.tweens.add({
              targets: overlay, alpha: 0.85,
              duration: 120, yoyo: true,
              onComplete: () => overlay.destroy(),
            });
            this.cameras.main.shake(300, 0.01);
          }

          // Unmaking: dark purple vortex
          if (entry.text.includes('Unmaking') || entry.text.includes('unmakes')) {
            for (let i = 0; i < 20; i++) {
              const angle = (i / 20) * Math.PI * 2;
              const distance = 80;
              const p = this.add.circle(
                pX + Math.cos(angle) * distance,
                pY + Math.sin(angle) * distance,
                4, 0x8040c0,
              ).setDepth(17);
              this.tweens.add({
                targets: p,
                x: pX, y: pY,
                scale: 0, alpha: 0, duration: 600, delay: i * 20,
                onComplete: () => p.destroy(),
              });
            }
            this.cameras.main.shake(400, 0.008);
          }

          // Ash Storm: swirling grey
          if (entry.text.includes('Ash') || entry.text.includes('cinder')) {
            for (let i = 0; i < 14; i++) {
              const angle = (i / 14) * Math.PI * 2;
              const ash = this.add.circle(
                pX + Math.cos(angle) * 20,
                pY + Math.sin(angle) * 20,
                3, 0x606060, 0.7,
              ).setDepth(16);
              this.tweens.add({
                targets: ash,
                x: pX + Math.cos(angle) * 50,
                y: pY + Math.sin(angle) * 50,
                alpha: 0, duration: 700, delay: i * 30,
                onComplete: () => ash.destroy(),
              });
            }
          }

          // Molten Strike: red-hot slash trail
          if (entry.text.includes('Molten') || entry.text.includes('scorches') || entry.text.includes('sparks')) {
            const slash = this.add.line(0, 0, pX - 20, pY - 10, pX + 20, pY + 10, 0xff6020)
              .setLineWidth(4).setOrigin(0, 0).setDepth(16);
            this.tweens.add({
              targets: slash, alpha: 0, duration: 300,
              onComplete: () => slash.destroy(),
            });
          }
        }
      }
    }
  }

  private drawHpBar(gfx: Phaser.GameObjects.Graphics, x: number, y: number, w: number,
    current: number, max: number, color: number): void {
    gfx.clear();
    // Background with rounded rect
    gfx.fillStyle(0x0a0808, 0.9);
    gfx.fillRoundedRect(x - 2, y - 2, w + 4, 14, 4);
    // Border
    gfx.lineStyle(1, 0x3a2818, 1);
    gfx.strokeRoundedRect(x - 2, y - 2, w + 4, 14, 4);
    // Fill bar
    const pct = Math.max(0, current / max);
    const fillW = Math.round(w * pct);
    if (fillW > 0) {
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(x, y, fillW, 10, 3);
      // Bevel highlight on top half (lighter)
      gfx.fillStyle(0xffffff, 0.15);
      gfx.fillRect(x + 1, y + 1, fillW - 2, 4);
    }
  }

  /** Determine the player's weapon type for animation selection. */
  private getWeaponType(): string {
    const char = _PS.getState().character;
    return char?.weapon?.attackStat === 'int' ? 'staff'
      : char?.weapon?.range === 'ranged' ? 'bow'
      : char?.weapon?.damageKind === 'bludgeoning' ? 'mace'
      : char?.weapon?.key === 'dagger' ? 'dagger'
      : char?.weapon?.key === 'axe' ? 'axe'
      : 'sword';
  }

  /** Player attack — animation varies by weapon type. */
  private animatePlayerAttack(hit: boolean): void {
    const wep = this.getWeaponType();
    const eX = this.enemyBaseX;
    const eY = this.enemySprite.y;
    const pX = this.playerBaseX;
    const pY = this.playerSprite.y;

    if (wep === 'bow') {
      // RANGED: arrow projectile flies to enemy.
      const arrow = this.add.rectangle(pX + 40, pY, 16, 3, 0xc0b090).setDepth(15);
      const arrowHead = this.add.triangle(pX + 48, pY, 0, -4, 0, 4, 8, 0, 0xa0a098).setDepth(15);
      this.tweens.add({
        targets: [arrow, arrowHead], x: eX - 20, duration: 300, ease: 'Linear',
        onComplete: () => {
          arrow.destroy(); arrowHead.destroy();
          if (hit) this.cameras.main.shake(80, 0.004);
        },
      });
    } else if (wep === 'staff') {
      // RANGED: magic bolt flies to enemy.
      const bolt = this.add.circle(pX + 30, pY - 10, 8, 0x8060c0).setDepth(15);
      const glow = this.add.circle(pX + 30, pY - 10, 12, 0xa080e0).setAlpha(0.4).setDepth(14);
      this.tweens.add({
        targets: [bolt, glow], x: eX - 20, duration: 400, ease: 'Sine.easeIn',
        onComplete: () => {
          // Impact flash
          const flash = this.add.circle(eX - 20, eY, 20, 0xc0a0f0).setAlpha(0.7).setDepth(16);
          this.tweens.add({ targets: flash, alpha: 0, scale: 2, duration: 300, onComplete: () => flash.destroy() });
          bolt.destroy(); glow.destroy();
          if (hit) this.cameras.main.shake(100, 0.006);
        },
      });
    } else if (wep === 'dagger') {
      // MELEE: quick short lunge + multi-stab effect.
      this.tweens.add({
        targets: this.playerSprite, x: eX - 60, duration: 120, ease: 'Power3', yoyo: true,
        onYoyo: () => {
          // Multiple slash lines
          for (let i = 0; i < 3; i++) {
            const slash = this.add.line(0, 0, eX - 40, eY - 10 + i * 12, eX - 10, eY - 20 + i * 12, 0xffffff)
              .setLineWidth(2).setAlpha(0.8).setDepth(15);
            this.tweens.add({ targets: slash, alpha: 0, duration: 200, delay: i * 50, onComplete: () => slash.destroy() });
          }
          if (hit) this.cameras.main.shake(60, 0.003);
        },
      });
    } else if (wep === 'mace' || wep === 'axe') {
      // MELEE: overhead smash with impact sparks.
      this.tweens.add({
        targets: this.playerSprite, x: eX - 70, duration: 250, ease: 'Power2', yoyo: true,
        onYoyo: () => {
          // Impact sparks (star pattern)
          for (let a = 0; a < 6; a++) {
            const angle = (a / 6) * Math.PI * 2;
            const spark = this.add.circle(eX - 30 + Math.cos(angle) * 15, eY + Math.sin(angle) * 15, 3, 0xf0d040)
              .setDepth(15);
            this.tweens.add({
              targets: spark,
              x: spark.x + Math.cos(angle) * 20,
              y: spark.y + Math.sin(angle) * 20,
              alpha: 0, duration: 300, onComplete: () => spark.destroy(),
            });
          }
          if (hit) this.cameras.main.shake(150, 0.008);
        },
      });
    } else {
      // MELEE: sword — standard lunge + slash arc.
      this.tweens.add({
        targets: this.playerSprite, x: eX - 70, duration: 200, ease: 'Power2', yoyo: true,
        onYoyo: () => {
          // Slash arc (curved white line)
          const arc = this.add.arc(eX - 40, eY, 30, -60, 60, false, 0xffffff).setAlpha(0.7).setDepth(15);
          arc.setStrokeStyle(3, 0xffffff);
          arc.setFillStyle(0xffffff, 0);
          this.tweens.add({ targets: arc, alpha: 0, scale: 1.5, duration: 250, onComplete: () => arc.destroy() });
          if (hit) this.cameras.main.shake(100, 0.005);
        },
      });
    }
  }

  /** Enemy attack — lunges toward player. */
  private animateEnemyAttack(): void {
    this.tweens.add({
      targets: this.enemySprite,
      x: this.playerBaseX + 80,
      duration: 250,
      ease: 'Power2',
      yoyo: true,
    });
  }

  private flashSprite(sprite: Phaser.GameObjects.Sprite): void {
    this.tweens.add({
      targets: sprite,
      alpha: 0.2,
      duration: 80,
      yoyo: true,
      repeat: 2,
    });
  }

  private showDamageNumber(x: number, y: number, logText: string, colorOverride?: string): void {
    // Extract damage from log text
    const dmgMatch = logText.match(/(\d+) damage/);
    const text = dmgMatch ? `-${dmgMatch[1]}` : 'Miss';
    const color = colorOverride ?? (dmgMatch ? '#ff4040' : '#a0a060');

    const dmgText = this.add.text(x + Phaser.Math.Between(-20, 20), y, text, {
      fontFamily: 'Courier New', fontSize: '20px', color,
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: dmgText,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => dmgText.destroy(),
    });
  }

  private drawStatusIcons(x: number, y: number, status: StatusEffects): void {
    // Colors per effect: poison=green, burn=orange, bleed=red, stun=yellow, marked=blue
    const effectColors: Record<keyof StatusEffects, number> = {
      poison: 0x60c060,
      burn:   0xe08030,
      bleed:  0xd04040,
      stun:   0xe0e040,
      marked: 0x40a0e0,
    };

    // We clear and redraw each frame via the shared statusIconsGfx; drawing here
    // accumulates calls each frame so we use the graphics object cleared in update.
    // Each dot is drawn at an offset based on its position in the active list.
    let offsetX = 0;
    for (const [key, turns] of Object.entries(status) as [keyof StatusEffects, number][]) {
      if (turns <= 0) continue;
      const col = effectColors[key];
      this.statusIconsGfx.fillStyle(col, 0.9);
      this.statusIconsGfx.fillCircle(x + offsetX + 5, y + 5, 5);
      this.statusIconsGfx.lineStyle(1, 0x000000, 0.6);
      this.statusIconsGfx.strokeCircle(x + offsetX + 5, y + 5, 5);
      offsetX += 14;
    }
  }
}
