import * as Phaser from 'phaser';
import { useCombatStore } from '../state/combatStore';
import { usePlayerStore } from '../state/playerStore';
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
  private playerHpText!: Phaser.GameObjects.Text;
  private enemyHpText!: Phaser.GameObjects.Text;
  // Name refs stored but only used for positioning in create.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private lastLogLength = 0;
  private playerBaseX = 0;
  private enemyBaseX = 0;
  private combatEnded = false;
  private savedReturnScene = 'TownScene';
  private savedReturnX = 0;
  private savedReturnY = 0;

  constructor() {
    super({ key: 'CombatScene' });
  }

  create(): void {
    const W = 1280, H = 720;

    // Background — grassy battlefield
    generateTileset(this);
    // Simple grass fill
    this.add.rectangle(W / 2, H / 2, W, H, 0x48a020);
    // Some grass variation
    for (let y = 0; y < H; y += TILE_SIZE) {
      for (let x = 0; x < W; x += TILE_SIZE) {
        if ((x + y) % 96 === 0) {
          this.add.rectangle(x + 16, y + 16, TILE_SIZE, TILE_SIZE, 0x58b028).setAlpha(0.4);
        }
      }
    }
    // Ground shadow for depth
    this.add.rectangle(W / 2, H * 0.7, W, 4, 0x306018).setAlpha(0.3);

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

    const monsterKey = monster?.key ?? 'wolf';
    const monsterSpriteKey = `monster-${monsterKey}`;
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
    // Save return info NOW before finish() clears it.
    const combatState = useCombatStore.getState();
    this.savedReturnScene = combatState.returnScene ?? 'TownScene';
    this.savedReturnX = combatState.returnX;
    this.savedReturnY = combatState.returnY;

    // Fade in
    this.cameras.main.fadeIn(300, 0, 0, 0);
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
        }
      }
    }
  }

  private drawHpBar(gfx: Phaser.GameObjects.Graphics, x: number, y: number, w: number,
    current: number, max: number, color: number): void {
    gfx.clear();
    // Background
    gfx.fillStyle(0x1a1210, 0.8);
    gfx.fillRect(x - 1, y - 1, w + 2, 10);
    // Fill
    const pct = Math.max(0, current / max);
    gfx.fillStyle(color, 1);
    gfx.fillRect(x, y, w * pct, 8);
    // Border
    gfx.lineStyle(1, 0x3a2818, 1);
    gfx.strokeRect(x - 1, y - 1, w + 2, 10);
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

  private showDamageNumber(x: number, y: number, logText: string): void {
    // Extract damage from log text
    const dmgMatch = logText.match(/(\d+) damage/);
    const text = dmgMatch ? `-${dmgMatch[1]}` : 'Miss';
    const color = dmgMatch ? '#ff4040' : '#a0a060';

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
}
