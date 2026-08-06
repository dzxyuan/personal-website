/* ============================================
   加糖个人网页 — 交互逻辑 v5
   黑 + 荧光绿 · 居中排版 · 1320px 安全区
   ============================================ */
(function () {
    'use strict';

    /* ---------- 1. 加载动画 ---------- */
    function initLoader() {
        const loader = document.getElementById('loader');
        if (!loader) return;
        setTimeout(() => {
            loader.classList.add('is-hidden');
            triggerAllInitial();
        }, 2200);
    }

    /* ---------- 2. 首次揭示 ---------- */
    function triggerAllInitial() {
        document.querySelectorAll('[data-reveal]').forEach((el, i) => {
            setTimeout(() => el.classList.add('is-visible'), 100 + i * 60);
        });
    }

    /* ---------- 3. 双向滚动揭示 ---------- */
    function initScrollReveal() {
        const elements = document.querySelectorAll('[data-reveal]');
        const container = document.getElementById('scrollContainer');
        if (!('IntersectionObserver' in window)) {
            elements.forEach(el => el.classList.add('is-visible'));
            return;
        }

        const states = new WeakMap();
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const el = entry.target;
                if (entry.isIntersecting) {
                    el.classList.add('is-visible');
                    states.set(el, true);
                } else if (states.get(el)) {
                    el.classList.remove('is-visible');
                    states.set(el, false);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px', root: container });

        elements.forEach(el => observer.observe(el));
    }

    /* ---------- 4. 蓝噪声背景光影动态 ---------- */
    function initBgNoise() {
        const light = document.getElementById('noiseLight');
        if (!light) return;

        let mx = window.innerWidth / 2, my = window.innerHeight / 2;
        let cx = mx, cy = my;
        let ambAngle = 0;

        document.addEventListener('mousemove', (e) => {
            mx = e.clientX; my = e.clientY;
        });

        function tick() {
            cx += (mx - cx) * 0.05;
            cy += (my - cy) * 0.05;

            ambAngle += 0.003;
            light.style.setProperty('--light-2x', (50 + Math.cos(ambAngle) * 30) + '%');
            light.style.setProperty('--light-2y', (50 + Math.sin(ambAngle * 0.8) * 25) + '%');
            light.style.setProperty('--light-3x', (50 + Math.cos(ambAngle * 1.3 + 2) * 35) + '%');
            light.style.setProperty('--light-3y', (50 + Math.sin(ambAngle * 1.1 + 1) * 30) + '%');

            requestAnimationFrame(tick);
        }
        tick();
    }

    /* ---------- 4b. 网格染料平流烟雾 ---------- */
    function initLiquidRipple() {
        const canvas = document.getElementById('smokeCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: true });

        const GW = 200, GH = 120;
        let dye, dyeTmp, vel, velTmp;

        function allocFields() {
            dye = new Float32Array(GW * GH * 3);
            dyeTmp = new Float32Array(GW * GH * 3);
            vel = new Float32Array(GW * GH * 2);
            velTmp = new Float32Array(GW * GH * 2);
        }
        allocFields();

        const imgData = ctx.createImageData(GW, GH);
        const pixels = imgData.data;

        const offCanvas = document.createElement('canvas');
        offCanvas.width = GW;
        offCanvas.height = GH;
        const offCtx = offCanvas.getContext('2d');

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        let mx = window.innerWidth / 2, my = window.innerHeight / 2;
        let lastMx = mx, lastMy = my;
        let lastMoveTime = 0;

        document.addEventListener('mousemove', (e) => {
            mx = e.clientX; my = e.clientY;
            lastMoveTime = performance.now();
        });

        function splat(dyeArr, velArr, px, py, vx, vy, radius, dyeAmt, velAmt) {
            const gx = (px / window.innerWidth) * GW;
            const gy = (py / window.innerHeight) * GH;
            const gR = Math.ceil(radius);
            for (let y = -gR; y <= gR; y++) {
                for (let x = -gR; x <= gR; x++) {
                    const ix = Math.floor(gx) + x;
                    const iy = Math.floor(gy) + y;
                    if (ix < 1 || ix >= GW - 1 || iy < 1 || iy >= GH - 1) continue;
                    const dist2 = x * x + y * y;
                    const r2 = radius * radius;
                    if (dist2 > r2 * 4) continue;
                    const w = Math.exp(-dist2 / (r2 * 0.25));
                    const idx = (iy * GW + ix);
                    const di = idx * 3;
                    dyeArr[di]     += dyeAmt * w;
                    dyeArr[di + 1] += dyeAmt * w * 1.15;
                    dyeArr[di + 2] += dyeAmt * w * 1.6;
                    const vi = idx * 2;
                    velArr[vi]     += vx * velAmt * w;
                    velArr[vi + 1] += vy * velAmt * w;
                }
            }
        }

        function advect(src, dst, velField, channels) {
            for (let y = 1; y < GH - 1; y++) {
                for (let x = 1; x < GW - 1; x++) {
                    const idx = y * GW + x;
                    const vi = idx * 2;
                    const vx = velField[vi] * 0.5;
                    const vy = velField[vi + 1] * 0.5;
                    let srcX = x - vx;
                    let srcY = y - vy;
                    if (srcX < 0) srcX = 0; else if (srcX >= GW - 1) srcX = GW - 1;
                    if (srcY < 0) srcY = 0; else if (srcY >= GH - 1) srcY = GH - 1;
                    const x0 = Math.floor(srcX), y0 = Math.floor(srcY);
                    const x1 = Math.min(x0 + 1, GW - 1), y1 = Math.min(y0 + 1, GH - 1);
                    const fx = srcX - x0, fy = srcY - y0;
                    const i00 = y0 * GW + x0;
                    const i10 = y0 * GW + x1;
                    const i01 = y1 * GW + x0;
                    const i11 = y1 * GW + x1;
                    for (let c = 0; c < channels; c++) {
                        const c00 = src[i00 * channels + c];
                        const c10 = src[i10 * channels + c];
                        const c01 = src[i01 * channels + c];
                        const c11 = src[i11 * channels + c];
                        const top = c00 + (c10 - c00) * fx;
                        const bot = c01 + (c11 - c01) * fx;
                        dst[idx * channels + c] = top + (bot - top) * fy;
                    }
                }
            }
        }

        let lastFrame = performance.now();

        function tick() {
            const now = performance.now();
            const dt = Math.min((now - lastFrame) / 1000, 0.05);
            lastFrame = now;

            const sinceMove = now - lastMoveTime;
            const dx = mx - lastMx;
            const dy = my - lastMy;
            const moveDist = Math.hypot(dx, dy);

            if (moveDist > 1 && sinceMove < 150) {
                const vScale = Math.min(moveDist / 30, 1);
                const speed = Math.min(moveDist, 40);
                const steps = Math.max(1, Math.ceil(moveDist / 6));
                for (let i = 0; i < steps; i++) {
                    const t = (i + 1) / steps;
                    const px = lastMx + dx * t;
                    const py = lastMy + dy * t;
                    const vx = dx * 0.15;
                    const vy = dy * 0.15;
                    splat(dye, vel, px, py, vx, vy, 0.03 * GW * (0.5 + vScale * 0.5), 0.55 + vScale * 0.5, 0.25 + vScale * 0.4);
                }
                lastMx = mx; lastMy = my;
            } else if (moveDist > 0) {
                lastMx = mx; lastMy = my;
            }

            advect(dye, dyeTmp, vel, 3);
            for (let i = 0; i < dye.length; i++) {
                dye[i] = dyeTmp[i] * 0.965;
            }

            advect(vel, velTmp, vel, 2);
            for (let i = 0; i < vel.length; i++) {
                vel[i] = velTmp[i] * 0.92;
            }

            for (let x = 0; x < GW; x++) {
                for (let c = 0; c < 3; c++) { dye[(0 * GW + x) * 3 + c] *= 0.3; dye[((GH - 1) * GW + x) * 3 + c] *= 0.3; }
                for (let c = 0; c < 2; c++) { vel[(0 * GW + x) * 2 + c] *= 0.3; vel[((GH - 1) * GW + x) * 2 + c] *= 0.3; }
            }
            for (let y = 0; y < GH; y++) {
                for (let c = 0; c < 3; c++) { dye[(y * GW + 0) * 3 + c] *= 0.3; dye[(y * GW + GW - 1) * 3 + c] *= 0.3; }
                for (let c = 0; c < 2; c++) { vel[(y * GW + 0) * 2 + c] *= 0.3; vel[(y * GW + GW - 1) * 2 + c] *= 0.3; }
            }

            for (let y = 0; y < GH; y++) {
                for (let x = 0; x < GW; x++) {
                    const di = (y * GW + x) * 3;
                    const pi = (y * GW + x) * 4;
                    let r = dye[di];
                    let g = dye[di + 1];
                    let b = dye[di + 2];
                    r = Math.min(r, 1.5);
                    g = Math.min(g, 1.5);
                    b = Math.min(b, 2.0);
                    const cr = Math.min(255, 180 + r * 60);
                    const cg = Math.min(255, 200 + g * 50);
                    const cb = Math.min(255, 230 + b * 25);
                    const intensity = Math.min(1, (r + g + b) * 0.5);
                    const a = Math.round(intensity * 200);
                    pixels[pi]     = cr;
                    pixels[pi + 1] = cg;
                    pixels[pi + 2] = cb;
                    pixels[pi + 3] = a;
                }
            }
            offCtx.putImageData(imgData, 0, 0);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height);

            requestAnimationFrame(tick);
        }
        tick();
    }

    /* ---------- 5. 贴纸旋转 ---------- */
    function initStickerSpin() {
        const stickers = document.querySelectorAll('.sticker');
        stickers.forEach((s) => {
            const dir = Math.random() > 0.5 ? 1 : -1;
            const base = 5 + Math.pow(Math.random(), 1.3) * 35;
            const degPerSec = (360 / base) * dir;
            const inner = s.querySelector('.sticker-inner');
            if (inner) {
                inner.dataset.spinSpeed = degPerSec.toFixed(2);
                inner.dataset.spinAngle = (Math.random() * 360).toFixed(1);
            }
        });
    }

    /* ---------- 6. 3D 文字视差 ---------- */
    function init3dTextParallax() {
        const texts = document.querySelectorAll('.text-3d');
        const stickers = document.querySelectorAll('.sticker');
        if (!texts.length && !stickers.length) return;

        const baseTransforms = {
            't-design': 'rotateY(-18deg) rotateX(6deg)',
            't-uiux': 'rotateY(12deg) rotateX(-6deg)',
            't-art': 'rotateY(-22deg) rotateX(10deg)'
        };

        let mx = 0, my = 0;
        let cx = 0, cy = 0;

        document.addEventListener('mousemove', (e) => {
            mx = (e.clientX / window.innerWidth - 0.5) * 2;
            my = (e.clientY / window.innerHeight - 0.5) * 2;
        });

        function tick() {
            cx += (mx - cx) * 0.06;
            cy += (my - cy) * 0.06;

            texts.forEach((t) => {
                const depth = parseFloat(t.dataset.depth) || 0.15;
                const ry = cx * depth * 55;
                const rx = -cy * depth * 45;
                const tz = (Math.abs(cx) + Math.abs(cy)) * depth * 35;
                let base = '';
                for (const cls in baseTransforms) {
                    if (t.classList.contains(cls)) { base = baseTransforms[cls]; break; }
                }
                t.style.transform = base + ' rotateY(' + ry + 'deg) rotateX(' + rx + 'deg) translateZ(' + tz + 'px)';
            });

            stickers.forEach((s) => {
                const depth = parseFloat(s.dataset.depth) || 0.06;
                const px = cx * depth * 40;
                const py = cy * depth * 40;
                const inner = s.querySelector('.sticker-inner');
                if (inner) {
                    inner.dataset.baseTransform = 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px)';
                }
            });

            requestAnimationFrame(tick);
        }
        tick();
    }

    /* ---------- 7. Per-Sticker 液态扭曲 ---------- */
    function initLiquidDistortion() {
        const stickers = document.querySelectorAll('.sticker');
        if (!stickers.length) return;

        const distort = document.getElementById('liquidDistort');
        if (distort) distort.style.filter = 'none';

        const filterDefs = document.querySelector('.filter-defs defs');
        const perStickerMaps = [];
        if (filterDefs) {
            const svgNS = 'http://www.w3.org/2000/svg';
            stickers.forEach((s, i) => {
                const filter = document.createElementNS(svgNS, 'filter');
                filter.id = 'sticker-liquid-' + i;
                filter.setAttribute('x', '-50%');
                filter.setAttribute('y', '-50%');
                filter.setAttribute('width', '200%');
                filter.setAttribute('height', '200%');
                filter.setAttribute('color-interpolation-filters', 'sRGB');

                const turb = document.createElementNS(svgNS, 'feTurbulence');
                turb.setAttribute('type', 'fractalNoise');
                turb.setAttribute('baseFrequency', '0.015 0.020');
                turb.setAttribute('numOctaves', '3');
                turb.setAttribute('seed', String(i + 1));
                turb.setAttribute('result', 't');

                const anim1 = document.createElementNS(svgNS, 'animate');
                anim1.setAttribute('attributeName', 'baseFrequency');
                anim1.setAttribute('dur', (8 + i * 0.7) + 's');
                anim1.setAttribute('values', '0.012 0.018;0.020 0.014;0.015 0.022;0.012 0.018');
                anim1.setAttribute('repeatCount', 'indefinite');
                turb.appendChild(anim1);

                filter.appendChild(turb);

                const disp = document.createElementNS(svgNS, 'feDisplacementMap');
                disp.setAttribute('in', 'SourceGraphic');
                disp.setAttribute('in2', 't');
                disp.setAttribute('scale', '0');
                disp.setAttribute('xChannelSelector', 'R');
                disp.setAttribute('yChannelSelector', 'G');
                filter.appendChild(disp);
                filterDefs.appendChild(filter);

                const inner = s.querySelector('.sticker-inner');
                if (inner) {
                    inner.style.filter = 'url(#sticker-liquid-' + i + ')';
                }
                perStickerMaps.push(disp);
            });
        }

        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let lastMouseX = mouseX, lastMouseY = mouseY;
        let mouseVX = 0, mouseVY = 0;
        let lastMoveTime = performance.now();

        const PAUSE_MARGIN = 4;
        const IDLE_THRESHOLD = 250;
        const INFLUENCE_RADIUS = 280;

        document.addEventListener('mousemove', (e) => {
            mouseVX = e.clientX - lastMouseX;
            mouseVY = e.clientY - lastMouseY;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            mouseX = e.clientX;
            mouseY = e.clientY;
            lastMoveTime = performance.now();
        });

        const hoveredStickers = new Set();

        let lastFrameTime = performance.now();
        function tick() {
            const now = performance.now();
            const dt = (now - lastFrameTime) / 1000;
            lastFrameTime = now;

            mouseVX *= 0.82;
            mouseVY *= 0.82;
            const speed = Math.min(Math.hypot(mouseVX, mouseVY), 50);
            const idleTime = now - lastMoveTime;
            const isIdle = idleTime > IDLE_THRESHOLD;
            const idleFactor = isIdle
                ? Math.min((idleTime - IDLE_THRESHOLD) / 300, 1)
                : 0;

            stickers.forEach((s) => {
                const rect = s.getBoundingClientRect();
                const inside = mouseX >= rect.left - PAUSE_MARGIN && mouseX <= rect.right + PAUSE_MARGIN &&
                               mouseY >= rect.top - PAUSE_MARGIN && mouseY <= rect.bottom + PAUSE_MARGIN;
                if (inside) {
                    if (!hoveredStickers.has(s)) {
                        hoveredStickers.add(s);
                        s.style.animationPlayState = 'paused';
                    }
                } else if (hoveredStickers.has(s)) {
                    hoveredStickers.delete(s);
                    s.style.animationPlayState = 'running';
                }
            });

            stickers.forEach((s, i) => {
                if (!perStickerMaps[i]) return;
                const rect = s.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dist = Math.hypot(mouseX - cx, mouseY - cy);

                let proximity = 0;
                if (dist < INFLUENCE_RADIUS) {
                    const t = dist / INFLUENCE_RADIUS;
                    proximity = 0.5 * (1 + Math.cos(Math.PI * t));
                    proximity = Math.pow(proximity, 1.2);
                }

                const minScale = 0.2;
                const proximityBoost = proximity * 35;
                const speedBoost = speed * proximity * 0.5;
                const activeTarget = minScale + proximityBoost + speedBoost;
                const targetScale = activeTarget * (1 - idleFactor) + minScale * idleFactor;

                const currentScale = parseFloat(perStickerMaps[i].getAttribute('scale')) || minScale;
                const newScale = currentScale + (targetScale - currentScale) * 0.12;
                perStickerMaps[i].setAttribute('scale', newScale.toFixed(3));

                const inner = s.querySelector('.sticker-inner');
                if (inner) {
                    const isPaused = hoveredStickers.has(s);
                    if (!isPaused) {
                        const spinSpeed = parseFloat(inner.dataset.spinSpeed) || 0;
                        let angle = parseFloat(inner.dataset.spinAngle) || 0;
                        angle += spinSpeed * dt;
                        inner.dataset.spinAngle = angle.toFixed(1);
                    }
                    const angle = parseFloat(inner.dataset.spinAngle) || 0;
                    const baseTransform = inner.dataset.baseTransform || '';
                    const rotStr = ' rotate(' + angle.toFixed(1) + 'deg)';

                    const pushStrength = Math.pow(proximity, 2) * (1 - idleFactor);
                    if (pushStrength > 0.02) {
                        const offX = (mouseX - cx) / Math.max(rect.width / 2, 1);
                        const offY = (mouseY - cy) / Math.max(rect.height / 2, 1);
                        const pushX = offX * pushStrength * 10 + mouseVX * pushStrength * 0.25;
                        const pushY = offY * pushStrength * 10 + mouseVY * pushStrength * 0.25;
                        inner.style.transform = baseTransform + rotStr + ' translate(' + pushX.toFixed(2) + 'px,' + pushY.toFixed(2) + 'px)';
                    } else {
                        inner.style.transform = baseTransform + rotStr;
                    }
                }
            });

            requestAnimationFrame(tick);
        }
        tick();
    }

    /* ---------- 6b. 光标：只有黑点 ---------- */
    function initCursor() {
        const pointer = document.getElementById('cursorPointer');
        if (!pointer) return;

        if (window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window) {
            pointer.style.display = 'none';
            document.body.style.cursor = 'auto';
            return;
        }

        let mx = 0, my = 0;
        const hoverSel = 'a, button, .sticker, .project-link, .project-thumb, .cta-email, .nav-link, .nav-cta, .nav-logo, .char-3d, .char-card';

        function updateHoverState() {
            const el = document.elementFromPoint(mx, my);
            const hit = el && el.closest(hoverSel);
            if (hit) {
                pointer.classList.add('is-hover');
            } else {
                pointer.classList.remove('is-hover');
            }
        }

        document.addEventListener('mousemove', (e) => {
            mx = e.clientX; my = e.clientY;
            updateHoverState();
        });

        function tick() {
            pointer.style.transform = `translate(${mx}px, ${my}px) translate(-5px, -5px)`;
            requestAnimationFrame(tick);
        }
        tick();

        document.addEventListener('mouseleave', () => {
            pointer.style.opacity = '0';
        });
        document.addEventListener('mouseenter', () => {
            pointer.style.opacity = '';
        });
    }

    /* ---------- 7b. 角色屏幕纸张纹理 ---------- */
    function initCharacterTexture() {
        const panel = document.querySelector('.panel-character');
        if (!panel) return;

        const c = document.createElement('canvas');
        const w = 600, h = 800;
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');

        const baseGrad = ctx.createLinearGradient(0, 0, w, h);
        baseGrad.addColorStop(0, '#f8f5ef');
        baseGrad.addColorStop(0.3, '#f5f1e8');
        baseGrad.addColorStop(0.6, '#f2ede2');
        baseGrad.addColorStop(1, '#efe9dc');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 3000; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const len = 1 + Math.random() * 3;
            const angle = Math.random() * Math.PI * 2;
            const a = 0.02 + Math.random() * 0.04;
            ctx.strokeStyle = `rgba(120, 105, 80, ${a})`;
            ctx.lineWidth = 0.3;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
            ctx.stroke();
        }

        for (let i = 0; i < 8; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = 80 + Math.random() * 150;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            const dark = Math.random() < 0.5;
            if (dark) {
                grad.addColorStop(0, 'rgba(180, 165, 140, 0.06)');
                grad.addColorStop(1, 'rgba(180, 165, 140, 0)');
            } else {
                grad.addColorStop(0, 'rgba(255, 252, 245, 0.15)');
                grad.addColorStop(1, 'rgba(255, 252, 245, 0)');
            }
            ctx.fillStyle = grad;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }

        const scratches = [
            { y: h * 0.15, x1: w * 0.05, x2: w * 0.75, width: 0.8, alpha: 0.12 },
            { y: h * 0.42, x1: w * 0.15, x2: w * 0.85, width: 1.2, alpha: 0.15 },
            { y: h * 0.68, x1: w * 0.02, x2: w * 0.60, width: 0.6, alpha: 0.10 },
            { y: h * 0.88, x1: w * 0.25, x2: w * 0.90, width: 1.0, alpha: 0.13 },
        ];
        scratches.forEach(s => {
            const grad = ctx.createLinearGradient(s.x1, 0, s.x2, 0);
            grad.addColorStop(0, 'rgba(60, 48, 30, 0)');
            grad.addColorStop(0.15, `rgba(60, 48, 30, ${s.alpha})`);
            grad.addColorStop(0.85, `rgba(60, 48, 30, ${s.alpha * 0.8})`);
            grad.addColorStop(1, 'rgba(60, 48, 30, 0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = s.width;
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y);
            const steps = 20;
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const px = s.x1 + (s.x2 - s.x1) * t;
                const py = s.y + (Math.random() - 0.5) * 1.5;
                ctx.lineTo(px, py);
            }
            ctx.stroke();

            ctx.strokeStyle = `rgba(255, 250, 240, ${s.alpha * 0.4})`;
            ctx.lineWidth = s.width * 0.5;
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y + s.width + 0.5);
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const px = s.x1 + (s.x2 - s.x1) * t;
                const py = s.y + s.width + 0.5 + (Math.random() - 0.5) * 1;
                ctx.lineTo(px, py);
            }
            ctx.stroke();
        });

        const vignette = ctx.createRadialGradient(w/2, h/2, h*0.3, w/2, h/2, h*0.7);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(100, 85, 60, 0.08)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);

        const dataUrl = c.toDataURL();
        panel.style.backgroundImage = `url("${dataUrl}")`;
        panel.style.backgroundRepeat = 'repeat';
        panel.style.backgroundSize = '100% 100%';
    }

    /* ---------- 8. 时钟/天气/坐标 ---------- */
    function initClock() {
        const el = document.getElementById('clock');
        if (!el) return;
        const up = () => {
            const n = new Date();
            el.textContent = `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
        };
        up(); setInterval(up, 30000);
    }

    function initWeather() {
        const el = document.getElementById('weather');
        if (el) el.textContent = '34°C';
    }

    function initCoords() {
        const el = document.getElementById('coords');
        if (!el) return;
        let raf = null;
        document.addEventListener('mousemove', (e) => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                el.textContent = `${String(Math.round(e.clientX)).padStart(4,'0')} X ${String(Math.round(e.clientY)).padStart(4,'0')} Y`;
                raf = null;
            });
        });
    }

    /* ---------- 9. 底部栏滚动隐藏（移动端不隐藏，保持可见） ---------- */
    function initBottombarScroll() {
        const bar = document.getElementById('bottombar');
        const nav = document.getElementById('siteNav');
        const mobileNav = document.getElementById('mobileNav');
        const container = document.getElementById('scrollContainer');
        if (!bar || !container) return;
        // 移动端固定元素始终可见，不做滚动隐藏
        // 仅在PC端启用滚动隐藏
        const isMobile = () => window.innerWidth <= 768;
        if (isMobile()) return;
        let last = 0;
        container.addEventListener('scroll', () => {
            const cur = container.scrollTop;
            const hidden = cur > 100 && cur > last;
            bar.classList.toggle('is-hidden', hidden);
            if (nav) nav.classList.toggle('is-hidden', hidden);
            if (mobileNav) mobileNav.classList.toggle('is-hidden', hidden);
            last = cur;
        }, { passive: true });
    }

    /* ---------- 10. 分屏 Snap 切换 ---------- */
    function initScrollSync() {
        const container = document.getElementById('scrollContainer');
        if (!container) return;
        const panels = document.querySelectorAll('.panel');
        let activeIdx = 0;
        let transitionLock = false;
        let overlay = null;
        let isProgrammaticScroll = false;
        const isMobile = () => window.innerWidth <= 768;

        function getPanelHeight() { return container.clientHeight; }

        function snapToPanel(idx, dir) {
            if (idx < 0 || idx >= panels.length || idx === activeIdx) return;
            if (transitionLock) return;
            transitionLock = true;
            isProgrammaticScroll = true;

            showOverlay(dir);

            const midDelay = getMidDelay();
            setTimeout(() => {
                panels.forEach(p => p.classList.remove('is-active'));
                panels[idx].classList.add('is-active');
                panels[idx].classList.add('is-entering');
                panels[activeIdx].classList.add('is-leaving');
                activeIdx = idx;

                document.querySelectorAll('.nav-link').forEach((link, i) => {
                    link.classList.toggle('is-active', i === activeIdx);
                });

                document.querySelectorAll('.mobile-nav-link').forEach((link, i) => {
                    link.classList.toggle('is-active', i === activeIdx);
                });

                const targetScroll = idx * getPanelHeight();
                container.scrollTo({ top: targetScroll, behavior: 'smooth' });

                setTimeout(() => {
                    panels.forEach(p => { p.classList.remove('is-entering', 'is-leaving'); });
                }, 800);
            }, midDelay);

            const totalTime = getTotalTime();
            setTimeout(() => {
                hideOverlay();
                transitionLock = false;
                isProgrammaticScroll = false;
            }, totalTime);
        }

        function getMidDelay() {
            const type = getTransitionType(activeIdx, null);
            return type === 'liquid' ? 200 : type === 'blinds' ? 200 : 350;
        }

        function getTotalTime() {
            const type = getTransitionType(activeIdx, null);
            return type === 'liquid' ? 520 : type === 'blinds' ? 520 : 850;
        }

        function getTransitionType(currentIdx, dir) {
            const nextIdx = dir === 'down' ? currentIdx + 1 : dir === 'up' ? currentIdx - 1 : currentIdx + 1;
            const pair = [currentIdx, nextIdx].sort((a, b) => a - b).join('-');
            if (pair === '0-1') return 'liquid';
            if (pair === '1-2') return 'blinds';
            return 'stripes';
        }

        function showOverlay(dir) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'activeTransitionOverlay';
                document.body.appendChild(overlay);
            }

            const type = getTransitionType(activeIdx, dir);
            const bgColor = type === 'liquid' ? 'rgba(250, 250, 248, 0.94)' : type === 'blinds' ? 'rgba(245, 248, 245, 0.9)' : 'rgba(250, 250, 248, 0.88)';
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            overlay.style.cssText = [
                'position: fixed',
                'top: 0', 'left: 0',
                'width: ' + vw + 'px', 'height: ' + vh + 'px',
                'z-index: 99999',
                'pointer-events: none',
                'opacity: 1',
                'background: ' + bgColor,
                'display: block',
                'box-sizing: border-box',
                'overflow: hidden',
            ].join(';');

            overlay.innerHTML = buildOverlayContent(type);
        }

        function hideOverlay() {
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    if (overlay && overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                    overlay = null;
                }, 100);
            }
        }

        function buildOverlayContent(type) {
            if (type === 'liquid') {
                return `
                    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
                        <div style="width:60%;height:3px;background:rgba(0,0,0,0.5);border-radius:2px;animation:liquidBar 0.52s ease-out forwards;"></div>
                    </div>
                    <style>
                        @keyframes liquidBar {
                            0% { transform: scaleX(0); opacity: 0; }
                            30% { transform: scaleX(1); opacity: 1; }
                            70% { transform: scaleX(1); opacity: 1; }
                            100% { transform: scaleX(0); opacity: 0; }
                        }
                    </style>
                `;
            }
            if (type === 'blinds') {
                let strips = '';
                for (let i = 0; i < 8; i++) {
                    const delay = i * 0.05;
                    strips += `<div style="position:absolute;top:0;left:${i*12.5}%;width:12.5%;height:100%;background:rgba(200,200,200,0.6);animation:blindFlip 0.52s cubic-bezier(0.25,1,0.3,1) ${delay}s forwards;transform-origin:left;"></div>`;
                }
                return strips + `
                    <style>
                        @keyframes blindFlip {
                            0% { transform: scaleX(0); opacity: 0; }
                            30% { transform: scaleX(1); opacity: 1; }
                            70% { transform: scaleX(1); opacity: 1; }
                            100% { transform: scaleX(0); opacity: 0; }
                        }
                    </style>
                `;
            }
            let stripes = '';
            for (let i = 0; i < 3; i++) {
                const delay = i * 0.08;
                stripes += `<div style="flex:1;background:linear-gradient(180deg,rgba(255,255,255,0.75),rgba(248,248,252,0.65));animation:stripeWave 0.85s cubic-bezier(0.76,0,0.24,1) ${delay}s forwards;transform-origin:bottom;"></div>`;
            }
            return `<div style="position:absolute;inset:0;display:flex;">${stripes}</div>
                <style>
                    @keyframes stripeWave {
                        0% { transform: scaleY(0); }
                        45% { transform: scaleY(1); }
                        55% { transform: scaleY(1); transform-origin:top; }
                        100% { transform: scaleY(0); }
                    }
                </style>
            `;
        }

        // 滚轮 - 移动端不拦截，使用原生滚动
        let wheelAccum = 0;
        document.addEventListener('wheel', (e) => {
            if (isMobile()) return; // 移动端使用原生滚动
            if (!container.contains(document.elementFromPoint(e.clientX, e.clientY))) return;
            e.preventDefault();
            if (transitionLock) return;

            wheelAccum += e.deltaY;
            if (Math.abs(wheelAccum) < 10) return;

            const dir = wheelAccum > 0 ? 'down' : 'up';
            wheelAccum = 0;
            snapToPanel(activeIdx + (dir === 'down' ? 1 : -1), dir);
        }, { passive: false });

        // 触摸 - 移动端使用 CSS scroll-snap，不拦截
        let touchStartY = 0;
        container.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            if (isMobile()) return; // 移动端让 CSS scroll-snap 接管
            if (transitionLock) return;
            const touchEndY = e.changedTouches[0].clientY;
            const dy = touchStartY - touchEndY;
            if (Math.abs(dy) > 50) {
                const dir = dy > 0 ? 'down' : 'up';
                snapToPanel(activeIdx + (dir === 'down' ? 1 : -1), dir);
            }
        }, { passive: true });

        // 键盘
        document.addEventListener('keydown', (e) => {
            if (transitionLock) return;
            if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
                e.preventDefault();
                snapToPanel(activeIdx + 1, 'down');
            } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
                e.preventDefault();
                snapToPanel(activeIdx - 1, 'up');
            }
        });

        // 导航点击
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    const idx = Array.from(panels).findIndex(p => p.id === targetId);
                    if (idx >= 0 && idx !== activeIdx) {
                        const dir = idx > activeIdx ? 'down' : 'up';
                        snapToPanel(idx, dir);
                    }
                }
            });
        });

        // 滚动更新 active
        container.addEventListener('scroll', () => {
            if (isProgrammaticScroll) return;
            if (transitionLock) return;
            const idx = Math.round(container.scrollTop / getPanelHeight());
            if (idx !== activeIdx) {
                panels.forEach(p => p.classList.remove('is-active'));
                panels[idx].classList.add('is-active');
                activeIdx = idx;
                document.querySelectorAll('.nav-link').forEach((link, i) => {
                    link.classList.toggle('is-active', i === activeIdx);
                });
                document.querySelectorAll('.mobile-nav-link').forEach((link, i) => {
                    link.classList.toggle('is-active', i === activeIdx);
                });
            }
        });

        // 卡片显示：鼠标进入character stage时显示卡片（含卡片本身hover）
        const charStage = document.getElementById('charStage');
        const charCard = document.getElementById('charCard');
        if (charStage && charCard) {
            let insideStage = false;
            let insideCard = false;
            const showCard = () => charCard.classList.add('is-visible');
            const hideCard = () => {
                if (!insideStage && !insideCard) {
                    charCard.classList.remove('is-visible');
                }
            };
            charStage.addEventListener('mouseenter', () => { insideStage = true; showCard(); });
            charStage.addEventListener('mouseleave', () => { insideStage = false; hideCard(); });
            charCard.addEventListener('mouseenter', () => { insideCard = true; });
            charCard.addEventListener('mouseleave', () => { insideCard = false; hideCard(); });
            // 移动端：触摸时显示卡片
            charStage.addEventListener('touchstart', () => { showCard(); }, { passive: true });
        }

        // 初始化
        if (panels.length > 0) panels[0].classList.add('is-active');
        if (navLinks.length > 0) navLinks[0].classList.add('is-active');
    }

    /* ---------- 11. 2D 刚体粒子物理交互（CTA 区域） ---------- */
    function initParticlePhysics() {
        const canvas = document.getElementById('particleCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const panel = canvas.closest('.panel-cta');
        if (!panel) return;

        let W = 0, H = 0;
        let particles = [];
        let trails = [];
        let mouse = { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, active: false };
        let rafId = null;

        const COLORS = [
            '#1a1a1a', '#1a1a1a', '#1a1a1a', '#1a1a1a',
            '#2d2d2d', '#2d2d2d', '#3a3a3a', '#3a3a3a',
            '#4a4a4a', '#5a5a5a',
            '#b0e02e', '#b0e02e',
            '#e74c3c', '#3498db', '#9b59b6', '#f39c12',
            '#ffffff', '#ffffff',
        ];
        const SHAPES = ['circle', 'circle', 'circle', 'circle', 'circle',
                        'rect', 'rect', 'rect',
                        'triangle',
                        'star', 'star',
                        'cross',
                        'ring',
                        'diamond',
                        'pentagon'];

        function resize() {
            const rect = panel.getBoundingClientRect();
            W = rect.width;
            H = rect.height;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            canvas.style.width = W + 'px';
            canvas.style.height = H + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function createParticles() {
            particles = [];
            const isMobile = window.innerWidth < 768;
            const maxCount = isMobile ? 35 : 65;
            const density = isMobile ? 25000 : 18000;
            const count = Math.min(maxCount, Math.floor((W * H) / density));
            for (let i = 0; i < count; i++) {
                const size = isMobile ? 10 + Math.random() * 5 : 16 + Math.random() * 6;
                particles.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: size,
                    mass: size * 0.3,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
                    rotation: Math.random() * Math.PI * 2,
                    angularVel: (Math.random() - 0.5) * 0.05,
                    restitution: 0.5,
                    friction: 0.93,
                });
            }
        }

        function drawShape(p) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1.5;

            const s = p.size;
            const h = s / 2;

            switch (p.shape) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(0, 0, h, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'rect':
                    ctx.fillRect(-h, -h * 0.65, s, s * 0.65);
                    break;
                case 'triangle':
                    ctx.beginPath();
                    ctx.moveTo(0, -h);
                    ctx.lineTo(h, h * 0.7);
                    ctx.lineTo(-h, h * 0.7);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'star': {
                    const spikes = 5;
                    const outer = h;
                    const inner = h * 0.4;
                    ctx.beginPath();
                    for (let i = 0; i < spikes * 2; i++) {
                        const r = i % 2 === 0 ? outer : inner;
                        const a = (Math.PI / spikes) * i - Math.PI / 2;
                        const x = Math.cos(a) * r;
                        const y = Math.sin(a) * r;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;
                }
                case 'cross': {
                    const arm = h * 0.28;
                    ctx.fillRect(-arm, -h, arm * 2, s);
                    ctx.fillRect(-h, -arm, s, arm * 2);
                    break;
                }
                case 'ring':
                    ctx.beginPath();
                    ctx.arc(0, 0, h, 0, Math.PI * 2);
                    ctx.lineWidth = s * 0.22;
                    ctx.stroke();
                    break;
                case 'diamond':
                    ctx.beginPath();
                    ctx.moveTo(0, -h);
                    ctx.lineTo(h, 0);
                    ctx.lineTo(0, h);
                    ctx.lineTo(-h, 0);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'pentagon':
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
                        const x = Math.cos(a) * h;
                        const y = Math.sin(a) * h;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;
            }
            ctx.restore();
        }

        function update() {
            // 半透明覆盖实现拖尾
            ctx.fillStyle = 'rgba(250, 250, 248, 0.25)';
            ctx.fillRect(0, 0, W, H);

            // 鼠标作为物理碰撞体：核心碰撞半径 + 外围软推力
            const mouseCollisionRadius = 40; // 硬碰撞半径（快速弹开）
            const mouseFieldRadius = 180;   // 软推力半径（渐变减速）
            const mouseImpulse = 22;        // 碰撞冲量强度（大幅提高初始速度）
            const mouseFieldForce = 1.5;    // 软推力强度
            const shearForce = 0.6;
            const particleRepelRadius = 120;
            const particleRepelForce = 0.15;

            // 更新鼠标速度
            if (mouse.active) {
                mouse.vx = (mouse.x - mouse.px) * 0.3;
                mouse.vy = (mouse.y - mouse.py) * 0.3;
                mouse.px = mouse.x;
                mouse.py = mouse.y;
            }

            particles.forEach((p) => {
                if (mouse.active) {
                    const dx = p.x - mouse.x;
                    const dy = p.y - mouse.y;
                    const distSq = dx * dx + dy * dy;
                    const dist = Math.sqrt(distSq);
                    const pHalf = p.size / 2;

                    // 硬碰撞：鼠标核心区碰到粒子 → 强烈弹开（像台球撞击）
                    if (dist < mouseCollisionRadius + pHalf && dist > 0) {
                        const nx = dx / dist;
                        const ny = dy / dist;
                        // 反射现有速度 + 施加冲量
                        const dot = p.vx * nx + p.vy * ny;
                        if (dot < 0) {
                            p.vx -= 2 * dot * nx * 0.8; // 反射（80%弹性）
                            p.vy -= 2 * dot * ny * 0.8;
                        }
                        // 额外冲量推开
                        p.vx += nx * mouseImpulse;
                        p.vy += ny * mouseImpulse;
                        // 强烈旋转
                        p.angularVel += (Math.random() - 0.5) * 0.8;
                        // 位置修正防止穿透
                        const overlap = (mouseCollisionRadius + pHalf) - dist;
                        p.x += nx * overlap;
                        p.y += ny * overlap;
                    }
                    // 软推力：鼠标外围区 → 渐变推开
                    else if (dist < mouseFieldRadius && dist > 0) {
                        const strength = (1 - dist / mouseFieldRadius);
                        const force = strength * strength * mouseFieldForce;
                        p.vx += (dx / dist) * force;
                        p.vy += (dy / dist) * force;
                    }

                    // 鼠标剪切力
                    if (dist < mouseFieldRadius * 1.2 && dist > 0) {
                        const shearFactor = (1 - dist / (mouseFieldRadius * 1.2)) * shearForce;
                        p.vx += mouse.vx * shearFactor;
                        p.vy += mouse.vy * shearFactor;
                    }
                }

                // 微扰动
                const jitter = mouse.active ? 0.02 : 0.005;
                p.vx += (Math.random() - 0.5) * jitter;
                p.vy += (Math.random() - 0.5) * jitter;

                // 阻尼（极低：让粒子高速弹开后缓慢减速）
                const friction = mouse.active ? 0.998 : 0.99;
                p.vx *= friction;
                p.vy *= friction;
                p.angularVel *= 0.993;

                // 限速
                const maxSpeed = 24;
                const speed = Math.hypot(p.vx, p.vy);
                if (speed > maxSpeed) {
                    p.vx = (p.vx / speed) * maxSpeed;
                    p.vy = (p.vy / speed) * maxSpeed;
                }

                // 更新位置
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.angularVel;

                // 边界碰撞（高弹性反弹）
                const halfS = p.size / 2;
                if (p.x < halfS) { p.x = halfS; p.vx = Math.abs(p.vx) * 0.7; }
                if (p.x > W - halfS) { p.x = W - halfS; p.vx = -Math.abs(p.vx) * 0.7; }
                if (p.y < halfS) { p.y = halfS; p.vy = Math.abs(p.vy) * 0.7; }
                if (p.y > H - halfS) { p.y = H - halfS; p.vy = -Math.abs(p.vy) * 0.7; }

                drawShape(p);
            });

            // 粒子间软排斥力（最终均匀分布）
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const a = particles[i];
                    const b = particles[j];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < particleRepelRadius * particleRepelRadius && distSq > 0) {
                        const dist = Math.sqrt(distSq);
                        const strength = (1 - dist / particleRepelRadius);
                        const force = strength * particleRepelForce;
                        const nx = dx / dist;
                        const ny = dy / dist;
                        a.vx -= nx * force;
                        a.vy -= ny * force;
                        b.vx += nx * force;
                        b.vy += ny * force;
                    }
                }
            }

            // 粒子间硬碰撞（防重叠 + 最小间距）
            for (let iter = 0; iter < 2; iter++) {
                for (let i = 0; i < particles.length; i++) {
                    for (let j = i + 1; j < particles.length; j++) {
                        const a = particles[i];
                        const b = particles[j];
                        const dx = b.x - a.x;
                        const dy = b.y - a.y;
                        const distSq = dx * dx + dy * dy;
                        const minDist = (a.size + b.size) / 2 * 1.15;
                        if (distSq < minDist * minDist && distSq > 0) {
                            const dist = Math.sqrt(distSq);
                            const nx = dx / dist;
                            const ny = dy / dist;
                            const overlap = minDist - dist;

                            const totalMass = a.mass + b.mass;
                            a.x -= nx * overlap * (b.mass / totalMass);
                            a.y -= ny * overlap * (b.mass / totalMass);
                            b.x += nx * overlap * (a.mass / totalMass);
                            b.y += ny * overlap * (a.mass / totalMass);

                            const dvx = b.vx - a.vx;
                            const dvy = b.vy - a.vy;
                            const dot = dvx * nx + dvy * ny;
                            if (dot < 0) {
                                const restitution = 0.75;
                                const impulse = -(1 + restitution) * dot / totalMass;
                                a.vx -= impulse * b.mass * nx;
                                a.vy -= impulse * b.mass * ny;
                                b.vx += impulse * a.mass * nx;
                                b.vy += impulse * a.mass * ny;

                                const tangentImpulse = Math.abs(dot) * 0.06;
                                a.angularVel += (Math.random() - 0.5) * tangentImpulse;
                                b.angularVel += (Math.random() - 0.5) * tangentImpulse;
                            }
                        }
                    }
                }
            }

            rafId = requestAnimationFrame(update);
        }

        // 监听鼠标
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
            if (!mouse.active) {
                mouse.px = mouse.x;
                mouse.py = mouse.y;
            }
            mouse.active = true;
        });
        canvas.addEventListener('mouseleave', () => {
            mouse.active = false;
            mouse.vx = 0;
            mouse.vy = 0;
        });

        // 触摸支持
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            mouse.x = touch.clientX - rect.left;
            mouse.y = touch.clientY - rect.top;
            mouse.px = mouse.x;
            mouse.py = mouse.y;
            mouse.active = true;
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            mouse.x = touch.clientX - rect.left;
            mouse.y = touch.clientY - rect.top;
            if (!mouse.active) {
                mouse.px = mouse.x;
                mouse.py = mouse.y;
            }
            mouse.active = true;
        }, { passive: false });
        canvas.addEventListener('touchend', () => {
            mouse.active = false;
            mouse.vx = 0;
            mouse.vy = 0;
        });

        // 可见性检测
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    resize();
                    if (!rafId) update();
                } else {
                    if (rafId) {
                        cancelAnimationFrame(rafId);
                        rafId = null;
                    }
                }
            });
        }, { threshold: 0.1 });
        observer.observe(panel);

        // 初始化
        resize();
        createParticles();
        update();

        window.addEventListener('resize', () => {
            resize();
            createParticles();
        });
    }

    /* ---------- 启动 ---------- */
    function init() {
        initClock();
        initWeather();
        initCoords();
        initBgNoise();
        initLiquidRipple();
        initStickerSpin();
        init3dTextParallax();
        initCursor();
        initCharacterTexture();
        initLiquidDistortion();
        initBottombarScroll();
        initScrollReveal();
        initScrollSync();
        initParticlePhysics();
        initLoader();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();