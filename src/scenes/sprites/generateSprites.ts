import * as Phaser from 'phaser';

/**
 * Character sprite generator v3 — maximum detail pass.
 *
 * Every race has unique proportions + features.
 * Every class has unique equipment with TEXTURE (not just color).
 * Similarity audit: Halfling vs Gnome, Half-Elf vs Human all differentiated.
 */

export const SPRITE_W = 32;
export const SPRITE_H = 48;
const FRAMES = 8;

export interface CharacterColors {
  skin: string; skinShadow: string;
  hair: string; hairHighlight: string;
  tunic: string; tunicDark: string; tunicLight: string;
  boots: string; belt: string; eyes: string;
}

export const DEFAULT_COLORS: CharacterColors = {
  skin:'#e8c090',skinShadow:'#c8a070',hair:'#705030',hairHighlight:'#907050',
  tunic:'#408060',tunicDark:'#306050',tunicLight:'#50a070',boots:'#604020',belt:'#806040',eyes:'#202020',
};

function clamp(v:number):string{return Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0');}
function dk(h:string,a=40):string{const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return`#${clamp(r-a)}${clamp(g-a)}${clamp(b-a)}`;}
function lt(h:string,a=30):string{const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return`#${clamp(r+a)}${clamp(g+a)}${clamp(b+a)}`;}

// ─── Race bodies ──────────────────────────────────────────────

interface RaceBody {
  headW:number;headH:number;headY:number;bodyW:number;bodyH:number;bodyY:number;
  legH:number;armW:number;
  beard?:boolean; pointedEars?:boolean; tusks?:boolean;
  horns?:boolean; hornCol?:string;
  snout?:boolean; catEars?:boolean; tail?:boolean;
  bigEyes?:boolean; // gnome
  barefoot?:boolean; // halfling
  longHair?:boolean; // half-elf
  furStripes?:boolean; // tabaxi
}

const RB:Record<string,RaceBody>={
  human:     {headW:12,headH:12,headY:6,bodyW:14,bodyH:12,bodyY:20,legH:8,armW:3},
  elf:       {headW:10,headH:13,headY:3,bodyW:12,bodyH:14,bodyY:18,legH:10,armW:2,pointedEars:true},
  dwarf:     {headW:14,headH:10,headY:12,bodyW:18,bodyH:10,bodyY:24,legH:6,armW:4,beard:true},
  halfling:  {headW:12,headH:11,headY:11,bodyW:11,bodyH:10,bodyY:24,legH:6,armW:2,barefoot:true},
  orc:       {headW:15,headH:13,headY:4,bodyW:20,bodyH:12,bodyY:20,legH:8,armW:5,tusks:true},
  tiefling:  {headW:12,headH:12,headY:6,bodyW:14,bodyH:12,bodyY:20,legH:8,armW:3,horns:true,hornCol:'#483030'},
  dragonborn:{headW:15,headH:14,headY:3,bodyW:18,bodyH:13,bodyY:20,legH:8,armW:4,snout:true,tail:true},
  gnome:     {headW:15,headH:13,headY:9,bodyW:11,bodyH:10,bodyY:24,legH:6,armW:2,bigEyes:true},
  'half-elf':{headW:11,headH:13,headY:4,bodyW:13,bodyH:13,bodyY:19,legH:10,armW:3,pointedEars:true,longHair:true},
  tabaxi:    {headW:12,headH:12,headY:5,bodyW:14,bodyH:12,bodyY:19,legH:9,armW:3,catEars:true,tail:true,furStripes:true},
};

// ─── Class equipment ──────────────────────────────────────────

interface ClassEquip {
  head:'none'|'helmet'|'hood'|'wizhat'|'crown'|'feather'|'cowl';
  armor:'heavy'|'medium'|'light'|'robes';
  weapon:'sword'|'dagger'|'staff'|'mace'|'bow'|'lute';
  cape?:boolean;shield?:boolean;quiver?:boolean;
  chestDetail?:'plate_bands'|'leather_straps'|'star_rune'|'holy_symbol'|'leaf_brooch'|'stripes';
}

const CE:Record<string,ClassEquip>={
  fighter:{head:'helmet',armor:'heavy',weapon:'sword',shield:true,chestDetail:'plate_bands'},
  rogue:  {head:'hood',armor:'light',weapon:'dagger',cape:true,chestDetail:'leather_straps'},
  wizard: {head:'wizhat',armor:'robes',weapon:'staff',chestDetail:'star_rune'},
  cleric: {head:'crown',armor:'medium',weapon:'mace',chestDetail:'holy_symbol'},
  ranger: {head:'cowl',armor:'medium',weapon:'bow',cape:true,quiver:true,chestDetail:'leaf_brooch'},
  bard:   {head:'feather',armor:'light',weapon:'lute',chestDetail:'stripes'},
};

// ─── Palettes ─────────────────────────────────────────────────

export const NPC_PALETTES:Record<string,CharacterColors>={
  brenna:{skin:'#d8b888',skinShadow:'#b89868',hair:'#808080',hairHighlight:'#a0a0a0',tunic:'#6a4828',tunicDark:'#4a3018',tunicLight:'#8a6838',boots:'#3a2010',belt:'#504028',eyes:'#304050'},
  tomas: {skin:'#e8c8a0',skinShadow:'#c8a880',hair:'#302018',hairHighlight:'#504030',tunic:'#c0b8a0',tunicDark:'#a09880',tunicLight:'#d8d0b8',boots:'#504030',belt:'#705838',eyes:'#203020'},
  vira:  {skin:'#e0b890',skinShadow:'#c09870',hair:'#181018',hairHighlight:'#302830',tunic:'#782040',tunicDark:'#581030',tunicLight:'#983050',boots:'#302020',belt:'#a08030',eyes:'#282028'},
  orric: {skin:'#c8a078',skinShadow:'#a88058',hair:'#909090',hairHighlight:'#b0b0b0',tunic:'#4a6038',tunicDark:'#3a4828',tunicLight:'#5a7048',boots:'#3a2818',belt:'#584028',eyes:'#506060'},
};
export function getNpcPalette(k:string,fc:string):CharacterColors{return NPC_PALETTES[k]??{...DEFAULT_COLORS,tunic:fc,tunicDark:dk(fc),tunicLight:lt(fc),belt:dk(fc)};}

const RL:Record<string,{skin:string;skinShadow:string;hair:string;hairHighlight:string}>={
  human:     {skin:'#e8c090',skinShadow:'#c8a070',hair:'#705030',hairHighlight:'#907050'},
  elf:       {skin:'#f0d8b8',skinShadow:'#d0b898',hair:'#c0a060',hairHighlight:'#d8b878'},
  dwarf:     {skin:'#d0a070',skinShadow:'#b08050',hair:'#a05020',hairHighlight:'#c07030'},
  halfling:  {skin:'#e8c8a0',skinShadow:'#c8a880',hair:'#706028',hairHighlight:'#908040'},
  orc:       {skin:'#709060',skinShadow:'#507040',hair:'#303030',hairHighlight:'#484848'},
  tiefling:  {skin:'#c07060',skinShadow:'#a05040',hair:'#201020',hairHighlight:'#382838'},
  dragonborn:{skin:'#708870',skinShadow:'#506850',hair:'#506850',hairHighlight:'#608060'},
  gnome:     {skin:'#e8d0a0',skinShadow:'#c8b080',hair:'#d06020',hairHighlight:'#e07830'},
  'half-elf':{skin:'#e8d0a8',skinShadow:'#c8b088',hair:'#906838',hairHighlight:'#a87848'},
  tabaxi:    {skin:'#c0a070',skinShadow:'#a08050',hair:'#604020',hairHighlight:'#805030'},
};

const CO:Record<string,{tunic:string;tunicDark:string;tunicLight:string;belt:string}>={
  fighter:{tunic:'#707888',tunicDark:'#505868',tunicLight:'#909898',belt:'#606068'},
  rogue:  {tunic:'#383840',tunicDark:'#202028',tunicLight:'#505058',belt:'#282830'},
  wizard: {tunic:'#5040a0',tunicDark:'#302880',tunicLight:'#7060b8',belt:'#a08030'},
  cleric: {tunic:'#d8d0b8',tunicDark:'#b8b098',tunicLight:'#f0e8d0',belt:'#c0a040'},
  ranger: {tunic:'#408048',tunicDark:'#306038',tunicLight:'#50a058',belt:'#604828'},
  bard:   {tunic:'#a04050',tunicDark:'#802838',tunicLight:'#c05868',belt:'#c09030'},
};

const DELEM:Record<string,{skin:string;skinShadow:string;hair:string;hairHighlight:string}>={
  fire:     {skin:'#c06030',skinShadow:'#a04820',hair:'#a04020',hairHighlight:'#c06030'},
  cold:     {skin:'#6090b0',skinShadow:'#407090',hair:'#4070a0',hairHighlight:'#6090c0'},
  lightning:{skin:'#b0a050',skinShadow:'#908030',hair:'#908030',hairHighlight:'#c0b060'},
  acid:     {skin:'#60a040',skinShadow:'#408028',hair:'#408028',hairHighlight:'#60b040'},
  poison:   {skin:'#806080',skinShadow:'#604060',hair:'#604060',hairHighlight:'#907090'},
};

export function playerPalette(race:string,cls:string,choice?:string):CharacterColors{
  let r={...(RL[race]??RL.human)};
  if(race==='dragonborn'&&choice&&DELEM[choice])r={...r,...DELEM[choice]};
  const c=CO[cls]??CO.fighter;
  return{...r,...c,boots:'#503820',eyes:'#181818'};
}

// ─── Main ─────────────────────────────────────────────────────

export function generateCharacterSprite(scene:Phaser.Scene,key:string,col:CharacterColors=DEFAULT_COLORS,race='human',cls='fighter'):void{
  if(scene.textures.exists(key))return;
  const cv=document.createElement('canvas');cv.width=FRAMES*SPRITE_W;cv.height=SPRITE_H;
  const ctx=cv.getContext('2d')!;
  const rb=RB[race]??RB.human;const ce=CE[cls]??CE.fighter;
  for(let f=0;f<8;f++)draw(ctx,f,col,rb,ce,f%4,f>=4,race);
  const tx=scene.textures.addCanvas(key,cv);
  if(tx){for(let i=0;i<FRAMES;i++)tx.add(i,0,i*SPRITE_W,0,SPRITE_W,SPRITE_H);}
}

// ─── Drawing ──────────────────────────────────────────────────

type C=CanvasRenderingContext2D;
function px(c:C,f:number,x:number,y:number,cl:string){c.fillStyle=cl;c.fillRect(f*SPRITE_W+x,y,1,1);}
function bk(c:C,f:number,x:number,y:number,w:number,h:number,cl:string){c.fillStyle=cl;c.fillRect(f*SPRITE_W+x,y,w,h);}

function draw(c:C,f:number,col:CharacterColors,rb:RaceBody,ce:ClassEquip,dir:number,walk:boolean,race:string){
  const cx=16,isFr=dir===0,isBk=dir===1,isSd=dir>=2;
  const bx=cx-rb.bodyW/2,legOff=walk?2:0;

  // Shadow
  bk(c,f,cx-6,44,12,3,'rgba(0,0,0,0.2)');

  // ── BOOTS ──
  const bY=rb.bodyY+rb.bodyH+rb.legH-6;
  const btC=ce.armor==='heavy'?'#505860':col.boots;
  const btH=lt(btC,25);
  if(rb.barefoot){
    // Halfling: bare hairy feet (skin colored, wider)
    if(!isSd){bk(c,f,cx-6,bY+legOff,5,5-legOff,col.skin);bk(c,f,cx+1,bY-legOff,5,5+legOff,col.skin);
      bk(c,f,cx-6,bY+legOff,5,1,lt(col.skin,15));bk(c,f,cx+1,bY-legOff,5,1,lt(col.skin,15));
      // Toe detail
      px(c,f,cx-5,bY+legOff+3,col.skinShadow);px(c,f,cx-3,bY+legOff+3,col.skinShadow);
      px(c,f,cx+2,bY-legOff+3,col.skinShadow);px(c,f,cx+4,bY-legOff+3,col.skinShadow);
    }else{bk(c,f,cx-3,bY,5,5,col.skin);}
  }else{
    if(!isSd){
      bk(c,f,cx-5,bY+legOff,4,6-legOff,btC);bk(c,f,cx+1,bY-legOff,4,6+legOff,btC);
      bk(c,f,cx-5,bY+legOff,4,1,btH);bk(c,f,cx+1,bY-legOff,4,1,btH);
      px(c,f,cx-4,bY+legOff+2,'#909088');px(c,f,cx+2,bY-legOff+2,'#909088');// buckle
    }else{bk(c,f,cx-3,bY-legOff,5,6+legOff,btC);bk(c,f,cx-3,bY-legOff,5,1,btH);}
  }

  // ── LEGS ──
  const lY=rb.bodyY+rb.bodyH;
  const lC=ce.armor==='robes'?col.tunic:col.tunicDark;
  bk(c,f,bx,lY,rb.bodyW,rb.legH,lC);
  if(isFr&&ce.armor!=='robes')bk(c,f,cx-1,lY+2,2,rb.legH-2,dk(lC,15));

  // ── BODY / ARMOR ──
  bk(c,f,bx,rb.bodyY,rb.bodyW,rb.bodyH,col.tunic);

  if(ce.armor==='heavy'){
    bk(c,f,bx+1,rb.bodyY+1,rb.bodyW-2,rb.bodyH-2,col.tunicLight);
    for(let ay=rb.bodyY+3;ay<rb.bodyY+rb.bodyH;ay+=3)bk(c,f,bx+1,ay,rb.bodyW-2,1,col.tunicDark);
    // Pauldrons (extra wide)
    bk(c,f,bx-3,rb.bodyY,rb.bodyW+6,4,col.tunicLight);
    bk(c,f,bx-3,rb.bodyY,rb.bodyW+6,1,lt(col.tunicLight,20));
    bk(c,f,bx-3,rb.bodyY+3,rb.bodyW+6,1,col.tunicDark);
    // Shoulder studs
    px(c,f,bx-2,rb.bodyY+1,'#c0c0b8');px(c,f,bx+rb.bodyW+1,rb.bodyY+1,'#c0c0b8');
    // Knee guards
    if(isFr){px(c,f,cx-4,lY+2,'#606868');px(c,f,cx+3,lY+2,'#606868');}
  }else if(ce.armor==='robes'){
    bk(c,f,bx-1,rb.bodyY+4,rb.bodyW+2,rb.bodyH-4,col.tunic);
    bk(c,f,bx-2,lY,rb.bodyW+4,rb.legH+2,col.tunic);
    bk(c,f,bx-2,lY+rb.legH,rb.bodyW+4,2,col.tunicLight); // hem
    if(isFr)bk(c,f,cx-1,rb.bodyY+2,2,rb.bodyH+rb.legH,col.tunicDark); // seam
    // Sleeve cuffs (wider at wrists)
    bk(c,f,bx-rb.armW-1,rb.bodyY+rb.bodyH-4,rb.armW+2,3,col.tunicLight);
    bk(c,f,bx+rb.bodyW-1,rb.bodyY+rb.bodyH-4,rb.armW+2,3,col.tunicLight);
  }else if(ce.armor==='medium'){
    bk(c,f,bx+1,rb.bodyY+1,rb.bodyW-2,rb.bodyH-2,col.tunicLight);
    for(let ay=rb.bodyY+2;ay<rb.bodyY+rb.bodyH-2;ay+=2)
      for(let ax=bx+2;ax<bx+rb.bodyW-2;ax+=2)px(c,f,ax,ay,col.tunicDark);
  }else{
    bk(c,f,bx+1,rb.bodyY+1,rb.bodyW-2,rb.bodyH-2,col.tunicLight);
    if(isFr)bk(c,f,cx-1,rb.bodyY+3,2,rb.bodyH-4,col.tunicDark);
  }

  // ── CHEST DETAIL (class-specific texture) ──
  if(isFr&&ce.chestDetail){
    const cdX=cx-3,cdY=rb.bodyY+3;
    if(ce.chestDetail==='plate_bands'){
      // Fighter: center emblem (small cross)
      px(c,f,cx,cdY,'#c0c0b8');px(c,f,cx-1,cdY+1,'#c0c0b8');
      px(c,f,cx+1,cdY+1,'#c0c0b8');px(c,f,cx,cdY+2,'#c0c0b8');
    }else if(ce.chestDetail==='leather_straps'){
      // Rogue: diagonal strap + belt pouches
      for(let d=0;d<6;d++)px(c,f,cdX+d,cdY+d,col.tunicDark);
      bk(c,f,cx-5,rb.bodyY+rb.bodyH-4,2,2,dk(col.belt,10)); // pouch L
      bk(c,f,cx+3,rb.bodyY+rb.bodyH-4,2,2,dk(col.belt,10)); // pouch R
    }else if(ce.chestDetail==='star_rune'){
      // Wizard: glowing star
      px(c,f,cx,cdY,'#f0d860');px(c,f,cx-1,cdY+1,'#e0c850');
      px(c,f,cx+1,cdY+1,'#e0c850');px(c,f,cx,cdY+2,'#f0d860');
      px(c,f,cx-2,cdY,'#d0b840');px(c,f,cx+2,cdY,'#d0b840');
    }else if(ce.chestDetail==='holy_symbol'){
      // Cleric: golden cross on chest
      bk(c,f,cx-1,cdY,3,5,'#e0c040');bk(c,f,cx-2,cdY+1,5,1,'#e0c040');
      px(c,f,cx,cdY,'#f0d860'); // center bright
    }else if(ce.chestDetail==='leaf_brooch'){
      // Ranger: small green leaf
      px(c,f,cx-1,cdY,'#60c060');px(c,f,cx,cdY+1,'#50a050');px(c,f,cx+1,cdY,'#60c060');
    }else if(ce.chestDetail==='stripes'){
      // Bard: vertical stripes on tunic
      for(let sx=bx+2;sx<bx+rb.bodyW-2;sx+=3)
        bk(c,f,sx,rb.bodyY+2,1,rb.bodyH-4,col.tunicDark);
    }
  }

  // Belt with buckle + details
  bk(c,f,bx,rb.bodyY+rb.bodyH-3,rb.bodyW,3,col.belt);
  px(c,f,cx,rb.bodyY+rb.bodyH-2,lt(col.belt,40)); // buckle
  if(ce.chestDetail==='leather_straps'){
    // Rogue: extra belt pouches
    px(c,f,cx-4,rb.bodyY+rb.bodyH-2,dk(col.belt,20));
    px(c,f,cx+4,rb.bodyY+rb.bodyH-2,dk(col.belt,20));
  }

  // ── ARMS ──
  const armC=ce.armor==='heavy'?col.tunicLight:col.tunic;
  if(!isSd){
    bk(c,f,bx-rb.armW,rb.bodyY+2,rb.armW,rb.bodyH-2,armC);
    bk(c,f,bx+rb.bodyW,rb.bodyY+2,rb.armW,rb.bodyH-2,armC);
    bk(c,f,bx-rb.armW,rb.bodyY+rb.bodyH-2,rb.armW,2,col.skin);
    bk(c,f,bx+rb.bodyW,rb.bodyY+rb.bodyH-2,rb.armW,2,col.skin);
    if(ce.armor==='heavy'){// Gauntlet cuffs
      bk(c,f,bx-rb.armW,rb.bodyY+rb.bodyH-4,rb.armW,2,'#606868');
      bk(c,f,bx+rb.bodyW,rb.bodyY+rb.bodyH-4,rb.armW,2,'#606868');
    }
  }else{
    bk(c,f,bx,rb.bodyY+2,rb.armW,rb.bodyH-2,armC);
    bk(c,f,bx,rb.bodyY+rb.bodyH-2,rb.armW,2,col.skin);
  }

  // ── CAPE ──
  if(ce.cape){
    if(isBk){
      bk(c,f,bx-1,rb.bodyY+2,rb.bodyW+2,rb.bodyH+rb.legH-2,col.tunicDark);
      bk(c,f,bx,rb.bodyY+3,rb.bodyW,rb.bodyH+rb.legH-4,col.tunic);
      for(let fx=bx+3;fx<bx+rb.bodyW-2;fx+=4)bk(c,f,fx,rb.bodyY+5,1,rb.bodyH+rb.legH-8,col.tunicDark);
      bk(c,f,bx-1,rb.bodyY+rb.bodyH+rb.legH-2,rb.bodyW+2,1,col.tunicLight);
    }else if(isSd){
      bk(c,f,bx+rb.bodyW,rb.bodyY+4,3,rb.bodyH+rb.legH-6,col.tunicDark);
    }
  }

  // ── QUIVER ──
  if(ce.quiver&&(isBk||isSd)){
    const qx=isSd?bx-3:bx+rb.bodyW;
    bk(c,f,qx,rb.bodyY-2,3,rb.bodyH+4,'#705030');
    px(c,f,qx+1,rb.bodyY-3,'#a0a0a0');px(c,f,qx+2,rb.bodyY-2,'#a0a0a0');
  }

  // ── SHIELD ──
  if(ce.shield&&(isBk||(isSd))){
    const sx=isBk?bx+rb.bodyW-2:bx-5;
    bk(c,f,sx,rb.bodyY+2,6,8,'#a08030');bk(c,f,sx+1,rb.bodyY+3,4,6,'#c0a040');
    px(c,f,sx+3,rb.bodyY+5,'#e0c060');
  }

  // ── NECK ──
  bk(c,f,cx-3,rb.headY+rb.headH-2,6,4,col.skin);

  // ── HEAD ──
  const hx=cx-rb.headW/2;
  if(isBk){
    bk(c,f,hx,rb.headY,rb.headW,rb.headH,col.hair);
    bk(c,f,hx+2,rb.headY,rb.headW-4,2,col.hairHighlight);
    if(rb.longHair)bk(c,f,cx-3,rb.headY+rb.headH,6,6,col.hair); // half-elf long hair
    if(rb.pointedEars){px(c,f,hx-1,rb.headY+4,col.skin);px(c,f,hx+rb.headW,rb.headY+4,col.skin);}
  }else if(isSd){
    bk(c,f,hx,rb.headY,rb.headW,rb.headH,col.skin);
    bk(c,f,hx,rb.headY,rb.headW,5,col.hair);
    bk(c,f,hx+rb.headW-4,rb.headY,4,rb.headH,col.hair);
    bk(c,f,hx+2,rb.headY,rb.headW-4,2,col.hairHighlight);
    const ex=hx+3;
    if(rb.bigEyes){bk(c,f,ex,rb.headY+4,3,3,col.eyes);px(c,f,ex,rb.headY+4,'#ffffff');px(c,f,ex+1,rb.headY+4,'#ffffff');}
    else{bk(c,f,ex,rb.headY+5,2,2,col.eyes);px(c,f,ex,rb.headY+5,'#ffffff');}
    if(rb.pointedEars)px(c,f,hx-2,rb.headY+4,col.skin);
    if(rb.longHair)bk(c,f,hx+rb.headW-2,rb.headY+rb.headH-2,3,5,col.hair);
    if(rb.furStripes){px(c,f,hx+2,rb.headY+3,col.hairHighlight);px(c,f,hx+5,rb.headY+6,col.hairHighlight);}
  }else{
    bk(c,f,hx,rb.headY,rb.headW,rb.headH,col.skin);
    bk(c,f,hx-1,rb.headY+2,rb.headW+2,rb.headH-4,col.skin);
    bk(c,f,hx,rb.headY+rb.headH-3,rb.headW,3,col.skinShadow);
    // Hair
    if(race!=='dragonborn'){
      bk(c,f,hx-1,rb.headY-2,rb.headW+2,5,col.hair);
      bk(c,f,hx,rb.headY+2,3,3,col.hair);bk(c,f,hx+rb.headW-3,rb.headY+2,3,3,col.hair);
      bk(c,f,hx+2,rb.headY-2,rb.headW-4,2,col.hairHighlight);
      if(rb.longHair){bk(c,f,hx-1,rb.headY+rb.headH-2,2,4,col.hair);bk(c,f,hx+rb.headW-1,rb.headY+rb.headH-2,2,4,col.hair);}
    }else{
      // Dragonborn: scale ridges instead of hair
      bk(c,f,hx,rb.headY-2,rb.headW,3,col.skin);
      for(let sx=hx+2;sx<hx+rb.headW-1;sx+=3)px(c,f,sx,rb.headY-1,col.skinShadow);
    }
    // Eyes
    if(rb.bigEyes){
      // Gnome: big round eyes
      bk(c,f,hx+2,rb.headY+4,3,3,col.eyes);bk(c,f,hx+rb.headW-5,rb.headY+4,3,3,col.eyes);
      px(c,f,hx+2,rb.headY+4,'#ffffff');px(c,f,hx+3,rb.headY+4,'#ffffff');
      px(c,f,hx+rb.headW-5,rb.headY+4,'#ffffff');px(c,f,hx+rb.headW-4,rb.headY+4,'#ffffff');
    }else{
      bk(c,f,hx+2,rb.headY+5,2,2,col.eyes);bk(c,f,hx+rb.headW-4,rb.headY+5,2,2,col.eyes);
      px(c,f,hx+2,rb.headY+5,'#ffffff');px(c,f,hx+rb.headW-4,rb.headY+5,'#ffffff');
    }
    // Mouth
    px(c,f,cx-1,rb.headY+rb.headH-3,col.skinShadow);px(c,f,cx,rb.headY+rb.headH-3,col.skinShadow);
    if(rb.pointedEars){px(c,f,hx-2,rb.headY+4,col.skin);px(c,f,hx+rb.headW+1,rb.headY+4,col.skin);}
    if(rb.furStripes){
      px(c,f,hx+1,rb.headY+3,col.hairHighlight);px(c,f,hx+rb.headW-2,rb.headY+3,col.hairHighlight);
      px(c,f,hx+3,rb.headY+rb.headH-4,col.hairHighlight);
    }
  }

  // ── RACE FEATURES ──
  if(rb.beard&&!isBk){
    bk(c,f,cx-4,rb.headY+rb.headH-4,8,6,col.hair);
    bk(c,f,cx-3,rb.headY+rb.headH,6,4,col.hair);
    bk(c,f,cx-2,rb.headY+rb.headH+3,4,2,dk(col.hair,20));
    // Beard braid detail
    px(c,f,cx,rb.headY+rb.headH+2,col.hairHighlight);
  }
  if(rb.tusks&&isFr){px(c,f,hx+1,rb.headY+rb.headH-2,'#e0e0d0');px(c,f,hx+rb.headW-2,rb.headY+rb.headH-2,'#e0e0d0');}
  if(rb.horns){
    const hc=rb.hornCol??'#483030';
    bk(c,f,hx+1,rb.headY-5,2,5,hc);bk(c,f,hx+rb.headW-3,rb.headY-5,2,5,hc);
    px(c,f,hx,rb.headY-6,lt(hc,20));px(c,f,hx+rb.headW-2,rb.headY-6,lt(hc,20));
  }
  if(rb.snout&&isFr){
    // Wide snout with nostrils and jawline
    bk(c,f,cx-4,rb.headY+rb.headH-5,8,5,col.skinShadow);
    bk(c,f,cx-3,rb.headY+rb.headH-4,6,3,col.skin);
    // Nostrils
    px(c,f,cx-2,rb.headY+rb.headH-4,dk(col.skin,30));
    px(c,f,cx+2,rb.headY+rb.headH-4,dk(col.skin,30));
    // Jawline (wider than human)
    bk(c,f,hx-1,rb.headY+rb.headH-2,rb.headW+2,2,col.skinShadow);
  }
  if(rb.snout&&isSd){
    // Side snout protrusion
    bk(c,f,hx-2,rb.headY+rb.headH-4,3,3,col.skin);
    px(c,f,hx-3,rb.headY+rb.headH-3,col.skinShadow); // nostril
  }
  if(rb.catEars){
    px(c,f,hx+1,rb.headY-3,col.hair);px(c,f,hx+2,rb.headY-4,col.hair);px(c,f,hx+3,rb.headY-5,col.hair);
    px(c,f,hx+rb.headW-2,rb.headY-3,col.hair);px(c,f,hx+rb.headW-3,rb.headY-4,col.hair);px(c,f,hx+rb.headW-4,rb.headY-5,col.hair);
    px(c,f,hx+2,rb.headY-3,'#e0a090');px(c,f,hx+rb.headW-3,rb.headY-3,'#e0a090');
  }
  if(rb.tail&&!isFr){
    if(race==='dragonborn'){
      // Dragonborn: THICK dragon tail (3px wide, 8px long, with ridges)
      for(let t=0;t<8;t++){
        const tw=3-Math.floor(t/3); // tapers from 3 to 1
        bk(c,f,bx+rb.bodyW+t-1,lY+t,tw,2,col.skin);
        if(t%2===0)px(c,f,bx+rb.bodyW+t,lY+t,col.skinShadow); // ridge
      }
      px(c,f,bx+rb.bodyW+7,lY+8,col.skinShadow); // tail tip
    }else{
      // Tabaxi: thin cat tail
      for(let t=0;t<6;t++){px(c,f,bx+rb.bodyW+t,lY+t,col.hair);px(c,f,bx+rb.bodyW+t,lY+t+1,dk(col.hair,20));}
    }
  }

  // ── DRAGONBORN EXTRAS (scales, spines, claws, element glow) ──
  if(race==='dragonborn'){
    // Body scales (diamond pattern on torso — visible from front)
    if(isFr){
      for(let sy=rb.bodyY+2;sy<rb.bodyY+rb.bodyH-3;sy+=3)
        for(let sx=bx+2;sx<bx+rb.bodyW-2;sx+=4){
          px(c,f,sx,sy,col.skinShadow);
          px(c,f,sx+1,sy+1,col.skinShadow);
          px(c,f,sx+2,sy,col.skinShadow);
        }
    }
    // Back spines (visible from behind — 4 ridges along the spine)
    if(isBk){
      for(let sp=0;sp<4;sp++){
        const spY=rb.bodyY+2+sp*3;
        px(c,f,cx,spY-1,lt(col.skin,30));
        px(c,f,cx-1,spY,col.skin);px(c,f,cx+1,spY,col.skin);
        px(c,f,cx,spY,lt(col.skin,15));
      }
    }
    // Clawed hands (darker, pointed — instead of skin-colored)
    if(!isSd){
      bk(c,f,bx-rb.armW,rb.bodyY+rb.bodyH-2,rb.armW,2,col.skinShadow);
      bk(c,f,bx+rb.bodyW,rb.bodyY+rb.bodyH-2,rb.armW,2,col.skinShadow);
      // Claw tips
      px(c,f,bx-rb.armW,rb.bodyY+rb.bodyH,dk(col.skin,30));
      px(c,f,bx+rb.bodyW+rb.armW-1,rb.bodyY+rb.bodyH,dk(col.skin,30));
    }
    // Thicker neck
    bk(c,f,cx-4,rb.headY+rb.headH-2,8,4,col.skin);
    // Heavier brow ridge (front only)
    if(isFr) bk(c,f,hx+1,rb.headY+3,rb.headW-2,2,col.skinShadow);

    // Element glow effects
    const elemGlow = col.skin; // element color IS the skin color for dragonborn
    const glowBright = lt(elemGlow, 50);
    if(isFr){
      // Glow at fists
      px(c,f,bx-rb.armW-1,rb.bodyY+rb.bodyH-1,glowBright);
      px(c,f,bx+rb.bodyW+rb.armW,rb.bodyY+rb.bodyH-1,glowBright);
      // Chest glow center (breath energy)
      px(c,f,cx,rb.bodyY+4,glowBright);
      px(c,f,cx-1,rb.bodyY+5,lt(elemGlow,30));
      px(c,f,cx+1,rb.bodyY+5,lt(elemGlow,30));
    }
  }

  // ── HEADGEAR ──
  if(ce.head==='helmet'){
    bk(c,f,hx-1,rb.headY-2,rb.headW+2,7,'#808888');
    bk(c,f,hx,rb.headY-2,rb.headW,1,'#a0a8a8');
    if(isFr){bk(c,f,cx-4,rb.headY+3,8,2,'#707878');
      px(c,f,cx,rb.headY-3,'#b0b8b8');} // crest
    // Rivets
    px(c,f,hx,rb.headY,'#c0c0b8');px(c,f,hx+rb.headW-1,rb.headY,'#c0c0b8');
  }else if(ce.head==='hood'){
    bk(c,f,hx-2,rb.headY-3,rb.headW+4,rb.headH+2,col.tunicDark);
    bk(c,f,hx-1,rb.headY-2,rb.headW+2,rb.headH,col.tunic);
    if(isFr){
      bk(c,f,hx+1,rb.headY+2,rb.headW-2,rb.headH-4,col.skin);
      if(rb.bigEyes){bk(c,f,hx+2,rb.headY+4,3,3,col.eyes);bk(c,f,hx+rb.headW-5,rb.headY+4,3,3,col.eyes);}
      else{bk(c,f,hx+2,rb.headY+5,2,2,col.eyes);bk(c,f,hx+rb.headW-4,rb.headY+5,2,2,col.eyes);}
      px(c,f,hx+2,rb.headY+5,'#ffffff');px(c,f,hx+rb.headW-4,rb.headY+5,'#ffffff');
    }
  }else if(ce.head==='wizhat'){
    bk(c,f,hx-2,rb.headY-2,rb.headW+4,4,col.tunic);
    bk(c,f,hx,rb.headY-5,rb.headW,3,col.tunic);
    bk(c,f,hx+2,rb.headY-8,rb.headW-4,3,col.tunic);
    bk(c,f,cx-1,rb.headY-10,3,3,col.tunic);
    px(c,f,cx,rb.headY-11,col.tunicLight);
    bk(c,f,hx-3,rb.headY-1,rb.headW+6,2,col.tunicDark);
    // Hat band
    bk(c,f,hx-2,rb.headY-2,rb.headW+4,1,col.belt);
    px(c,f,cx,rb.headY-2,'#e0c040'); // gem on band
  }else if(ce.head==='crown'){
    bk(c,f,hx,rb.headY-3,rb.headW,3,'#c0a040');
    px(c,f,hx+2,rb.headY-4,'#e0c060');px(c,f,cx,rb.headY-4,'#e0c060');px(c,f,hx+rb.headW-3,rb.headY-4,'#e0c060');
    // Jewel
    px(c,f,cx,rb.headY-3,'#e04040');
  }else if(ce.head==='feather'){
    bk(c,f,hx-1,rb.headY-2,rb.headW+2,4,col.tunic);
    bk(c,f,hx+rb.headW-2,rb.headY-7,2,5,'#e04040');
    px(c,f,hx+rb.headW-1,rb.headY-8,'#f06060');
    bk(c,f,hx-1,rb.headY-2,rb.headW+2,1,col.tunicLight);
  }else if(ce.head==='cowl'){
    bk(c,f,hx-1,rb.headY-2,rb.headW+2,5,col.tunicDark);
    bk(c,f,hx,rb.headY-1,rb.headW,3,col.tunic);
  }

  // ── WEAPON ──
  if(ce.weapon==='sword'&&(isFr||isSd)){
    const wx=isSd?bx-3:bx+rb.bodyW+rb.armW;
    bk(c,f,wx,rb.bodyY-4,2,16,'#b0b0b8');px(c,f,wx,rb.bodyY-5,'#d0d0d8');
    bk(c,f,wx-1,rb.bodyY+10,4,2,'#a08030');bk(c,f,wx,rb.bodyY+12,2,4,'#705030');
  }else if(ce.weapon==='staff'&&(isFr||isSd)){
    const wx=isSd?bx+rb.bodyW+1:bx-rb.armW-1;
    bk(c,f,wx,rb.headY-6,2,rb.bodyY+rb.bodyH-rb.headY+10,'#705030');
    bk(c,f,wx-1,rb.headY-8,4,4,'#8060c0');px(c,f,wx,rb.headY-8,'#a080e0');
    px(c,f,wx-1,rb.headY-9,'#c0a0f0'); // glow
  }else if(ce.weapon==='bow'&&isSd){
    const wx=bx-4;
    for(let by=0;by<14;by++){const cv=Math.round(Math.sin(by/14*Math.PI)*3);px(c,f,wx+cv,rb.bodyY+by,'#906830');}
    bk(c,f,wx,rb.bodyY,1,14,'#c0c0b8');
  }else if(ce.weapon==='dagger'&&isFr){
    bk(c,f,bx+rb.bodyW+rb.armW,rb.bodyY+4,1,6,'#b0b0b8');px(c,f,bx+rb.bodyW+rb.armW,rb.bodyY+3,'#d0d0d8');
  }else if(ce.weapon==='mace'&&(isFr||isSd)){
    const wx=isSd?bx-2:bx+rb.bodyW+rb.armW;
    bk(c,f,wx,rb.bodyY,2,12,'#705030');bk(c,f,wx-1,rb.bodyY-3,4,4,'#808888');px(c,f,wx,rb.bodyY-3,'#a0a8a8');
  }else if(ce.weapon==='lute'&&(isSd||isBk)){
    const lx=isSd?bx-4:bx+rb.bodyW;
    // Lute body
    bk(c,f,lx,rb.bodyY+4,4,6,'#b08040');bk(c,f,lx+1,rb.bodyY+5,2,4,'#c09050');
    bk(c,f,lx+1,rb.bodyY,1,4,'#705030'); // neck
    px(c,f,lx+1,rb.bodyY-1,'#a08030'); // tuning peg
  }

  // ── OUTLINE ──
  outline(c,f);
}

function outline(c:C,f:number){
  const ox=f*SPRITE_W;const d=c.getImageData(ox,0,SPRITE_W,SPRITE_H).data;
  const op=(x:number,y:number)=>x>=0&&x<SPRITE_W&&y>=0&&y<SPRITE_H&&d[(y*SPRITE_W+x)*4+3]>20;
  const pts:[number,number][]=[];
  for(let y=0;y<SPRITE_H;y++)for(let x=0;x<SPRITE_W;x++)
    if(!op(x,y)&&(op(x-1,y)||op(x+1,y)||op(x,y-1)||op(x,y+1)))pts.push([x,y]);
  c.fillStyle='#1a1008';for(const[x,y]of pts)c.fillRect(ox+x,y,1,1);
}
