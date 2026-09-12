import * as THREE from "three";
import WebGL from "three/addons/capabilities/WebGL.js";

export type RendererMountResult =
  | { ok: true; dispose: () => void }
  | { ok: false; reason: string };

export function mountPrototypeRenderer(container: HTMLElement): RendererMountResult {
  if (!WebGL.isWebGL2Available()) {
    return {
      ok: false,
      reason: "WebGL 2 is unavailable. The rendering spike cannot start on this device.",
    };
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x111512, 1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.OrthographicCamera(-18, 18, 12, -12, 0.1, 200);
  camera.position.set(18, 20, 18);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xdde8d4, 0x3a3229, 2.2));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 28),
    new THREE.MeshLambertMaterial({ color: 0x6c7651 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 28),
    new THREE.MeshLambertMaterial({ color: 0x466d73 }),
  );
  river.rotation.x = -Math.PI / 2;
  river.position.y = 0.02;
  scene.add(river);

  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.35, 2.4),
    new THREE.MeshLambertMaterial({ color: 0x765c3e }),
  );
  bridge.position.y = 0.28;
  scene.add(bridge);

  const settlementMaterial = new THREE.MeshLambertMaterial({ color: 0xb28e5f });
  for (const position of [
    [-10, 0.9, -5],
    [-13, 0.9, 2],
    [11, 0.9, -4],
    [13, 0.9, 3],
  ] as const) {
    const building = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 2.4), settlementMaterial);
    building.position.set(...position);
    scene.add(building);
  }

  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const aspect = width / height;
    const viewHeight = 24;

    camera.left = (-viewHeight * aspect) / 2;
    camera.right = (viewHeight * aspect) / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  return {
    ok: true,
    dispose: () => {
      observer.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    },
  };
}
