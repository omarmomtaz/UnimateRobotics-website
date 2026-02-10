/**
 * App.js
 * Main application lifecycle manager.
 *
 * After the loading animation ends, App checks sessionStorage for
 * the scene the user was on before the last refresh. If found it
 * jumps there directly; otherwise it goes to stage 2 (entry-gate).
 */

import Sizes       from './Sizes.js';
import Time        from './Time.js';
import Renderer    from './Renderer.js';
import MainCamera  from '../MainCamera.js';
import Controls    from '../Controls.js';
import AudioManager from '../AudioManager.js';
import GlobalState from '../state/GlobalState.js';

// Scenes
import LoadingScene from '../scenes/LoadingScene.js';

// ── Scene name → key map (matches GlobalState.sceneNames order) ──────────────
const SCENE_NAMES = [
    'loading',
    'entryGate',
    'mainStreet',
    'workshopDistrict',
    'competitionArena',
    'hallOfLegacy',
    'enrollmentHub',
    'exitConfirmation'
];

export default class App {

    constructor(canvas) {
        if (App.instance) return App.instance;
        App.instance = this;

        this.canvas = canvas;

        // Core systems
        this.sizes        = new Sizes();
        this.time         = new Time();
        this.camera       = new MainCamera(this.sizes);
        this.renderer     = new Renderer(this.canvas, this.sizes);
        this.controls     = new Controls(this.sizes, this.camera);
        this.audioManager = new AudioManager();
        this.globalState  = new GlobalState();

        // Scene registry — only LoadingScene is pre-built; others added as built
        this.scenes = {
            loading:          null,
            entryGate:        null,
            mainStreet:       null,
            workshopDistrict: null,
            competitionArena: null,
            hallOfLegacy:     null,
            enrollmentHub:    null,
            exitConfirmation: null
        };

        this.currentScene    = null;
        this._progressGuard  = false; // prevents double-fire of progressToNextScene

        this.initScenes();
        this.switchScene('loading');
        this.setupUpdateLoop();

        console.log('Unimate Academy — App initialized');
    }

    /* ══════════════════════════════════════════════════════════════════════ */

    initScenes() {
        this.scenes.loading = new LoadingScene(
            this.camera,
            this.audioManager,
            this.globalState
        );

        this.camera.setPosition(0, 0, 5);
        this.camera.lookAt(0, 0, 0);
    }

    /* ══════════════════════════════════════════════════════════════════════ */

    switchScene(sceneName) {
        const scene = this.scenes[sceneName];

        if (!scene) {
            // Scene not yet implemented → log only
            console.log(`Scene "${sceneName}" not yet implemented — showing black screen`);

            // Still update global state so dots + UI are correct
            const idx = SCENE_NAMES.indexOf(sceneName);
            if (idx !== -1) this.globalState.setScene(idx);

            this.currentScene = null; // nothing to render
            this.fadeTransition();
            return;
        }

        if (this.currentScene && this.currentScene.dispose) {
            this.currentScene.dispose();
        }

        this.currentScene = scene;

        const idx = SCENE_NAMES.indexOf(sceneName);
        if (idx !== -1) this.globalState.setScene(idx);

        this.fadeTransition();
        console.log(`Switched to scene: ${sceneName}`);
    }

    /* ══════════════════════════════════════════════════════════════════════ */

    fadeTransition() {
        const overlay = document.getElementById('loading-overlay');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }

    /* ══════════════════════════════════════════════════════════════════════ */

    setupUpdateLoop() {
        window.addEventListener('tick', () => this.update());
    }

    update() {
        const { delta, elapsed } = this.time;

        this.controls.update();

        if (this.currentScene?.update) {
            this.currentScene.update(elapsed, delta);
        }

        if (this.currentScene?.scene) {
            this.renderer.render(this.currentScene.scene, this.camera.instance);
        }

        this.checkSceneProgression();
    }

    /* ══════════════════════════════════════════════════════════════════════
       After LoadingScene completes → jump to saved scene (or entry-gate)
    ══════════════════════════════════════════════════════════════════════ */

    checkSceneProgression() {
        if (!this.globalState.getCanProgress()) return;
        if (this._progressGuard) return;

        const currentIdx = this.globalState.currentScene;

        // Only auto-advance when we're on the loading scene (index 0)
        if (currentIdx !== 0) return;

        this._progressGuard = true;
        this.globalState.setCanProgress(false);

        // Decide where to go
        const savedIdx    = this.globalState.getSavedScene(); // 1–7
        const targetName  = SCENE_NAMES[savedIdx];            // e.g. 'entryGate'

        this.switchScene(targetName);
        // Guard resets after a tick so it can fire again in future scenes
        setTimeout(() => { this._progressGuard = false; }, 500);
    }
}