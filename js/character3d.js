/* ---------- 角色 3D 模型（Three.js + GLB） ---------- */
/* 独立 ES Module，加载 assets/3d/IP3d.glb 并实现鼠标跟随旋转 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

(function () {
    const container = document.getElementById('char3DCanvas');
    const loaderEl = document.getElementById('char3DLoader');
    if (!container) return;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (err) {
        console.error('WebGL 不可用', err);
        if (loaderEl) {
            loaderEl.textContent = '当前环境不支持 WebGL';
            loaderEl.style.color = '#ff6b6b';
        }
        return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 5);

    // PBR 环境光照（让金属/粗糙材质有反射）
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // 灯光：清亮纸面质感
    const hemi = new THREE.HemisphereLight(0xffffff, 0xe8e2d4, 1.0);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3, 4, 5);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xc5ff3d, 0.28);
    fill.position.set(-4, 1.5, -1);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.7);
    rim.position.set(-1, 3, -5);
    scene.add(rim);

    let modelRoot = null;
    const mixers = [];

    // 鼠标跟随：仅左右转动
    let targetRotY = 0;
    let curRotY = 0;

    function onPointerMove(e) {
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1..1
        targetRotY = nx * 0.45;
    }
    window.addEventListener('mousemove', onPointerMove, { passive: true });

    // 尺寸适配
    function resize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    // 仅在角色面板可见时渲染 + 首次可见时懒加载模型
    let visible = false;
    let modelLoaded = false;
    let modelLoading = false;
    const panel = document.querySelector('.panel-character');

    function loadModel() {
        if (modelLoaded || modelLoading) return;
        modelLoading = true;
        const loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
        loader.setDRACOLoader(dracoLoader);
        loader.load(
            'assets/3d/IP3d.glb',
            (gltf) => {
                const model = gltf.scene;
                modelRoot = model;

                // 上半身胸像构图：显示完整上半身，填满容器不留边距
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // 取顶部 78%（头+肩+胸+上腹），确保不裁切上半身
                const upperFraction = 0.78;
                const visibleHeight = size.y * upperFraction;
                const visibleCenterY = box.max.y - visibleHeight / 2;

                // 放大：让上半身充分填满视野
                const targetHeight = 4.2;
                const scale = targetHeight / visibleHeight;
                model.scale.setScalar(scale);
                // 水平/z 用整体中心；垂直对齐上半身中心
                model.position.x = -center.x * scale;
                model.position.y = -visibleCenterY * scale;
                model.position.z = -center.z * scale;

                // 摄像机距离：框住上半身高度，略紧凑填满
                const fovRad = camera.fov * Math.PI / 180;
                const dist = (targetHeight / 2) / Math.tan(fovRad / 2) * 0.95;
                camera.position.set(0, 0, dist);
                camera.lookAt(0, 0, 0);

                scene.add(model);

                // 播放内嵌动画（若有）
                if (gltf.animations && gltf.animations.length) {
                    const mixer = new THREE.AnimationMixer(model);
                    gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
                    mixers.push(mixer);
                }

                modelLoaded = true;
                modelLoading = false;
                if (loaderEl) {
                    loaderEl.style.opacity = '0';
                    setTimeout(() => { loaderEl.style.display = 'none'; }, 450);
                }
            },
            (xhr) => {
                if (loaderEl && xhr.lengthComputable) {
                    const pct = Math.round((xhr.loaded / xhr.total) * 100);
                    loaderEl.textContent = `载入 ${pct}%`;
                }
            },
            (err) => {
                modelLoading = false;
                console.error('3D 模型加载失败', err);
                if (loaderEl) {
                    loaderEl.textContent = '3D 载入失败';
                    loaderEl.style.color = '#ff6b6b';
                }
            }
        );
    }

    // 立即预加载模型（不等待面板可见）
    loadModel();

    if (panel) {
        const io = new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting;
        }, { threshold: 0.02 });
        io.observe(panel);
    } else {
        visible = true;
    }

    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        if (!visible) return;
        const dt = clock.getDelta();

        // 平滑插值 + 闲置轻摆（仅左右）
        curRotY += (targetRotY - curRotY) * 0.06;
        if (modelRoot) {
            const t = performance.now() * 0.0005;
            const idleY = Math.sin(t) * 0.07;
            modelRoot.rotation.y = curRotY + idleY;
        }

        mixers.forEach((m) => m.update(dt));
        renderer.render(scene, camera);
    }
    animate();
})();
