const mix = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
/** @param {string} template @param {number} phase @param {number} intensity */
export function getMotion(template, phase, intensity) {
  const p = (phase % 1 + 1) % 1;
  const a = intensity;
  const m = { sx: 1, sy: 1, x: 0, y: 0, angle: 0, warp: 0, alpha: 1 };
  if (template === 'zoom') {
    // A deadpan hold, two abrupt cuts, an uncomfortable close-up, then reset.
    const z = p < .25 ? 1 : p < .42 ? 1 + a * .8 : p < .84 ? 1 + a * 2.1 : 1;
    m.sx = z; m.sy = z;
    if (p >= .42 && p < .84) {
      m.x = Math.sin(p * 93) * a * 4;
      m.y = Math.cos(p * 79) * a * 3;
      m.warp = a * .35;
    }
  } else if (template === 'melt') {
    if (p < .18 || p > .85) return m;
    if (p > .65) {
      m.sx = 1 + .75 * a; m.sy = 1 - .52 * a; m.y = 22 * a; m.warp = -.5 * a;
    } else {
      const punch = Math.sin((p - .18) * Math.PI * 10);
      m.sx = 1 + punch * a * .65; m.sy = 1 - punch * a * .55;
      m.x = Math.sin(p * 130) * a * 17;
      m.y = Math.cos(p * 97) * a * 11;
      m.angle = Math.sin(p * 70) * a * .12;
      m.warp = Math.sin(p * 28) * a * .7;
    }
  } else if (template === 'rush') {
    if (p < .22) {
      m.x = mix(-390, 0, Math.pow(p / .22, .4)); m.angle = -.13 * a;
      m.sx = 1 + .35 * a; m.sy = 1 - .25 * a;
    } else if (p < .4) {
      const impact = 1 - (p - .22) / .18;
      m.sx = 1 + impact * a * 1.1; m.sy = 1 - impact * a * .65;
      m.y = impact * a * 65;
    } else if (p < .72) {
      const t = (p - .4) / .32;
      m.x = t * 350; m.y = -Math.sin(t * Math.PI / 2) * 350;
      m.angle = t * a * 3.5;
      m.sx = m.sy = 1 - t * .6;
    } else {
      const t = (p - .72) / .28;
      m.x = mix(-390, 0, 1 - (1 - t) ** 3);
      m.angle = -.08 * (1 - t);
    }
  }
  if (template === 'peek') {
    const approach = p < .18 ? 0 : p < .4 ? (p-.18)/.22 : p < .62 ? 1 : Math.max(0, 1-(p-.62)/.18);
    m.x = mix(300, 70, approach); m.y = 38;
    m.sx = m.sy = .72 + approach * a * .35;
    m.angle = -.16 * approach;
  } else if (template === 'kiss') {
    if (p < .35) { const t=p/.35; m.x=mix(-310,0,t*t); m.sx=m.sy=.7; }
    else if (p < .58) { m.sx=1+a*.25; m.sy=1-a*.2; m.angle=Math.sin(p*35)*.07; }
    else { const t=(p-.58)/.42; m.x=t*430; m.y=-Math.sin(t*Math.PI)*80; m.angle=t*2*a; m.sx=m.sy=.8; }
  } else if (template === 'creep') {
    m.sx=.62 + Math.sin(p*Math.PI*8)*a*.12;
    m.sy=.25 + (1-Math.cos(p*Math.PI*8))*a*.07;
    m.x=-230+p*460; m.y=85 + Math.sin(p*Math.PI*8)*6;
    m.warp=Math.sin(p*Math.PI*8)*a*.3;
  } else if (template === 'hop') {
    const beat=p*4, hop=beat%1;
    m.x=(Math.floor(beat)%2===0 ? -82 : 82);
    m.y=-Math.sin(hop*Math.PI)*95*a;
    m.sx=.58+(hop>.82 ? .2*a : 0); m.sy=.58-(hop>.82 ? .2*a : 0);
    m.angle=(m.x>0 ? 1 : -1)*Math.sin(hop*Math.PI)*.3;
  } else if (template === 'shy') {
    if(p<.3) { m.sx=m.sy=.8; m.angle=Math.sin(p*60)*a*.06; }
    else { const t=(p-.3)/.7; m.sx=m.sy=Math.max(.05,.8*(1-t)); m.y=-t*200; m.angle=t*t*a*8; m.alpha=Math.max(0,1-t*1.2); }
  } else if (template === 'cling') {
    m.sx=m.sy=.44;
  }

  return m;
}

/** @param {string} template @param {number} phase @param {number} intensity */
export function getLayers(template, phase, intensity) {
  const base=getMotion(template,phase,intensity);
  if(template!=='cling') return [base];
  const p=(phase%1+1)%1;
  const t=p<.4 ? p/.4 : p<.6 ? 1 : Math.max(0,1-(p-.6)/.32);
  const offset=mix(170,50,t*t);
  const squeeze=p>.4 && p<.6 ? Math.sin((p-.4)/.2*Math.PI)*intensity : 0;
  return [-1,1].map(side=>({...base,x:side*offset,y:15,angle:side*(-.1+t*.18),sx:.44-squeeze*.1,sy:.44+squeeze*.1}));
}
