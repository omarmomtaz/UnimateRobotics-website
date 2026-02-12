/**
 * GlobalState.js
 * Tracks user progress, current scene, and application state.
 * Uses sessionStorage to remember which scene the user was on
 * before a page refresh, so the loading screen always returns
 * them to the right place.
 */

const SESSION_KEY = 'unimate_last_scene'; // key used in sessionStorage

export default class GlobalState {
    constructor() {
        this.currentScene  = 0;
        this.visitedScenes = new Set([0]);
        this.loadingProgress = 0;
        this.isLoading     = true;
        this.canProgress   = false;

        this.sceneNames = [
            'loading',
            'entryGate',
            'mainStreet',
            'workshopDistrict',
            'competitionArena',
            'hallOfLegacy',
            'enrollmentHub',
            'exitConfirmation'
        ];

        this.userData = { name: '', age: '', contact: '', interest: '' };
    }

    /* ─────────────────────────────────────────────────────────────────── */

    /**
     * Returns the scene index the user was on before the last refresh.
     * If none saved (first visit), returns 1 (entry-gate) — never 0 (loading).
     */
    getSavedScene() {
        try {
            const saved = sessionStorage.getItem(SESSION_KEY);
            if (saved !== null) {
                const idx = parseInt(saved, 10);
                // Valid range: 1–7 (never return to loading scene 0)
                if (idx >= 1 && idx < this.sceneNames.length) return idx;
            }
        } catch (_) { /* sessionStorage blocked in some contexts */ }
        return 1; // default → entry-gate
    }

    /**
     * Persist the current scene index to sessionStorage.
     * Called every time setScene() runs.
     */
    saveScene(index) {
        try {
            sessionStorage.setItem(SESSION_KEY, String(index));
        } catch (_) {}
    }

    /* ─────────────────────────────────────────────────────────────────── */

    setScene(sceneIndex) {
        if (sceneIndex >= 0 && sceneIndex < this.sceneNames.length) {
            this.currentScene = sceneIndex;
            this.visitedScenes.add(sceneIndex);
            this.updateProgressIndicator();

            // Persist (but don't save the loading scene itself)
            if (sceneIndex > 0) this.saveScene(sceneIndex);

            console.log(`Scene changed to: ${this.sceneNames[sceneIndex]}`);
        }
    }

    nextScene() {
        if (this.currentScene < this.sceneNames.length - 1) {
            this.setScene(this.currentScene + 1);
            return true;
        }
        return false;
    }

    getCanProgress()           { return this.canProgress; }
    setCanProgress(v)          { this.canProgress = v; }
    setLoadingProgress(p)      { this.loadingProgress = Math.max(0, Math.min(1, p)); }
    setLoading(v)              { this.isLoading = v; }
    getCurrentSceneName()      { return this.sceneNames[this.currentScene]; }
    saveUserData(data)         { this.userData = { ...this.userData, ...data }; }

    updateProgressIndicator() {
        const dots = document.querySelectorAll('.progress-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentScene);
        });
    }
}