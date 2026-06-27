import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Warm off-white background (matches the homogeneous-spaces talk palette). */
export const BACKGROUND = 0xf7f5f0;

export interface AppOptions {
  background?: THREE.ColorRepresentation;
  fov?: number;
  near?: number;
  far?: number;
  cameraDistance?: number;
  antialias?: boolean;
  lights?: boolean;
  /** Image-based lighting (RoomEnvironment → PMREM); needed for glass/clearcoat. Default true. */
  environment?: boolean;
}

type AnimateCallback = (time: number, delta: number) => void;

/**
 * A small three.js runtime harness: owns the scene / camera / renderer /
 * orbit controls and runs the render loop. Deliberately lean — no reactive
 * parameter graph yet (added when we need interactivity). Adapted from
 * homogeneous-spaces' App.
 */
export class App {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;

  private callbacks: AnimateCallback[] = [];
  private clock = new THREE.Clock();

  constructor(options: AppOptions = {}) {
    this.renderer = new THREE.WebGLRenderer({ antialias: options.antialias ?? true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(options.background ?? BACKGROUND, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    if (options.environment !== false) this.applyEnvironment();

    this.camera = new THREE.PerspectiveCamera(
      options.fov ?? 50,
      window.innerWidth / window.innerHeight,
      options.near ?? 0.01,
      options.far ?? 100,
    );
    this.camera.position.set(0, 0, options.cameraDistance ?? 3.2);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    if (options.lights !== false) this.addDefaultLights();
    window.addEventListener('resize', this.onResize);
  }

  /**
   * Image-based lighting: a procedural neutral studio (three's RoomEnvironment,
   * baked to a PMREM) drives the PBR/clearcoat materials with soft reflections —
   * the single biggest quality lever, and what makes glass read as glass. Only
   * `scene.environment` is set; the background stays the flat cream.
   */
  applyEnvironment(intensity = 0.5): void {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = intensity;
    pmrem.dispose();
  }

  /** A soft directional rig over the IBL, tuned for a bright scene (no blue fill). */
  addDefaultLights(): void {
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(2.5, 4, 3);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-3, -1, -2);
    this.scene.add(fill);
  }

  add<T extends THREE.Object3D>(obj: T): T {
    this.scene.add(obj);
    return obj;
  }

  onAnimate(fn: AnimateCallback): void {
    this.callbacks.push(fn);
  }

  start(): void {
    this.loop();
  }

  private loop = (): void => {
    requestAnimationFrame(this.loop);
    const delta = this.clock.getDelta();
    const time = this.clock.elapsedTime;
    this.controls.update();
    for (const c of this.callbacks) c(time, delta);
    this.renderer.render(this.scene, this.camera);
  };

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}
