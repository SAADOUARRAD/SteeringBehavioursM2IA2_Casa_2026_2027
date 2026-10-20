/**
 * WorldRenderer.js — Futuristic World Environment Renderer
 * « GRAND PRIX FUTURISTE CYBERPUNK — NEO TOKYO 2099 »
 *
 * Ce module gère EXCLUSIVEMENT l'environnement visuel (décor, ville, pluie,
 * néons, bâtiments, ponts, véhicules de fond, hologrammes, effets atmosphériques).
 * Il ne touche PAS à la logique IA, aux voitures, aux murs, ni à l'interface.
 *
 * Architecture :
 *   WorldRenderer.init()       → génère les éléments statiques (bâtiments, ponts…)
 *   WorldRenderer.update()     → met à jour les animations (pluie, trafic, néons…)
 *   WorldRenderer.drawBackground()  → rendu AVANT la piste
 *   WorldRenderer.drawForeground()  → rendu APRÈS la piste (pluie au premier plan, etc.)
 */

const WorldRenderer = (() => {
    'use strict';

    // =========================================================
    // 1. STATE INTERNAL
    // =========================================================
    let _frame = 0;
    let _theme = 'tokyo';   // 'tokyo' | 'mars' | 'lunar' | 'volcanic'

    // Generated world elements
    let _buildings   = [];
    let _bridges     = [];
    let _holoSigns   = [];
    let _bgVehicles  = [];
    let _flyingVehicles = [];
    let _rainDrops   = [];
    let _particles   = [];   // atmospheric particles (dust, ash, etc.)
    let _stars       = [];
    let _lampPosts   = [];

    // Checkpoint glow timers
    let _cpGlowTimers = {};   // { cpIndex: timer }

    // =========================================================
    // 2. PALETTE / THEME CONFIG
    // =========================================================
    const THEMES = {
        tokyo: {
            sky1: [3, 4, 14],
            sky2: [8, 12, 35],
            skyAccent: [20, 8, 45],
            fog: [6, 10, 28],
            asphaltWet: [12, 16, 26],
            neonA: [0, 220, 255],
            neonB: [180, 0, 255],
            neonC: [255, 20, 120],
            buildingBase: [14, 18, 32],
            buildingAccent: [18, 26, 52],
            rain: true,
            stars: false,
            dust: false,
            lava: false,
            fogDensity: 0.55,
            particleColor: [80, 120, 255],
            envLabel: 'NEO TOKYO 2099'
        },
        mars: {
            sky1: [48, 16, 8],
            sky2: [90, 35, 12],
            skyAccent: [110, 45, 15],
            fog: [80, 35, 15],
            asphaltWet: [38, 22, 14],
            neonA: [255, 130, 20],
            neonB: [255, 60, 40],
            neonC: [200, 180, 60],
            buildingBase: [35, 20, 12],
            buildingAccent: [55, 30, 18],
            rain: false,
            stars: true,
            dust: true,
            lava: false,
            fogDensity: 0.35,
            particleColor: [180, 80, 30],
            envLabel: 'MARS GRAND PRIX'
        },
        lunar: {
            sky1: [2, 4, 18],
            sky2: [4, 8, 28],
            skyAccent: [5, 10, 40],
            fog: [4, 6, 20],
            asphaltWet: [18, 20, 28],
            neonA: [120, 180, 255],
            neonB: [60, 120, 255],
            neonC: [200, 220, 255],
            buildingBase: [16, 20, 32],
            buildingAccent: [22, 28, 48],
            rain: false,
            stars: true,
            dust: true,
            lava: false,
            fogDensity: 0.2,
            particleColor: [180, 200, 255],
            envLabel: 'LUNAR RACING BASE'
        },
        volcanic: {
            sky1: [20, 6, 4],
            sky2: [40, 10, 4],
            skyAccent: [60, 15, 5],
            fog: [35, 10, 6],
            asphaltWet: [22, 10, 8],
            neonA: [255, 80, 0],
            neonB: [255, 180, 0],
            neonC: [200, 50, 0],
            buildingBase: [25, 10, 8],
            buildingAccent: [40, 16, 10],
            rain: false,
            stars: false,
            dust: true,
            lava: true,
            fogDensity: 0.65,
            particleColor: [255, 100, 20],
            envLabel: 'VOLCANIC CORE'
        }
    };

    // =========================================================
    // 3. HELPER UTILITIES
    // =========================================================
    function _p5c(arr, a) {
        return color(arr[0], arr[1], arr[2], a !== undefined ? a : 255);
    }

    function _lerp3(a, b, t) {
        return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t
        ];
    }

    function _rand(a, b) {
        return a + Math.random() * (b - a);
    }

    function _glowLine(x1, y1, x2, y2, col, weight, glowRadius) {
        if (typeof push !== 'function') return;
        // Outer glow
        stroke(red(col), green(col), blue(col), 35);
        strokeWeight(weight + glowRadius * 2);
        line(x1, y1, x2, y2);
        // Inner bright
        stroke(red(col), green(col), blue(col), 180);
        strokeWeight(weight);
        line(x1, y1, x2, y2);
    }

    // =========================================================
    // 4. GENERATION — called once in init() or when theme changes
    // =========================================================
    function _generateBuildings(W, H, theme) {
        _buildings = [];
        const t = THEMES[theme] || THEMES.tokyo;

        // Far background megastructures (very tall, low detail)
        for (let i = 0; i < 28; i++) {
            let bw = _rand(40, 130);
            let bh = _rand(H * 0.25, H * 0.75);
            let bx = _rand(-50, W + 50);
            let by = H - bh + _rand(-60, 60);
            _buildings.push({
                x: bx, y: by, w: bw, h: bh,
                layer: 0,
                colorBase: _lerp3(t.buildingBase, [0, 0, 0], _rand(0, 0.3)),
                windows: _generateWindowGrid(bw, bh, 0.15),
                hasSign: Math.random() < 0.2,
                signColor: [t.neonA, t.neonB, t.neonC][Math.floor(_rand(0, 3))],
                antennaH: _rand(0, 30),
                screenW: _rand(0, bw * 0.6),
                screenH: _rand(0, 25)
            });
        }

        // Mid-layer buildings (medium detail, accents)
        for (let i = 0; i < 22; i++) {
            let bw = _rand(30, 90);
            let bh = _rand(H * 0.15, H * 0.55);
            let bx = _rand(-30, W + 30);
            let by = H - bh + _rand(-30, 40);
            _buildings.push({
                x: bx, y: by, w: bw, h: bh,
                layer: 1,
                colorBase: t.buildingAccent,
                windows: _generateWindowGrid(bw, bh, 0.4),
                hasSign: Math.random() < 0.35,
                signColor: [t.neonA, t.neonB, t.neonC][Math.floor(_rand(0, 3))],
                antennaH: _rand(0, 20),
                screenW: _rand(0, bw * 0.5),
                screenH: _rand(0, 20)
            });
        }

        // Foreground structures (highly detailed, close to track)
        for (let i = 0; i < 12; i++) {
            let bw = _rand(20, 55);
            let bh = _rand(H * 0.08, H * 0.35);
            let bx = _rand(0, W);
            let by = H - bh + _rand(-10, 20);
            _buildings.push({
                x: bx, y: by, w: bw, h: bh,
                layer: 2,
                colorBase: _lerp3(t.buildingAccent, t.neonA, 0.06),
                windows: _generateWindowGrid(bw, bh, 0.7),
                hasSign: Math.random() < 0.5,
                signColor: [t.neonA, t.neonB, t.neonC][Math.floor(_rand(0, 3))],
                antennaH: _rand(0, 14),
                screenW: _rand(0, bw * 0.4),
                screenH: _rand(0, 16)
            });
        }

        // Sort back to front
        _buildings.sort((a, b) => a.layer - b.layer || (a.y + a.h) - (b.y + b.h));
    }

    function _generateWindowGrid(bw, bh, density) {
        let cols = Math.max(1, Math.floor(bw / 8));
        let rows = Math.max(1, Math.floor(bh / 10));
        let windows = [];
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                if (Math.random() < density) {
                    windows.push({
                        cx: c / cols,
                        cy: r / rows,
                        lit: Math.random() > 0.25,
                        flickerRate: _rand(0.002, 0.015),
                        brightness: _rand(0.5, 1.0)
                    });
                }
            }
        }
        return windows;
    }

    function _generateBridges(W, H) {
        _bridges = [];
        for (let i = 0; i < 4; i++) {
            let x1 = _rand(0, W * 0.4);
            let y1 = _rand(H * 0.1, H * 0.6);
            let x2 = _rand(W * 0.6, W);
            let y2 = _rand(H * 0.1, H * 0.6);
            _bridges.push({
                x1, y1, x2, y2,
                thickness: _rand(6, 16),
                roadColor: [30, 35, 55],
                railColor: null, // will use theme neon
                numCables: Math.floor(_rand(4, 10)),
                towerH: _rand(40, 100)
            });
        }
    }

    function _generateHoloSigns(W, H, theme) {
        _holoSigns = [];
        const t = THEMES[theme] || THEMES.tokyo;
        const labels = [
            'NEURAL MOTORS', 'AI GRAND PRIX', 'AUTONOMOUS RACING',
            'QUANTUM DRIVE', 'NEXUS ENERGY', 'FUTURE MOBILITY',
            'CYBERDYNE RACING', 'NEURO-EVOLUTION', 'GEN ' + (typeof generation !== 'undefined' ? generation : '?'),
            '深夜 CIRCUIT', '未来 AI', 'GRID PROTOCOL'
        ];
        for (let i = 0; i < 8; i++) {
            _holoSigns.push({
                x: _rand(30, W - 30),
                y: _rand(H * 0.05, H * 0.65),
                w: _rand(80, 180),
                h: _rand(25, 55),
                label: labels[Math.floor(_rand(0, labels.length))],
                color: [t.neonA, t.neonB, t.neonC][Math.floor(_rand(0, 3))],
                flickerPhase: _rand(0, Math.PI * 2),
                flickerSpeed: _rand(0.04, 0.18),
                opacity: _rand(0.5, 0.9),
                rotation: _rand(-0.15, 0.15),
                pulseTimer: 0
            });
        }
    }

    function _generateBgVehicles(W, H) {
        _bgVehicles = [];
        for (let i = 0; i < 18; i++) {
            // Pick a bridge or sky lane
            let useBridge = Math.random() < 0.5 && _bridges.length > 0;
            let bIdx = Math.floor(_rand(0, _bridges.length));
            let br = _bridges[bIdx] || { x1: 0, y1: H * 0.3, x2: W, y2: H * 0.3 };
            let speed = _rand(0.8, 2.5);
            _bgVehicles.push({
                t: _rand(0, 1),
                speed: speed / Math.max(1, dist(br.x1, br.y1, br.x2, br.y2)) * 60,
                bridge: br,
                len: _rand(10, 22),
                col: Math.random() < 0.5 ? [255, 200, 100] : [180, 230, 255],
                tailCol: [255, 60, 60],
                layer: 1
            });
        }
    }

    function _generateFlyingVehicles(W, H) {
        _flyingVehicles = [];
        for (let i = 0; i < 10; i++) {
            _flyingVehicles.push({
                x: _rand(0, W),
                y: _rand(H * 0.01, H * 0.45),
                vx: _rand(-0.6, 0.6) || 0.2,
                vy: _rand(-0.1, 0.1),
                size: _rand(3, 8),
                col: [_rand(100, 255), _rand(150, 255), 255],
                blinkPhase: _rand(0, Math.PI * 2),
                W, H
            });
        }
    }

    function _generateRain(W, H, count) {
        _rainDrops = [];
        for (let i = 0; i < count; i++) {
            _rainDrops.push({
                x: _rand(0, W),
                y: _rand(0, H),
                len: _rand(8, 22),
                speed: _rand(12, 26),
                angle: _rand(-0.12, 0.08),
                alpha: _rand(80, 180)
            });
        }
    }

    function _generateStars(W, H) {
        _stars = [];
        for (let i = 0; i < 280; i++) {
            _stars.push({
                x: _rand(0, W),
                y: _rand(0, H * 0.6),
                r: _rand(0.5, 2.2),
                bright: _rand(120, 255),
                blinkPhase: _rand(0, Math.PI * 2),
                blinkSpeed: _rand(0.01, 0.05)
            });
        }
    }

    function _generateLampPosts(W, H) {
        _lampPosts = [];
        // Place lamp posts along the track edges at regular intervals
        if (!trackInnerPoints || trackInnerPoints.length === 0) return;
        let step = Math.max(1, Math.floor(trackInnerPoints.length / 20));
        for (let i = 0; i < trackInnerPoints.length; i += step) {
            _lampPosts.push({
                x: trackOuterPoints[i][0],
                y: trackOuterPoints[i][1],
                side: 'outer',
                h: _rand(22, 38),
                radius: _rand(30, 55),
                col: null // set from theme
            });
        }
    }

    function _generateParticles(W, H, theme) {
        _particles = [];
        const t = THEMES[theme] || THEMES.tokyo;
        for (let i = 0; i < 80; i++) {
            _particles.push({
                x: _rand(0, W),
                y: _rand(0, H),
                vx: _rand(-0.4, 0.4),
                vy: _rand(-0.8, 0.2),
                size: _rand(1, 4),
                alpha: _rand(20, 100),
                col: t.particleColor,
                life: _rand(0, 180),
                maxLife: _rand(80, 240),
                W, H
            });
        }
    }

    // =========================================================
    // 5. PUBLIC API
    // =========================================================
    function init(W, H, theme) {
        _theme = theme || (typeof TRACK_THEME !== 'undefined' ? TRACK_THEME : 'tokyo');
        const t = THEMES[_theme] || THEMES.tokyo;

        _generateBuildings(W, H, _theme);
        _generateBridges(W, H);
        _generateHoloSigns(W, H, _theme);
        _generateBgVehicles(W, H);
        _generateFlyingVehicles(W, H);
        _generateLampPosts(W, H);
        _generateParticles(W, H, _theme);

        if (t.rain) _generateRain(W, H, 280);
        if (t.stars) _generateStars(W, H);

        _frame = 0;
    }

    // Reinit when theme changes
    function setTheme(t, W, H) {
        if (t === _theme) return;
        _theme = t;
        init(W, H, t);
    }

    // Called every draw() frame BEFORE track surface
    function drawBackground(W, H, leadCarX, leadCarY, leadCarSpeed) {
        const t = THEMES[_theme] || THEMES.tokyo;

        // ── SKY GRADIENT ──────────────────────────────────────
        _drawSkyGradient(W, H, t);

        // ── STARS / SUN / EARTH ───────────────────────────────
        if (t.stars) {
            _drawStars(H);
            if (_theme === 'lunar') _drawEarth(W, H);
            if (_theme === 'mars')  _drawMarsSun(W, H);
        }

        // ── FOG LAYER (very far) ───────────────────────────────
        _drawFogLayer(W, H, t, 0, H * 0.35, 0.65);

        // ── FAR BACKGROUND BUILDINGS ───────────────────────────
        _drawBuildings(W, H, t, 0);

        // ── BRIDGES BACKGROUND ────────────────────────────────
        _drawBridges(H, t, false);

        // ── MID-LAYER BUILDINGS ───────────────────────────────
        _drawBuildings(W, H, t, 1);

        // ── HOLOGRAPHIC SIGNS ─────────────────────────────────
        _drawHoloSigns();

        // ── FOG LAYER (mid ground) ────────────────────────────
        _drawFogLayer(W, H, t, H * 0.3, H * 0.55, 0.45 * t.fogDensity);

        // ── FOREGROUND BUILDINGS ──────────────────────────────
        _drawBuildings(W, H, t, 2);

        // ── BRIDGES FOREGROUND ────────────────────────────────
        _drawBridges(H, t, true);

        // ── LAVA CRACKS (volcanic) ─────────────────────────────
        if (t.lava) _drawLavaCracks(W, H);

        // ── ATMOSPHERIC PARTICLES ─────────────────────────────
        _updateAndDrawParticles(W, H, leadCarX, leadCarY, leadCarSpeed);

        // ── FLYING VEHICLES ───────────────────────────────────
        _updateAndDrawFlyingVehicles(W, H);

        // ── BACKGROUND ROAD VEHICLES ──────────────────────────
        _updateAndDrawBgVehicles();

        // ── LAMP POSTS ────────────────────────────────────────
        _drawLampPosts(t);

        // ── ENVIRONMENTAL NEON REFLECTIONS ON TRACK ───────────
        _drawRoadReflections(W, H, t);
    }

    // Called every draw() frame AFTER track + cars
    function drawForeground(W, H, leadCarX, leadCarY, leadCarSpeed) {
        const t = THEMES[_theme] || THEMES.tokyo;

        // ── CHECKPOINT GLOW EFFECTS ───────────────────────────
        _drawCheckpointEffects(t);

        // ── WATER SPRAY BEHIND CARS ──────────────────────────
        if (t.rain) _drawWaterSpray(leadCarX, leadCarY, leadCarSpeed, t);

        // ── RAIN (foreground, most visible) ──────────────────
        if (t.rain) _updateAndDrawRain(W, H, leadCarSpeed);

        // ── DUST STORM (mars / volcanic) ─────────────────────
        if (t.dust) _drawDustHaze(W, H, t);

        // ── BROUILLARD DE PREMIER PLAN ───────────────────────
        _drawFogLayer(W, H, t, H * 0.6, H, 0.5 * t.fogDensity);

        // ── VIGNETTE CINÉMATIQUE ─────────────────────────────
        _drawVignette(W, H);

        // ── ENV LABEL ─────────────────────────────────────────
        _drawEnvLabel(W, H, t);

        _frame++;
    }

    // Notify a checkpoint was hit (for glow animation)
    function onCheckpointHit(cpIndex) {
        _cpGlowTimers[cpIndex] = 60;
    }

    // =========================================================
    // 6. DRAW FUNCTIONS (internal)
    // =========================================================
    function _drawSkyGradient(W, H, t) {
        if (typeof drawingContext === 'undefined') return;
        let ctx = drawingContext;
        let grad = ctx.createLinearGradient(0, 0, 0, H * 0.72);
        let c1 = t.sky1, c2 = t.sky2, c3 = t.skyAccent;
        grad.addColorStop(0, `rgb(${c1[0]},${c1[1]},${c1[2]})`);
        grad.addColorStop(0.45, `rgb(${c3[0]},${c3[1]},${c3[2]})`);
        grad.addColorStop(1, `rgb(${c2[0]},${c2[1]},${c2[2]})`);

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H * 0.72);

        // Ground plane (lower area)
        let grad2 = ctx.createLinearGradient(0, H * 0.68, 0, H);
        let g = t.fog;
        grad2.addColorStop(0, `rgb(${g[0]},${g[1]},${g[2]})`);
        grad2.addColorStop(1, `rgb(${Math.max(0,g[0]-6)},${Math.max(0,g[1]-8)},${Math.max(0,g[2]-12)})`);
        ctx.fillStyle = grad2;
        ctx.fillRect(0, H * 0.68, W, H * 0.32);
    }

    function _drawStars(H) {
        push();
        noStroke();
        for (let s of _stars) {
            let b = s.bright + Math.sin(_frame * s.blinkSpeed + s.blinkPhase) * 30;
            fill(b, b, Math.min(255, b + 40), b);
            circle(s.x, s.y, s.r * 2);
        }
        pop();
    }

    function _drawEarth(W, H) {
        push();
        noStroke();
        // Earth sphere in upper right
        let ex = W * 0.82, ey = H * 0.14, er = 48;
        // Base ocean blue
        fill(20, 60, 150, 200);
        circle(ex, ey, er * 2);
        // Continent patches
        fill(30, 100, 40, 160);
        ellipse(ex - 10, ey - 12, 28, 18);
        ellipse(ex + 14, ey + 6, 22, 28);
        // Clouds
        fill(200, 220, 255, 100);
        ellipse(ex, ey - 18, 40, 12);
        ellipse(ex + 10, ey + 20, 30, 10);
        // Atmosphere glow
        noFill();
        stroke(40, 100, 255, 60);
        strokeWeight(5);
        circle(ex, ey, (er + 8) * 2);
        pop();
    }

    function _drawMarsSun(W, H) {
        push();
        noStroke();
        let sx = W * 0.75, sy = H * 0.10, sr = 22;
        // Glow
        for (let r = sr + 30; r > sr; r -= 4) {
            fill(255, 180, 60, 8);
            circle(sx, sy, r * 2);
        }
        fill(255, 200, 80, 240);
        circle(sx, sy, sr * 2);
        fill(255, 230, 120, 180);
        circle(sx, sy, sr * 1.3);
        pop();
    }

    function _drawFogLayer(W, H, t, y1, y2, alpha) {
        if (typeof drawingContext === 'undefined') return;
        if (alpha <= 0) return;
        let ctx = drawingContext;
        let fog = t.fog;
        let a = Math.min(1, Math.max(0, alpha));
        let grad = ctx.createLinearGradient(0, y1, 0, y2);
        grad.addColorStop(0, `rgba(${fog[0]},${fog[1]},${fog[2]},0)`);
        grad.addColorStop(0.5, `rgba(${fog[0]},${fog[1]},${fog[2]},${(a * 0.55).toFixed(2)})`);
        grad.addColorStop(1, `rgba(${fog[0]},${fog[1]},${fog[2]},${(a * 0.85).toFixed(2)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, y1, W, y2 - y1);
    }

    function _drawBuildings(W, H, t, layer) {
        push();
        noStroke();
        const alphaByLayer = [0.65, 0.8, 1.0];
        let al = Math.floor(255 * (alphaByLayer[layer] || 1));

        for (let b of _buildings) {
            if (b.layer !== layer) continue;

            // Main body
            fill(b.colorBase[0], b.colorBase[1], b.colorBase[2], al);
            rect(b.x, b.y, b.w, b.h);

            // Windows
            for (let w of b.windows) {
                let wx = b.x + w.cx * b.w + 2;
                let wy = b.y + w.cy * b.h + 2;
                let ww = Math.max(2, b.w / 10 - 1);
                let wh = Math.max(2, b.h / 12 - 1);

                let lit = w.lit;
                // flicker
                if (Math.random() < w.flickerRate) lit = !lit;

                if (lit) {
                    let brightness = w.brightness;
                    // Warm or cool window light
                    if (layer === 0) {
                        fill(220 * brightness, 200 * brightness, 140 * brightness, 160 * brightness);
                    } else if (layer === 1) {
                        fill(200 * brightness, 215 * brightness, 255 * brightness, 180 * brightness);
                    } else {
                        let nc = t.neonA;
                        fill(nc[0] * brightness, nc[1] * brightness, nc[2] * brightness, 160 * brightness);
                    }
                    rect(wx, wy, ww, wh, 1);
                }
            }

            // Neon sign strip on building
            if (b.hasSign) {
                let sc = b.signColor;
                let pulse = 0.6 + Math.sin(_frame * 0.04 + b.x * 0.01) * 0.4;
                fill(sc[0], sc[1], sc[2], 200 * pulse);
                rect(b.x + 2, b.y + b.h * 0.15, b.screenW, b.screenH, 2);
                // Glow
                fill(sc[0], sc[1], sc[2], 40 * pulse);
                rect(b.x - 4, b.y + b.h * 0.15 - 4, b.screenW + 8, b.screenH + 8, 4);
            }

            // Antenna
            if (b.antennaH > 0) {
                let nc = t.neonA;
                stroke(nc[0], nc[1], nc[2], 180);
                strokeWeight(1.5);
                line(b.x + b.w / 2, b.y, b.x + b.w / 2, b.y - b.antennaH);
                noStroke();
                let pulse = Math.sin(_frame * 0.08) > 0;
                fill(255, 60, 60, pulse ? 220 : 60);
                circle(b.x + b.w / 2, b.y - b.antennaH, 4);
            }

            noStroke();
        }
        pop();
    }

    function _drawBridges(H, t, foreground) {
        push();
        for (let br of _bridges) {
            let midY = (br.y1 + br.y2) / 2;
            let isFore = midY > H * 0.45;
            if (isFore !== foreground) continue;

            // Road deck
            stroke(br.roadColor[0], br.roadColor[1], br.roadColor[2]);
            strokeWeight(br.thickness);
            line(br.x1, br.y1, br.x2, br.y2);

            // Neon rail accent
            let nc = t.neonA;
            let pulse = 0.7 + Math.sin(_frame * 0.03) * 0.3;
            _glowLine(br.x1, br.y1 - br.thickness * 0.5, br.x2, br.y2 - br.thickness * 0.5,
                color(nc[0], nc[1], nc[2]), 1.5, 4);

            // Suspension cables
            noFill();
            let steps = br.numCables;
            for (let i = 0; i <= steps; i++) {
                let tt = i / steps;
                let cx = lerp(br.x1, br.x2, tt);
                let cy = lerp(br.y1, br.y2, tt);
                let towerTopY = cy - br.towerH * (1 - 4 * (tt - 0.5) * (tt - 0.5));
                stroke(80, 90, 110, 140);
                strokeWeight(0.8);
                line(cx, cy - br.thickness * 0.5, cx, towerTopY);
            }
        }
        pop();
    }

    function _drawHoloSigns() {
        push();
        for (let h of _holoSigns) {
            let flicker = 0.7 + 0.3 * Math.sin(_frame * h.flickerSpeed + h.flickerPhase);
            let alpha = h.opacity * flicker * 255;
            let c = h.color;

            push();
            translate(h.x + h.w / 2, h.y + h.h / 2);
            rotate(h.rotation);

            // Hologram panel
            noStroke();
            fill(c[0], c[1], c[2], alpha * 0.18);
            rect(-h.w / 2, -h.h / 2, h.w, h.h, 4);

            // Border glow
            stroke(c[0], c[1], c[2], alpha * 0.7);
            strokeWeight(1.2);
            noFill();
            rect(-h.w / 2, -h.h / 2, h.w, h.h, 4);

            // Scanline overlay
            stroke(c[0], c[1], c[2], alpha * 0.1);
            strokeWeight(0.6);
            for (let sy = -h.h / 2 + 3; sy < h.h / 2; sy += 5) {
                line(-h.w / 2 + 2, sy, h.w / 2 - 2, sy);
            }

            // Label text
            noStroke();
            fill(c[0], c[1], c[2], alpha);
            textAlign(CENTER, CENTER);
            textSize(Math.min(11, h.h * 0.28));
            text(h.label, 0, 0);

            // Digital glitch strips (random)
            if (Math.random() < 0.02) {
                let glitchY = _rand(-h.h * 0.4, h.h * 0.4);
                fill(c[0], c[1], c[2], alpha * 0.6);
                rect(-h.w * 0.45, glitchY, h.w * 0.9 * Math.random(), 2, 1);
            }

            pop();
        }
        pop();
    }

    function _updateAndDrawBgVehicles() {
        push();
        for (let v of _bgVehicles) {
            v.t += v.speed;
            if (v.t > 1) v.t -= 1;

            let br = v.bridge;
            let vx = lerp(br.x1, br.x2, v.t);
            let vy = lerp(br.y1, br.y2, v.t);

            // Direction
            let dx = br.x2 - br.x1, dy = br.y2 - br.y1;
            let angle = Math.atan2(dy, dx);

            push();
            translate(vx, vy);
            rotate(angle);

            // Headlights (front)
            fill(v.col[0], v.col[1], v.col[2], 200);
            noStroke();
            circle(v.len / 2, -2.5, 5);
            circle(v.len / 2, 2.5, 5);
            // Light beam cone
            fill(v.col[0], v.col[1], v.col[2], 18);
            beginShape();
            vertex(v.len / 2, -3);
            vertex(v.len / 2 + 35, -12);
            vertex(v.len / 2 + 35, 12);
            vertex(v.len / 2, 3);
            endShape(CLOSE);

            // Body
            fill(v.col[0] * 0.3, v.col[1] * 0.3, v.col[2] * 0.35, 220);
            rect(-v.len / 2, -3, v.len, 6, 2);

            // Tail lights
            fill(v.tailCol[0], v.tailCol[1], v.tailCol[2], 200);
            circle(-v.len / 2, -2.5, 4);
            circle(-v.len / 2, 2.5, 4);

            pop();
        }
        pop();
    }

    function _updateAndDrawFlyingVehicles(W, H) {
        push();
        noStroke();
        for (let fv of _flyingVehicles) {
            fv.x += fv.vx;
            fv.y += fv.vy;
            if (fv.x < -20) fv.x = W + 20;
            if (fv.x > W + 20) fv.x = -20;
            if (fv.y < 0) fv.y = H * 0.02;
            if (fv.y > H * 0.5) fv.y = H * 0.5;

            let blink = Math.sin(_frame * 0.07 + fv.blinkPhase) > 0.3;
            let c = fv.col;
            fill(c[0], c[1], c[2], blink ? 220 : 60);
            circle(fv.x, fv.y, fv.size);

            // Subtle trail
            fill(c[0], c[1], c[2], 25);
            for (let i = 1; i <= 3; i++) {
                circle(fv.x - fv.vx * i * 2, fv.y - fv.vy * i * 2, fv.size * (1 - i * 0.25));
            }
        }
        pop();
    }

    function _updateAndDrawRain(W, H, speed) {
        speed = speed || 0;
        let windX = 2.5 + speed * 0.3;
        push();
        strokeCap(ROUND);
        for (let r of _rainDrops) {
            r.x += windX + r.angle * 4;
            r.y += r.speed + speed * 0.5;
            if (r.y > H + r.len) { r.y = _rand(-r.len, 0); r.x = _rand(0, W); }
            if (r.x > W + 10) { r.x = _rand(-20, 0); }

            stroke(160, 200, 255, r.alpha);
            strokeWeight(0.7);
            line(r.x, r.y, r.x + windX * 0.8, r.y + r.len);

            // Occasional splash
            if (r.y > H * 0.85 && Math.random() < 0.04) {
                noStroke();
                fill(180, 220, 255, 60);
                ellipse(r.x, H * 0.85 + _rand(-5, 5), _rand(4, 10), _rand(1, 3));
            }
        }
        pop();
    }

    function _drawWaterSpray(cx, cy, speed, t) {
        if (!cx || !cy) return;
        let intensity = Math.min(1, (speed || 0) / 5);
        if (intensity < 0.1) return;
        push();
        noStroke();
        for (let i = 0; i < Math.floor(intensity * 14); i++) {
            let angle = _rand(Math.PI * 0.55, Math.PI * 1.45);
            let dist2 = _rand(8, 28) * intensity;
            let px = cx + Math.cos(angle) * dist2;
            let py = cy + Math.sin(angle) * dist2;
            let sz = _rand(2, 6) * intensity;
            fill(160, 210, 255, _rand(60, 130) * intensity);
            circle(px, py, sz);
        }
        pop();
    }

    function _drawDustHaze(W, H, t) {
        if (typeof drawingContext === 'undefined') return;
        let ctx = drawingContext;
        let c = t.particleColor;
        let a = 0.04 + 0.025 * Math.sin(_frame * 0.008);
        let grad = ctx.createLinearGradient(0, H * 0.5, W, H * 0.5);
        grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`);
        grad.addColorStop(0.5, `rgba(${c[0]},${c[1]},${c[2]},${(a * 0.4).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, H * 0.4, W, H * 0.6);
    }

    function _drawLavaCracks(W, H) {
        push();
        let brightness = 0.5 + 0.5 * Math.sin(_frame * 0.04);
        // Glowing lava fissures in the ground area
        let numCracks = 8;
        for (let i = 0; i < numCracks; i++) {
            let cx = _rand(0, W);
            let cy = H * 0.7 + _rand(0, H * 0.3);
            let len = _rand(40, 140);
            let angle = _rand(0, Math.PI * 2);

            stroke(255, Math.floor(80 + brightness * 80), 0, 200 * brightness);
            strokeWeight(1.5);
            noFill();
            beginShape();
            let x0 = cx, y0 = cy;
            for (let s = 0; s < len; s += 8) {
                x0 += Math.cos(angle + _rand(-0.5, 0.5)) * 8;
                y0 += Math.sin(angle + _rand(-0.5, 0.5)) * 4;
                vertex(x0, y0);
            }
            endShape();

            // Inner glow
            stroke(255, 160 + Math.floor(brightness * 60), 0, 80 * brightness);
            strokeWeight(4);
            line(cx, cy, x0, y0);
        }
        pop();
    }

    function _updateAndDrawParticles(W, H, cx, cy, speed) {
        push();
        noStroke();
        const t = THEMES[_theme] || THEMES.tokyo;

        for (let p of _particles) {
            p.x += p.vx + (Math.random() - 0.5) * 0.3;
            p.y += p.vy;
            p.life++;
            if (p.life > p.maxLife || p.y < -10) {
                p.x = _rand(0, W);
                p.y = H * _rand(0.2, 1.0);
                p.life = 0;
            }

            let lifeRatio = p.life / p.maxLife;
            let a = p.alpha * (1 - lifeRatio * 0.7);
            let c = p.col;
            fill(c[0], c[1], c[2], a);
            circle(p.x, p.y, p.size * (1 - lifeRatio * 0.5));
        }

        // Extra emission near lead car
        if (cx && cy && speed > 1.5) {
            for (let i = 0; i < Math.floor(speed * 2); i++) {
                let px = cx + _rand(-15, 15);
                let py = cy + _rand(-15, 15);
                let c = t.neonA;
                fill(c[0], c[1], c[2], _rand(20, 70));
                circle(px, py, _rand(1, 4));
            }
        }
        pop();
    }

    function _drawLampPosts(t) {
        if (_lampPosts.length === 0) return;
        push();
        let nc = t.neonA;
        for (let lp of _lampPosts) {
            // Post
            stroke(60, 70, 90, 200);
            strokeWeight(2);
            line(lp.x, lp.y, lp.x, lp.y - lp.h);
            // Arm
            line(lp.x, lp.y - lp.h, lp.x + 10, lp.y - lp.h - 5);

            // Light halo
            let pulse = 0.8 + 0.2 * Math.sin(_frame * 0.05 + lp.x * 0.01);
            noStroke();
            fill(nc[0], nc[1], nc[2], 35 * pulse);
            circle(lp.x + 10, lp.y - lp.h - 5, lp.radius);
            fill(nc[0], nc[1], nc[2], 15 * pulse);
            circle(lp.x + 10, lp.y - lp.h - 5, lp.radius * 2);
            fill(255, 255, 220, 200 * pulse);
            circle(lp.x + 10, lp.y - lp.h - 5, 5);
        }
        pop();
    }

    function _drawRoadReflections(W, H, t) {
        // Soft neon reflections on road surface from lamps and neon signs
        if (typeof drawingContext === 'undefined') return;
        if (!trackCenterPoints || trackCenterPoints.length === 0) return;

        let ctx = drawingContext;
        let nc = t.neonA;
        let nb = t.neonB;

        // Animate subtle neon shimmer along track
        let shimmerAlpha = 0.04 + 0.02 * Math.sin(_frame * 0.06);
        ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${shimmerAlpha.toFixed(3)})`;

        // Fill approximate road area with neon tint
        ctx.beginPath();
        if (trackInnerPoints.length > 0) {
            ctx.moveTo(trackInnerPoints[0][0], trackInnerPoints[0][1]);
            for (let p of trackInnerPoints) ctx.lineTo(p[0], p[1]);
            ctx.closePath();
        }
        ctx.fill();

        ctx.fillStyle = `rgba(${nb[0]},${nb[1]},${nb[2]},${(shimmerAlpha * 0.5).toFixed(3)})`;
        ctx.beginPath();
        if (trackOuterPoints.length > 0) {
            ctx.moveTo(trackOuterPoints[0][0], trackOuterPoints[0][1]);
            for (let p of trackOuterPoints) ctx.lineTo(p[0], p[1]);
            ctx.closePath();
        }
        ctx.fill();
    }

    function _drawCheckpointEffects(t) {
        push();
        for (let cpIdx in _cpGlowTimers) {
            let timer = _cpGlowTimers[cpIdx];
            if (timer <= 0) { delete _cpGlowTimers[cpIdx]; continue; }
            _cpGlowTimers[cpIdx]--;

            let cp = (typeof checkpoints !== 'undefined') ? checkpoints[cpIdx] : null;
            if (!cp) continue;

            let cx = (cp.a.x + cp.b.x) / 2;
            let cy = (cp.a.y + cp.b.y) / 2;
            let progress = 1 - timer / 60;
            let r = 20 + progress * 80;
            let alpha = (1 - progress) * 200;

            noStroke();
            let nc = t.neonA;
            fill(nc[0], nc[1], nc[2], alpha * 0.3);
            circle(cx, cy, r * 2);
            stroke(nc[0], nc[1], nc[2], alpha);
            strokeWeight(2);
            noFill();
            circle(cx, cy, r * 2);

            // Label
            noStroke();
            fill(255, 255, 255, alpha);
            textSize(11);
            textAlign(CENTER, CENTER);
            text(`CP ${parseInt(cpIdx) + 1}`, cx, cy - r - 8);
        }
        pop();
    }

    function _drawVignette(W, H) {
        if (typeof drawingContext === 'undefined') return;
        let ctx = drawingContext;
        let grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }

    function _drawEnvLabel(W, H, t) {
        push();
        noStroke();
        let label = t.envLabel || '';
        let nc = t.neonA;
        let alpha = 80 + 40 * Math.sin(_frame * 0.025);
        fill(nc[0], nc[1], nc[2], alpha);
        textSize(9);
        textAlign(LEFT, TOP);
        text(label, 22, 22);
        pop();
    }

    // =========================================================
    // 7. EXPORTED OBJECT
    // =========================================================
    return { init, setTheme, drawBackground, drawForeground, onCheckpointHit };

})(); // end IIFE
