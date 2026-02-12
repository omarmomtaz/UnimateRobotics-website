import Sizes from './Sizes.js';
import Time from './Time.js';
import Renderer from './Renderer.js';
import MainCamera from '../MainCamera.js';
import Controls from '../Controls.js';
import AudioManager from '../AudioManager.js';
import GlobalState from '../state/GlobalState.js';
import LoadingScene from '../scenes/LoadingScene.js';
import EntryGateScene from '../scenes/EntryGateScene.js';

const SCENE_NAMES = ['loading','entryGate','mainStreet','workshopDistrict','competitionArena','hallOfLegacy','enrollmentHub','exitConfirmation'];

export default class App {
    constructor(canvas) {
        if (App.instance) return App.instance;
        App.instance = this;
        this.canvas = canvas;
        this.sizes = new Sizes();
        this.time = new Time();
        this.camera = new MainCamera(this.sizes);
        this.renderer = new Renderer(this.canvas, this.sizes);
        this.controls = new Controls(this.sizes, this.camera);
        this.audioManager = new AudioManager();
        this.globalState = new GlobalState();
        this.scenes = {loading:null,entryGate:null,mainStreet:null,workshopDistrict:null,competitionArena:null,hallOfLegacy:null,enrollmentHub:null,exitConfirmation:null};
        this.currentScene = null;
        this._progressGuard = false;
        this.initScenes();
        this.setupUI();
        this.switchScene('loading');
        this.setupUpdateLoop();
        console.log('App initialized');
    }
    initScenes() {
        this.scenes.loading = new LoadingScene(this.camera, this.audioManager, this.globalState);
        this.scenes.entryGate = new EntryGateScene(this.camera, this.audioManager, this.globalState);
        this.camera.instance.position.set(0, 0, 5);
        this.camera.instance.lookAt(0, 0, 0);
    }
    setupUI() {
        const backwardArrow = document.getElementById('arrow-backward');
        if (backwardArrow) {
            backwardArrow.addEventListener('click', () => this.previousScene());
        }
        window.addEventListener('audio-mute-toggle', (e) => this.audioManager.setMuted(e.detail.muted));
    }
    switchScene(sceneName) {
        const scene = this.scenes[sceneName];
        if (!scene) {
            console.log(`Scene "${sceneName}" not implemented`);
            const idx = SCENE_NAMES.indexOf(sceneName);
            if (idx !== -1) this.globalState.setScene(idx);
            this.currentScene = null;
            this.fadeTransition();
            return;
        }
        if (this.currentScene?.dispose) this.currentScene.dispose();
        this.currentScene = scene;
        const idx = SCENE_NAMES.indexOf(sceneName);
        if (idx !== -1) this.globalState.setScene(idx);
        this.fadeTransition();
        console.log(`Switched to: ${sceneName}`);
    }
    previousScene() {
        const currentIdx = this.globalState.currentScene;
        if (currentIdx <= 0) return;
        const prevIdx = currentIdx - 1;
        if (prevIdx === 0) return;
        this.switchScene(SCENE_NAMES[prevIdx]);
    }
    fadeTransition() {
        const overlay = document.getElementById('loading-overlay');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
    setupUpdateLoop() {
        window.addEventListener('tick', () => this.update());
    }
    update() {
        const { delta, elapsed } = this.time;
        this.controls.update();
        if (this.currentScene?.update) this.currentScene.update(elapsed, delta);
        if (this.currentScene?.scene) this.renderer.render(this.currentScene.scene, this.camera.instance);
        this.checkSceneProgression();
    }
    checkSceneProgression() {
        if (!this.globalState.getCanProgress() || this._progressGuard) return;
        const currentIdx = this.globalState.currentScene;
        if (currentIdx === 0) {
            this._progressGuard = true;
            this.globalState.setCanProgress(false);
            const savedIdx = this.globalState.getSavedScene();
            this.switchScene(SCENE_NAMES[savedIdx]);
            setTimeout(() => { this._progressGuard = false; }, 500);
        } else if (this.globalState.getCanProgress()) {
            this._progressGuard = true;
            this.globalState.setCanProgress(false);
            if (this.globalState.nextScene()) {
                this.switchScene(SCENE_NAMES[this.globalState.currentScene]);
            }
            setTimeout(() => { this._progressGuard = false; }, 500);
        }
    }
}