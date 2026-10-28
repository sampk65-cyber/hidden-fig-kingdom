/* Hidden Fig Kingdom — original illustrated castle with interactive SVG layers. */
(function (global) {
  'use strict';
  const SVG = 'http://www.w3.org/2000/svg';
  const scriptSource = typeof document !== 'undefined' && document.currentScript && document.currentScript.src;
  const artworkUrl = scriptSource ? scriptSource.replace(/castle\/tower-scene\.js(?:\?.*)?$/, 'art/castle/tower-01-scene.webp') : 'art/castle/tower-01-scene.webp';
  let instanceNumber = 0;
  const palette = ['#e5453b', '#3885ef', '#27c692', '#edb839'];
  const windowShapes = [
    // The fully visible, largest opening is index 1 on each floor. Smaller
    // openings belong to other faces; their light remains naturally subdued.
    [
      'M480 918 C480 902 487 891 498 883 C510 892 517 907 517 924 L517 957 L480 940 Z',
      'M601 945 C601 926 608 908 620 900 C631 906 637 920 637 936 L635 1028 L601 1044 Z',
      'M626 847 C626 833 631 822 638 817 C646 823 650 833 650 846 L649 872 L626 884 Z'
    ],
    [
      'M478 578 L478 548 C478 538 482 530 487 526 L494 535 L494 591 Z',
      'M480 686 C480 669 489 654 501 647 C513 654 522 670 522 687 L522 776 L480 760 Z',
      'M617 669 L617 648 C617 635 623 624 630 620 C637 625 641 636 641 650 L641 662 Z'
    ],
    [
      'M478 527 C478 511 484 498 494 491 C505 499 512 512 512 529 L512 549 L478 535 Z',
      'M620 473 C620 456 628 440 638 434 C648 443 653 456 653 474 L651 526 L620 540 Z',
      'M600 577 L600 552 C600 539 605 529 612 524 L621 536 L621 585 Z'
    ],
    [
      'M443 414 C443 403 449 392 457 386 C465 392 470 403 470 416 L470 423 L443 434 Z',
      'M478 305 C478 287 487 273 498 265 C511 274 519 289 519 307 L517 398 L478 384 Z',
      'M577 318 C577 303 585 291 599 284 C614 292 622 307 622 322 L622 346 L577 363 Z'
    ]
  ];
  const flagPositions = [[568, 1010], [443, 720], [575, 500], [447, 344]];
  const occluders = [
    'M438 880 L476 890 L475 1046 L442 1060 Z',
    'M430 458 L471 477 L474 605 L439 592 Z',
    'M628 648 L656 635 L656 770 L628 789 Z',
    'M620 236 L648 225 L651 370 L621 387 Z'
  ];
  // Feet follow visible stone treads. Hidden turns pass behind original pillar
  // pixels, rather than taking an exposed straight line through the sky.
  const routes = [
    [[235,1203],[284,1156],[339,1119],[395,1081],[442,1053],[483,1046],[528,1064],[573,1083],[610,1080],[590,1063],[568,1046],[546,1029],[525,1013],[505,996],[487,980],[480,960],[475,947,0],[471,913,0],[454,870,0],[454,860]],
    [[454,860],[478,846],[502,832],[527,817],[552,803],[578,789],[602,774],[625,759],[629,747,0],[630,712,0],[628,670,0],[622,644]],
    [[622,644],[602,629],[581,613],[561,598],[541,582],[521,568],[502,552],[482,537],[475,525,0],[469,489,0],[438,466,0],[438,456]],
    [[438,456],[462,441],[488,427],[514,413],[539,399],[565,384],[591,371],[617,359],[625,346,0],[642,337,0],[656,329],[697,312],[739,296],[783,279],[830,263],[880,265]]
  ];

  function create(host, options) {
    if (!host || typeof host.appendChild !== 'function') throw new Error('城堡場景缺少顯示容器。');
    options = options || {};
    const reducedMotion = !!options.reducedMotion;
    const prefix = 'castle-art-' + (++instanceNumber) + '-';
    let disposed = false, frame = 0, lastTime = 0, elapsed = 0, firstUpdate = true;
    let state = { floor: 0, paused: false, completed: false };
    let climbAnimation = null, heroFloor = 0, pointer = null;
    let dialTarget = 0, dialAngle = 0;
    const listeners = [];
    const glassParts = [];
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 1024 1536');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('data-renderer', 'layered-art');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('castle-tower-canvas', 'castle-tower-illustration');
    svg.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden;';
    function node(tag, attrs, parent) {
      const item = document.createElementNS(SVG, tag);
      for (const key in (attrs || {})) item.setAttribute(key, attrs[key]);
      if (parent) parent.appendChild(item); return item;
    }
    function listen(target, event, fn, opts) {
      target.addEventListener(event, fn, opts); listeners.push(() => target.removeEventListener(event, fn, opts));
    }
    const defs = node('defs', {}, svg);
    const blur = node('filter', { id: prefix + 'glow', x: '-60%', y: '-40%', width: '220%', height: '180%' }, defs);
    node('feGaussianBlur', { stdDeviation: 3.2 }, blur);
    const crystalBlur = node('filter', { id: prefix + 'crystal-glow', x: '-80%', y: '-40%', width: '260%', height: '180%' }, defs);
    node('feGaussianBlur', { stdDeviation: 9 }, crystalBlur);
    const flagShadow = node('filter', { id: prefix + 'cloth-shadow', x: '-50%', y: '-30%', width: '200%', height: '180%' }, defs);
    node('feDropShadow', { dx: 1.8, dy: 2.4, stdDeviation: 1.4, 'flood-color': '#39291f', 'flood-opacity': '.40' }, flagShadow);
    const crystalGradient = node('linearGradient', { id: prefix + 'emerald', x1: '0', x2: '1', y1: '0', y2: '1' }, defs);
    node('stop', { offset: '0', 'stop-color': '#b7ffdd' }, crystalGradient);
    node('stop', { offset: '.34', 'stop-color': '#43e7b9' }, crystalGradient);
    node('stop', { offset: '.70', 'stop-color': '#079b7e' }, crystalGradient);
    node('stop', { offset: '1', 'stop-color': '#145f57' }, crystalGradient);
    const openingClip = node('clipPath', { id: prefix + 'palace-opening' }, defs);
    node('path', { d: 'M856 240 L856 155 C856 133 869 115 883 108 C898 118 911 134 911 156 L909 239 Z' }, openingClip);
    const backdrop = node('image', { href: artworkUrl, x: 0, y: 0, width: 1024, height: 1536, preserveAspectRatio: 'none' }, svg);
    backdrop.style.pointerEvents = 'none';
    const glassLayer = node('g', { style: 'isolation:isolate' }, svg);
    for (let f = 0; f < 4; f++) {
      for (let index = 0; index < 3; index++) {
        const id = prefix + 'glass-' + f + '-' + index;
        const gradient = node('linearGradient', { id, x1: '0%', y1: '0%', x2: '100%', y2: '100%' }, defs);
        const stops = [node('stop', { offset: '0', 'stop-color': palette[0], 'stop-opacity': '.40' }, gradient), node('stop', { offset: '.48', 'stop-color': palette[0], 'stop-opacity': '.96' }, gradient), node('stop', { offset: '1', 'stop-color': palette[0], 'stop-opacity': '.52' }, gradient)];
        const clip = node('clipPath', { id: id + '-clip' }, defs); node('path', { d: windowShapes[f][index] }, clip);
        const group = node('g', { 'clip-path': 'url(#' + id + '-clip)', style: 'mix-blend-mode:screen;pointer-events:none' }, glassLayer);
        const glow = node('path', { d: windowShapes[f][index], fill: 'url(#' + id + ')', opacity: '.20', filter: 'url(#' + prefix + 'glow)' }, group);
        const pane = node('path', { d: windowShapes[f][index], fill: 'url(#' + id + ')', opacity: index === 1 ? '.56' : '.13' }, group);
        glassParts.push({ floor: f, index, stops, pane, glow, color: -1, frozen: false, active: false });
      }
    }
    const flags = node('g', {}, svg);
    for (let f = 0; f < 4; f++) {
      const x = flagPositions[f][0], y = flagPositions[f][1];
      const id = prefix + 'cloth-' + f;
      const gradient = node('linearGradient', { id, x1: '0', y1: '0', x2: '1', y2: '.12' }, defs);
      node('stop', { offset: '0', 'stop-color': '#352b28' }, gradient);
      node('stop', { offset: '.17', 'stop-color': palette[f] }, gradient);
      node('stop', { offset: '.55', 'stop-color': palette[f] }, gradient);
      node('stop', { offset: '.81', 'stop-color': '#5b4836' }, gradient);
      node('stop', { offset: '1', 'stop-color': palette[f] }, gradient);
      const group = node('g', { transform: 'translate(' + x + ' ' + y + ') rotate(-3)', filter: 'url(#' + prefix + 'cloth-shadow)' }, flags);
      node('path', { d: 'M-14 -17 L14 -20', stroke: '#bd9659', 'stroke-width': '2.2', 'stroke-linecap': 'round' }, group);
      node('circle', { cx: -15, cy: -17, r: 2.2, fill: '#e8c67c' }, group);
      node('path', { d: 'M-12 -16 Q-2 -13 10 -19 L10 12 L0 20 L-12 14 Z', fill: 'url(#' + id + ')', stroke: '#b69b62', 'stroke-width': '.65' }, group);
      node('path', { d: 'M-9 -12 L-9 12 L0 17 L7 10 L7 -14', fill: 'none', stroke: '#e9c879', 'stroke-opacity': '.50', 'stroke-width': '.6' }, group);
      node('path', { d: 'M-2 -6 Q2 -2 -2 2 Q-6 -2 -2 -6 M-6 -2 Q-2 -6 2 -2 Q-2 2 -6 -2', fill: '#f2d693', opacity: '.56' }, group);
      const mask = node('clipPath', { id: id + '-post' }, defs);
      node('path', { d: 'M' + (x + 8) + ' ' + (y - 26) + ' L' + (x + 14) + ' ' + (y - 22) + ' L' + (x + 14) + ' ' + (y + 24) + ' L' + (x + 8) + ' ' + (y + 20) + ' Z' }, mask);
      node('image', { href: artworkUrl, x: 0, y: 0, width: 1024, height: 1536, 'clip-path': 'url(#' + id + '-post)', style: 'pointer-events:none' }, flags);
    }
    const crystal = node('g', { 'clip-path': 'url(#' + prefix + 'palace-opening)', style: 'mix-blend-mode:screen;pointer-events:none' }, svg);
    const crystalHalo = node('ellipse', { cx: 883, cy: 180, rx: 29, ry: 64, fill: '#4de5b7', opacity: '.32', filter: 'url(#' + prefix + 'crystal-glow)' }, crystal);
    const crystalJewel = node('g', {}, crystal);
    node('path', { d: 'M882 127 L900 160 L897 204 L880 232 L862 204 L862 163 Z', fill: 'url(#' + prefix + 'emerald)', opacity: '.85', stroke: '#c0ffe7', 'stroke-opacity': '.55', 'stroke-width': '.8' }, crystalJewel);
    node('path', { d: 'M882 127 L879 176 L862 163 Z M879 176 L880 232 L897 204 Z', fill: '#beffe1', opacity: '.36' }, crystalJewel);
    node('path', { d: 'M882 127 L900 160 L879 176 Z M879 176 L862 204 L880 232 Z', fill: '#0e9879', opacity: '.56' }, crystalJewel);
    node('path', { d: 'M862 163 L879 176 L900 160 M879 176 L880 232', stroke: '#c5ffe7', 'stroke-width': '.8', 'stroke-opacity': '.56', fill: 'none' }, crystalJewel);
    node('path', { d: 'M855 194 L862 180 L867 206 L860 217 Z M902 186 L908 175 L909 205 L901 220 Z', fill: '#50e2b4', opacity: '.42' }, crystalJewel);
    const dialClip = node('clipPath', { id: prefix + 'dial-visible' }, defs);
    node('path', { d: 'M334 1062 C351 1124 418 1166 533 1171 C637 1175 718 1144 736 1103 L714 1092 C686 1123 628 1142 533 1141 C435 1139 378 1112 356 1054 Z' }, dialClip);
    const dialAccent = node('g', { 'clip-path': 'url(#' + prefix + 'dial-visible)', opacity: '.62', style: 'pointer-events:none;mix-blend-mode:screen' }, svg);
    const dialRotor = node('g', {}, dialAccent);
    for (let i = 0; i < 36; i++) {
      const a = i * Math.PI / 18;
      node('path', { d: 'M' + (Math.sin(a) * 184) + ' ' + (Math.cos(a) * 184) + ' L' + (Math.sin(a) * 193) + ' ' + (Math.cos(a) * 193), stroke: i % 3 ? '#bb9654' : '#ffe5a4', 'stroke-width': i % 3 ? 1.2 : 2.1 }, dialRotor);
    }
    const hero = node('g', { style: 'pointer-events:none' }, svg);
    node('ellipse', { cx: 0, cy: 1, rx: 13, ry: 4, fill: '#302733', opacity: '.28' }, hero);
    let avatarUrl = String(options.avatarUrl || '');
    if (/^(?:javascript:|vbscript:|data:(?!image\/))/i.test(avatarUrl)) avatarUrl = '';
    const avatar = node('image', { href: avatarUrl, x: -22, y: -65, width: 44, height: 65, preserveAspectRatio: 'xMidYMax meet' }, hero);
    if (!avatarUrl) {
      // A quiet loading silhouette is used only when no member image is supplied.
      node('path', { d: 'M-9 -37 L-16 -5 Q0 1 16 -5 L8 -37 Z', fill: '#835c37' }, hero);
      node('circle', { cx: 0, cy: -47, r: 9, fill: '#d7b788' }, hero);
    }
    const occlusionLayer = node('g', { style: 'pointer-events:none' }, svg);
    occluders.forEach((d, index) => {
      const clip = node('clipPath', { id: prefix + 'pillar-' + index }, defs); node('path', { d }, clip);
      node('image', { href: artworkUrl, x: 0, y: 0, width: 1024, height: 1536, 'clip-path': 'url(#' + prefix + 'pillar-' + index + ')' }, occlusionLayer);
    });
    const interaction = node('g', {}, svg);
    for (let f = 0; f < 4; f++) {
      for (let index = 0; index < 3; index++) {
        const target = node('path', { d: windowShapes[f][index], fill: 'transparent', style: 'cursor:help;pointer-events:all' }, interaction);
        listen(target, 'pointerdown', event => {
          if (state.paused || disposed) return;
          if (typeof options.onInspect === 'function') options.onInspect({ kind: 'window', floor: f, index });
          event.stopPropagation();
        });
      }
      const target = node('path', { d: 'M' + (flagPositions[f][0] - 17) + ' ' + (flagPositions[f][1] - 24) + ' h34 v49 h-34 Z', fill: 'transparent', style: 'cursor:help;pointer-events:all' }, interaction);
      listen(target, 'pointerdown', event => {
        if (state.paused || disposed) return;
        if (typeof options.onInspect === 'function') options.onInspect({ kind: 'flag', floor: f, index: f });
        event.stopPropagation();
      });
    }
    const dialTargetArea = node('path', { d: 'M348 1057 C362 1121 429 1158 535 1158 C632 1160 709 1136 730 1107', fill: 'none', stroke: 'transparent', 'stroke-width': 52, style: 'cursor:grab;pointer-events:stroke' }, interaction);
    host.appendChild(svg);

    function floorPosition(floor) { return floor <= 0 ? routes[0][0] : routes[Math.min(4, floor) - 1].slice(-1)[0]; }
    function placeHero(point, bounce) {
      hero.setAttribute('transform', 'translate(' + point[0].toFixed(2) + ' ' + (point[1] + (bounce || 0)).toFixed(2) + ')');
      hero.setAttribute('opacity', point.length > 2 ? point[2].toFixed(3) : '1');
    }
    placeHero(floorPosition(0));
    function cancelFrame() { if (frame) global.cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    function visible() { return !document.hidden; }
    function requestRender() { if (!disposed && visible() && !frame) frame = global.requestAnimationFrame(render); }
    function render(now) {
      frame = 0; if (disposed || !visible()) return;
      const rawDt = lastTime ? Math.max(0,(now-lastTime)/1000) : 0; const dt=Math.min(rawDt,0.075); lastTime=now;
      if (!state.paused) elapsed += dt;
      if (!reducedMotion && !state.paused) {
        dialAngle += (dialTarget - dialAngle) * Math.min(1, dt * 13);
        crystalHalo.setAttribute('opacity', ((state.completed ? .46 : .30) + Math.sin(elapsed * 1.3) * .035).toFixed(3));
        crystalJewel.setAttribute('transform', 'translate(0 ' + (Math.sin(elapsed * 1.4) * 1.1).toFixed(2) + ')');
      } else dialAngle = dialTarget;
      dialRotor.setAttribute('transform', 'translate(535 1054) scale(1 .56) rotate(' + dialAngle.toFixed(2) + ')');
      if (climbAnimation && !state.paused) {
        const animation = climbAnimation; animation.time += rawDt;
        const t = Math.min(1, animation.time / animation.duration);
        const p = t < .08 ? t * t / .08 : t > .92 ? 1 - (1 - t) * (1 - t) / .08 : t;
        const distance = p * animation.length;
        let segment = 0; while (segment < animation.distances.length - 1 && animation.distances[segment + 1] < distance) segment++;
        const a = animation.points[segment], b = animation.points[Math.min(segment + 1, animation.points.length - 1)];
        const length = animation.distances[segment + 1] - animation.distances[segment] || 1;
        const k = Math.max(0, Math.min(1, (distance - animation.distances[segment]) / length));
        const alphaA = a.length > 2 ? a[2] : 1, alphaB = b.length > 2 ? b[2] : 1;
        placeHero([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, alphaA + (alphaB - alphaA) * k], -Math.abs(Math.sin(t * Math.PI * 26)) * 1.1);
        if (t >= 1) { heroFloor = animation.to; placeHero(floorPosition(heroFloor)); climbAnimation = null; animation.resolve(); }
      }
      if (!state.paused && (!reducedMotion || climbAnimation)) frame = global.requestAnimationFrame(render);
    }
    function pointerUp(event) {
      if (!pointer || (event && pointer.id !== event.pointerId)) return;
      try { if (svg.hasPointerCapture(pointer.id)) svg.releasePointerCapture(pointer.id); } catch (_) { /* Detached SVG. */ }
      pointer = null; dialTargetArea.style.cursor = 'grab';
    }
    listen(dialTargetArea, 'pointerdown', event => {
      if (disposed || state.paused || state.completed || state.floor >= 4 || event.button > 0) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, accumulated: 0 };
      try { svg.setPointerCapture(event.pointerId); } catch (_) { /* Pointer already ended. */ }
      dialTargetArea.style.cursor = 'grabbing'; event.preventDefault(); event.stopPropagation();
    });
    listen(svg, 'pointermove', event => {
      if (!pointer || pointer.id !== event.pointerId || state.paused) return;
      pointer.accumulated += Math.max(-75, Math.min(75, event.clientX - pointer.x - (event.clientY - pointer.y) * .35));
      pointer.x = event.clientX; pointer.y = event.clientY;
      const rect = svg.getBoundingClientRect(); const notch = Math.max(20, Math.min(30, rect.width * .065));
      let steps = 0;
      while (Math.abs(pointer.accumulated) >= notch && steps++ < 3) {
        const direction = pointer.accumulated > 0 ? 1 : -1; pointer.accumulated -= direction * notch;
        dialTarget += direction * 30;
        if (typeof options.onDialStep === 'function') options.onDialStep(direction);
      }
      event.preventDefault(); requestRender();
    });
    listen(svg, 'pointerup', pointerUp); listen(svg, 'pointercancel', pointerUp); listen(svg, 'lostpointercapture', pointerUp);
    listen(document, 'visibilitychange', () => { if (document.hidden) cancelFrame(); else requestRender(); });
    function update(next) {
      if (disposed || !next) return;
      const wasPaused = state.paused; state = Object.assign({}, state, next);
      const floor = Math.max(0, Math.min(4, Number(state.floor) || 0));
      if (firstUpdate) { heroFloor = floor; placeHero(floorPosition(floor)); firstUpdate = false; }
      for (const part of glassParts) {
        const at = part.floor * 3 + part.index;
        const color = state.windows && Number.isInteger(state.windows[at]) ? Math.max(0, Math.min(3, state.windows[at])) : 0;
        const frozen = !!(state.frozen && state.frozen[at]); const active = part.floor === floor;
        if (color !== part.color) { for (const stop of part.stops) stop.setAttribute('stop-color', palette[color]); part.color = color; }
        if (part.frozen !== frozen || part.active !== active || part.solved !== (part.floor < floor)) {
          const solved = part.floor < floor || (Array.isArray(state.solved) && !!state.solved[part.floor]);
          const opacity = part.index === 1 ? (frozen || solved ? .65 : active ? .57 : .40) : (frozen ? .22 : active ? .15 : .10);
          part.pane.setAttribute('opacity', opacity); part.glow.setAttribute('opacity', part.index === 1 ? (solved ? .32 : .21) : .06);
          part.frozen = frozen; part.active = active; part.solved = solved;
        }
      }
      if (Number.isFinite(next.dial)) dialTarget = next.dial * 30;
      if (state.paused) { pointerUp(); cancelFrame(); } else if (wasPaused) lastTime = 0;
      requestRender();
    }
    function climb(from, to) {
      if (disposed) return Promise.resolve();
      if (climbAnimation) { const previous = climbAnimation; climbAnimation = null; previous.resolve(); }
      const start = Math.max(0, Math.min(4, Math.floor(Number(from) || 0)));
      const destination = Math.max(0, Math.min(4, Math.floor(Number(to) || 0))); firstUpdate = false;
      if (reducedMotion || destination <= start || !visible()) { heroFloor = destination; placeHero(floorPosition(destination)); requestRender(); return Promise.resolve(); }
      const points = [];
      for (let f = start; f < destination; f++) for (const point of routes[f]) points.push(point);
      const distances = [0];
      for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
      placeHero(floorPosition(start));
      return new Promise(resolve => {
        climbAnimation = { points, distances, length: distances[distances.length - 1], time: 0, duration: Math.min(6.8, (start === 0 || destination === 4 ? 2.2 : 1.85) * (destination - start)), to: destination, resolve };
        requestRender();
      });
    }
    function dispose() {
      if (disposed) return; disposed = true; cancelFrame(); pointerUp();
      if (climbAnimation) { const animation = climbAnimation; climbAnimation = null; animation.resolve(); }
      for (const remove of listeners) remove(); glassParts.length = 0;
      if (svg.parentNode === host) host.removeChild(svg);
    }
    requestRender();
    return { update, climb, dispose };
  }
  global.CastleTowerScene = Object.freeze({ create });
})(window);
