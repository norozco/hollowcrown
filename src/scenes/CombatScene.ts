import * as Phaser from 'phaser';
import { useCombatStore } from '../state/combatStore';
import { usePlayerStore } from '../state/playerStore';
import { generateTileset, TILE_SIZE } from './tiles/generateTiles';
import {
  generateCharacterSprite,
  playerPalette,
  SPRITE_H,
} from './sprites/generateSprites';

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
  private enemyNameRef!: Phaser.GameObjects.Text;
  private playerNameRef!: Phaser.GameObjects.Text;
  private lastLogLength = 0;
  private playerBaseX = 0;
  private enemyBaseX = 0;
  private combatEnded = false;

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
      generateCharacterSprite(this, 'combat-player', playerPalette(rk, ck, character.playerChoice), rk, ck);
    }
    this.playerBaseX = W * 0.25;
    const playerY = H * 0.55;
    this.playerSprite = this.add.sprite(this.playerBaseX, playerY, 'combat-player', 2); // face right
    this.playerSprite.setFlipX(true);
    this.playerSprite.setScale(3); // 3x zoom for battle view
    this.playerSprite.setDepth(10);

    // Player shadow
    this.add.ellipse(this.playerBaseX, playerY + SPRITE_H * 1.2, 60, 16, 0x000000).setAlpha(0.2).setDepth(9);

    // Enemy sprite (right side) — larger, procedural colored shape
    const monster = useCombatStore.getState().monster;
    const enemyColor = monster ? parseInt(monster.color.replace('#', ''), 16) : 0xa04040;
    this.enemyBaseX = W * 0.72;
    const enemyY = H * 0.45;

    // Draw enemy as a bigger circle with detail (v0 — proper monster sprites later)
    const enemyGfx = this.add.graphics();
    enemyGfx.setDepth(10);
    const eSize = monster?.key === 'hollow_knight' ? 60 : monster?.key === 'skeleton' ? 45 : 38;
    // Body
    enemyGfx.fillStyle(enemyColor, 1);
    enemyGfx.fillCircle(this.enemyBaseX, enemyY, eSize);
    // Darker lower half (shadow)
    enemyGfx.fillStyle(0x000000, 0.2);
    enemyGfx.fillCircle(this.enemyBaseX, enemyY + eSize * 0.3, eSize * 0.9);
    // Eyes (two bright dots)
    enemyGfx.fillStyle(0xff3030, 1);
    enemyGfx.fillCircle(this.enemyBaseX - eSize * 0.25, enemyY - eSize * 0.15, 4);
    enemyGfx.fillCircle(this.enemyBaseX + eSize * 0.25, enemyY - eSize * 0.15, 4);
    // Eye glow
    enemyGfx.fillStyle(0xff6060, 0.5);
    enemyGfx.fillCircle(this.enemyBaseX - eSize * 0.25, enemyY - eSize * 0.15, 6);
    enemyGfx.fillCircle(this.enemyBaseX + eSize * 0.25, enemyY - eSize * 0.15, 6);
    // Outline
    enemyGfx.lineStyle(2, 0x1a1008, 1);
    enemyGfx.strokeCircle(this.enemyBaseX, enemyY, eSize);

    // Store enemy sprite ref for animations (use a dummy container)
    this.enemySprite = this.add.sprite(this.enemyBaseX, enemyY, '__DEFAULT').setVisible(false);

    // Enemy shadow
    this.add.ellipse(this.enemyBaseX, enemyY + eSize + 10, eSize * 1.6, 16, 0x000000).setAlpha(0.2).setDepth(9);

    // Names
    this.playerNameRef = this.add.text(this.playerBaseX, playerY - SPRITE_H * 1.8, character?.name ?? 'Hero', {
      fontFamily: 'Courier New', fontSize: '16px', color: '#f4d488',
      stroke: '#1a1008', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.enemyNameRef = this.add.text(this.enemyBaseX, enemyY - eSize - 30, monster?.name ?? 'Enemy', {
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
    this.enemyHpText = this.add.text(this.enemyBaseX, enemyY - eSize - 12, '', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(21);

    this.lastLogLength = useCombatStore.getState().state?.log.length ?? 0;
    this.combatEnded = false;

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
      // Combat store was cleared (finish() called) — go back.
      this.combatEnded = true;
      const returnTo = store.returnScene ?? 'TownScene';
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.switch(returnTo);
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
    const eSize = monster.key === 'hollow_knight' ? 60 : monster.key === 'skeleton' ? 45 : 38;
    this.drawHpBar(this.enemyHpBar, this.enemyBaseX - 40, eY - eSize - 22, 80,
      state.monsterHp, monster.maxHp, 0xa04040);
    this.enemyHpText.setText(`${state.monsterHp}/${monster.maxHp}`);
    this.enemyHpText.setPosition(this.enemyBaseX, eY - eSize - 12);

    // Detect new log entries → trigger animations
    if (state.log.length > this.lastLogLength) {
      const newEntries = state.log.slice(this.lastLogLength);
      this.lastLogLength = state.log.length;

      for (const entry of newEntries) {
        if (entry.type === 'player_hit') {
          this.animateAttack(this.playerSprite, this.playerBaseX, this.enemyBaseX - 80, true);
          this.showDamageNumber(this.enemyBaseX, eY - eSize, entry.text);
        } else if (entry.type === 'player_miss') {
          this.animateAttack(this.playerSprite, this.playerBaseX, this.enemyBaseX - 100, false);
        } else if (entry.type === 'enemy_hit') {
          this.showDamageNumber(this.playerBaseX, this.playerSprite.y - SPRITE_H, entry.text);
          this.flashSprite(this.playerSprite);
        } else if (entry.type === 'enemy_miss') {
          // Could add dodge animation
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

  private animateAttack(sprite: Phaser.GameObjects.Sprite, _fromX: number, toX: number, hit: boolean): void {
    this.tweens.add({
      targets: sprite,
      x: toX,
      duration: 200,
      ease: 'Power2',
      yoyo: true,
      onYoyo: () => {
        if (hit) {
          this.cameras.main.shake(100, 0.005);
        }
      },
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
