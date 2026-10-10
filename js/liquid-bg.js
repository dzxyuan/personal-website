/* ---------- Hero 液态流动背景（Three.js + GLSL） ----------
 * 视觉移植自 Figma「Moving blobs」WGSL 着色器：
 *   simplex noise + domain warping 液态场（半分辨率 render target）
 *   → 合成 pass：blob 形态 / 折射位移 / 边缘色散 / 高光 / 颗粒
 * 无缝循环：噪声时间维取单位圆 (cos phase, sin phase)，周期严格闭合。
 *   （原作用 4D 噪声；这里用两个相位各驱一路 3D 噪声混合，数学上同样
 *    周期 2π 且一阶连续，计算量减半，移动端更友好。）
 * 降级：WebGL 不可用 / 半浮点不可用时自动回退，CSS metaball 保留。
 * 无障碍：prefers-reduced-motion 时只渲染静态帧。
 * ------------------------------------------------------- */
import * as THREE from 'three';

(function () {
    const container = document.getElementById('liquidBg');
    if (!container) return;

    /* ---------- 渲染器 ---------- */
    let renderer;
    try {
        const canvas = document.createElement('canvas');
        canvas.className = 'liquid-bg-canvas';
        renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: false,
            depth: false,
            stencil: false,
            powerPreference: 'high-performance'
        });
    } catch (err) {
        return; // 静默失败：CSS 层 metaball 继续兜底
    }

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 半浮点线性过滤：WebGL2 核心支持；WebGL1 需扩展。否则用 8bit 编码梯度。
    const gl = renderer.getContext();
    const useHalfFloat =
        renderer.capabilities.isWebGL2 ||
        !!(gl.getExtension && gl.getExtension('OES_texture_half_float_linear'));

    /* ---------- 场景 / 相机 / 全屏 quad ---------- */
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeo = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
        uFrequency: { value: isMobile ? 2.6 : 2.85 },
        uThreshold: { value: 0.55 },
        uSoftness: { value: isMobile ? 0.06 : 0.052 },
        uStrength: { value: 0.9 },
        uCA:        { value: 0.010 },
        uDetail:    { value: isMobile ? 0.0 : 0.045 },
        uFieldRes:  { value: new THREE.Vector2(1, 1) },
        uLoop:      { value: new THREE.Vector2(
            Math.cos(0.45 * Math.PI * 2), Math.sin(0.45 * Math.PI * 2)) },
        uDark:      { value: document.body.classList.contains('dark-mode') ? 1 : 0 },
        uHalf:      { value: useHalfFloat ? 1 : 0 },
        uField:     { value: null }
    };

    const vert = /* glsl */`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
        }
    `;

    /* ============  Pass 1：液态场 n + 梯度  ============ */
    const fieldFrag = /* glsl */`
        precision highp float;
        varying vec2 vUv;
        uniform vec2  uFieldRes;
        uniform float uFrequency;
        uniform float uDetail;
        uniform vec2  uLoop;
        uniform float uHalf;

        /* Ashima Arts 3D simplex noise（MIT），输出 -1..1 */
        vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
        vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
        vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

            vec3 i  = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);

            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);

            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;

            i = mod289(i);
            vec4 p = permute(permute(permute(
                       i.z + vec4(0.0, i1.z, i2.z, 1.0))
                     + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                     + i.x + vec4(0.0, i1.x, i2.x, 1.0));

            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;

            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);

            vec4 x = x_ * ns.x + ns.yyyy;
            vec4 y = y_ * ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);

            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);

            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));

            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);

            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
            p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        float N(vec3 p){ return snoise(p) * 0.5 + 0.5; }

        /* 两路正交圆相位（cos / sin）各驱一路 3D 噪声，
           混合结果周期仍严格为 2π，且衔接处一阶连续。 */
        float liquidField(vec2 p, float la, float lb, float freq) {
            float wx = N(vec3(p * freq * 0.58 + vec2(5.3, 1.7),  lb * 0.72));
            float wy = N(vec3(p * freq * 0.58 + vec2(-2.1, 8.4), la * 0.72));
            vec2 warped = p + (vec2(wx, wy) - 0.5) * 0.52;

            float broadA = N(vec3(warped * freq, la * 0.88));
            float broadB = N(vec3(warped * freq + 13.7, lb * 0.88));
            float value = (broadA + broadB) * 0.5;

            if (uDetail > 0.0001) {
                float fineA = N(vec3(warped * freq * 1.92 + 11.0, lb * 1.18));
                float fineB = N(vec3(warped * freq * 1.92 + 27.3, la * 1.18));
                value = mix(value, (fineA + fineB) * 0.5, uDetail);
            }
            return value;
        }

        void main() {
            float aspect = uFieldRes.x / max(uFieldRes.y, 1.0);
            vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
            float la = uLoop.x;
            float lb = uLoop.y;
            float n = liquidField(p, la, lb, uFrequency);

            float e = 0.008;
            vec2 grad = vec2(
                liquidField(p + vec2(e, 0.0), la, lb, uFrequency) - n,
                liquidField(p + vec2(0.0, e), la, lb, uFrequency) - n
            ) / e;

            if (uHalf > 0.5) {
                gl_FragColor = vec4(n, grad, 1.0);
            } else {
                // 8bit RT 回退：梯度编码到 0..1（±约 2.3）
                gl_FragColor = vec4(n, 0.5 + grad * 0.22, 1.0);
            }
        }
    `;

    /* ============  Pass 2：折射 / 色散 / 高光合成  ============ */
    const compFrag = /* glsl */`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uField;
        uniform float uThreshold;
        uniform float uSoftness;
        uniform float uStrength;
        uniform float uCA;
        uniform float uDark;
        uniform float uHalf;
        uniform vec2  uLoop;

        float hash(vec2 p){
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        /* 程序底层画面：大色云 + 细网格，供折射采样产生"隔着液体看"的色变 */
        vec3 backdrop(vec2 uv) {
            vec2 p = uv - 0.5;
            float c1 = smoothstep(0.85, 0.0,
                length((p - vec2( 0.30, -0.20)) * vec2(1.0, 1.35)));
            float c2 = smoothstep(0.80, 0.0,
                length((p - vec2(-0.32,  0.25)) * vec2(1.25, 1.0)));

            vec3 base = mix(vec3(0.992, 0.997, 1.000),   // 浅色：纸白偏冷 #fdfeff
                            vec3(0.012, 0.020, 0.012),   // 深色：近黑绿
                            uDark);
            vec3 cloudCol = mix(vec3(0.875, 0.937, 1.000), // 浅色：极淡冰蓝云 #dff0ff（贴近拖尾核心外围）
                              vec3(0.388, 1.000, 0.090), // 深色：荧光绿
                              uDark);

            float clouds = c1 * 0.55 + c2 * 0.40;
            vec3 col = mix(base, cloudCol, clouds * mix(0.20, 0.10, uDark));

            vec2 gf = fract(uv * vec2(24.0, 14.0));
            float grid = (step(0.985, gf.x) + step(0.985, gf.y)) * 0.5;
            col = mix(col, cloudCol, grid * mix(0.02, 0.05, uDark));
            return col;
        }

        void main() {
            vec4 fld = texture2D(uField, vUv);
            float n = fld.r;
            vec2 grad = (uHalf > 0.5) ? fld.gb : (fld.gb - 0.5) / 0.22;

            float blob = smoothstep(uThreshold - uSoftness,
                                    uThreshold + uSoftness, n);
            float rim  = exp(-abs(n - uThreshold) / max(uSoftness * 0.72, 0.002));
            float edge = pow(rim, mix(0.62, 0.72, uDark)); // 浅色边缘更柔更虚，像拖尾光晕

            // 折射位移（梯度推 + 沿切线轻滑）；浅色模式收窄位移避免灰白带
            vec2 tangent = normalize(vec2(-grad.y, grad.x) + vec2(1e-4));
            vec2 disp = (grad * blob + tangent * rim * 0.14)
                      * (0.075 * uStrength)
                      * mix(0.45, 0.85, uDark);
            vec2 suv = clamp(vUv + disp, vec2(0.0), vec2(1.0));

            // 边缘色散：RGB 三通道分开采样
            vec2 split = grad * (uCA * rim);
            vec3 mid = backdrop(suv);
            vec3 col = vec3(
                backdrop(clamp(suv - split, 0.0, 1.0)).r,
                mid.g,
                backdrop(clamp(suv + split, 0.0, 1.0)).b
            );

            // 定向高光
            vec2 ld = normalize(vec2(-0.7, -1.0));
            float hl = pow(max(dot(normalize(grad + vec2(1e-4)), -ld), 0.0), 7.0);

            // 浅色极淡天蓝（鼠标拖尾外缘的柔化版 #bddcff），深色荧光绿
            vec3 accent = mix(vec3(0.745, 0.865, 1.000),
                              vec3(0.388, 1.000, 0.090), uDark);
            // 团块内部：深色暗绿玻璃；浅色几乎留白纸白，只染一丝淡蓝
            col = mix(col, accent, blob * mix(0.045, 0.075, uDark));
            // 边缘染色（淡蓝只留在褶皱外缘）
            col = mix(col, accent, edge * mix(0.38, 0.45, uDark));
            vec3 hiColor = mix(vec3(1.0), vec3(0.85, 1.0, 0.7), uDark);
            col = mix(col, hiColor, rim * hl * mix(0.50, 0.55, uDark));

            // 内部填充 / 边缘光（中心亮白、边缘淡蓝；深色保持纤细光丝）
            float coreA = blob * mix(0.06, 0.07, uDark);
            float edgeA = edge * mix(0.36, 0.40, uDark)
                        + rim * hl * mix(0.38, 0.42, uDark);
            float alpha = clamp(max(coreA, edgeA), 0.0, 1.0);

            // 胶片颗粒（浅色更轻，保持干净）
            col += (hash(vUv + uLoop.xx) - 0.5) * mix(0.004, 0.012, uDark);

            // 椭圆羽化遮罩：流体集中在画面中部，屏幕四边自然淡出
            // 浅色模式收得更紧，给纸白底色留出大面积干净留白
            vec2 q = (vUv - 0.5) * vec2(1.05, 1.15);
            alpha *= smoothstep(mix(0.82, 1.02, uDark),
                                mix(0.30, 0.44, uDark), length(q));

            // 直出 alpha（材质为 NormalBlending）。
            // 切勿输出 col*alpha 预乘值——普通混合会让 alpha 乘两次，
            // 浅色下白色褶皱被压成灰泥色（"显脏"的根因）。
            gl_FragColor = vec4(col, alpha);
        }
    `;

    const fieldMat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vert,
        fragmentShader: fieldFrag,
        depthTest: false,
        depthWrite: false
    });
    const compMat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vert,
        fragmentShader: compFrag,
        depthTest: false,
        depthWrite: false,
        transparent: true
    });
    const mesh = new THREE.Mesh(quadGeo, fieldMat);
    scene.add(mesh);

    /* ---------- 半分辨率场纹理 ---------- */
    const rt = new THREE.WebGLRenderTarget(1, 1, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: useHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
        depthBuffer: false,
        stencilBuffer: false
    });
    uniforms.uField.value = rt.texture;

    /* ---------- 可见性 / 静态帧调度状态（须先于首次 resize 声明） ---------- */
    let visible = false;
    let staticDirty = true;
    let lastT = performance.now();
    function scheduleStaticFrame() { staticDirty = true; }

    /* ---------- 尺寸 ---------- */
    function resize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w < 2 || h < 2) return;
        renderer.setSize(w, h, false);
        const fw = Math.max(1, Math.round(w * dpr * 0.5));
        const fh = Math.max(1, Math.round(h * dpr * 0.5));
        rt.setSize(fw, fh);
        uniforms.uFieldRes.value.set(fw, fh);
        scheduleStaticFrame();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    /* ---------- 主题切换 ---------- */
    new MutationObserver(() => {
        uniforms.uDark.value = document.body.classList.contains('dark-mode') ? 1 : 0;
        scheduleStaticFrame();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    /* ---------- 可见性：只在 Hero 屏渲染 ---------- */
    const hero = document.querySelector('.panel-hero');
    const scrollRoot = document.getElementById('scrollContainer');
    if (hero && 'IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting;
            if (visible) {
                lastT = performance.now();
                staticDirty = true;
            }
        }, { threshold: 0.05, root: scrollRoot || null }).observe(hero);
    } else {
        visible = true;
    }

    /* ---------- 循环相位 ----------
       原作映射：speed% → loopLength = 90 - speed/100*78 秒
       背景层取 speed 30% ≈ 66.6s 一圈，缓慢流动 */
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const loopLength = 90 - (30 / 100) * 78;
    let phase = 0.45;
    let raf = 0;

    function renderFrame() {
        const a = phase * Math.PI * 2;
        uniforms.uLoop.value.set(Math.cos(a), Math.sin(a));

        mesh.material = fieldMat;
        renderer.setRenderTarget(rt);
        renderer.render(scene, camera);

        mesh.material = compMat;
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
    }

    function tick(now) {
        raf = requestAnimationFrame(tick);
        if (!visible) { lastT = now; return; }

        if (reduced) {
            if (staticDirty) { renderFrame(); staticDirty = false; }
            return;
        }
        const dt = Math.min(0.05, (now - lastT) / 1000);
        lastT = now;
        phase += dt / loopLength;
        phase -= Math.floor(phase);
        renderFrame();
    }

    // 渲染管线就绪：标记 body，CSS 据此隐藏旧 metaball
    try {
        renderFrame();
        document.body.classList.add('liquid-bg-ready');
    } catch (err) {
        return;
    }
    raf = requestAnimationFrame(tick);
})();
