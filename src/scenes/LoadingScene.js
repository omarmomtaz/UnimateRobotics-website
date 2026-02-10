/**
 * LoadingScene.js
 * Stage 1 — Launch screen
 *
 * Animation timeline:
 *  Phase 0  [0 → 2.5s]   Progress ring fills. Dot pulses.
 *  Phase 1  [on complete] Ring fades out (0.4s). Dot continues pulsing.
 *  Phase 2  [after ring]  Dot does exactly 2 full pulses, then explodes:
 *                         scale rockets up, material opacity rises to ~0.18 (fills screen, translucent cyan wash).
 *  Phase 3  [simultaneous with phase 2 peak]
 *                         Welcome text fades in. Particles expand radius to orbit the text.
 *  Phase 4  [steady state] Text pulses in/out. Particles orbit.
 *  Phase 5  [on pulse peak] "Whoosh" sound. Text + particles expand to full screen → opacity → 0.
 *                           Everything disappears → advance to next scene.
 *
 * Controls: look / swipe / ← ↓ → arrows are all DISABLED in this scene.
 * Only forward arrow is hidden too (it does nothing here).
 */

import * as THREE from 'three';

// ─── Timing constants (seconds unless noted) ─────────────────────────────────
const LOAD_DURATION_MS          = 1500; // shortened: fake loader
const RING_FADE_DURATION        = 0.3;  // ring fade-out
const DOT_PULSES_BEFORE_EXPLODE = 1;   // shortened: 1 pulse before explosion
const EXPLODE_DURATION          = 0.75; // slightly longer for smooth transition
const PULSE_HOLD_BEFORE_EXIT    = 1.2;
const EXIT_DURATION             = 0.7;

export default class LoadingScene {

    constructor(camera, audioManager, globalState) {
        this.camera       = camera;
        this.audioManager = audioManager;
        this.globalState  = globalState;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#000000');

        // ── Phase state machine ───────────────────────────────────────────
        // 'loading' | 'ringFade' | 'dotExplode' | 'textPulse' | 'exitBurst' | 'done'
        this.phase       = 'loading';
        this.phaseTimer  = 0;   // seconds elapsed in current phase

        this.loadingProgress = 0;
        this.isComplete      = false;   // set true when we call progressToNextScene
        this.pulseTime       = 0;       // global time for sin waves
        this.dotPulseCount   = 0;       // how many full sin cycles completed
        this.lastSinSign     = 1;       // track sin zero crossings

        // Particle original radii (set during createParticles)
        this.particleBaseRadii = null;

        // Build scene
        this.createEnvironment();
        this.createLights();
        this.createLoadingVisuals();
        this.createWelcomeText();

        // Disable controls in stage 1
        this.disableControls();

        // Audio
        this.startAudio();

        // Kick off fake loader
        this.simulateLoading();
    }

    /* ══════════════════════════════════════════════════════════════════════
       SCENE CONSTRUCTION
    ══════════════════════════════════════════════════════════════════════ */

    createEnvironment() {
        this.scene.fog = new THREE.Fog('#000000', 5, 20);
    }

    createLights() {
        this.scene.add(new THREE.AmbientLight('#ffffff', 0.1));
        this.centerLight = new THREE.PointLight('#00ffff', 2, 10);
        this.scene.add(this.centerLight);
    }

    createLoadingVisuals() {
        // ── Pulsing dot ──────────────────────────────────────────────────
        this.dotMat = new THREE.MeshStandardMaterial({
            color: '#00ffff', emissive: '#00ffff',
            emissiveIntensity: 1, metalness: 0.8, roughness: 0.2,
            transparent: true, opacity: 1
        });
        this.pulsingDot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), this.dotMat);
        this.scene.add(this.pulsingDot);

        // ── Background guide ring ────────────────────────────────────────
        this.ringMat = new THREE.MeshStandardMaterial({
            color: '#ffffff', emissive: '#00ffff', emissiveIntensity: 0.3,
            metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.35
        });
        this.progressRing = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.02, 16, 100), this.ringMat);
        this.progressRing.rotation.x = Math.PI / 2;
        this.scene.add(this.progressRing);

        // ── Progress arc (fills as loading progresses) ───────────────────
        this.arcMat = new THREE.MeshStandardMaterial({
            color: '#00ffff', emissive: '#00ffff',
            emissiveIntensity: 1, metalness: 1, roughness: 0,
            transparent: true, opacity: 1
        });
        this.progressArc = new THREE.Mesh(
            new THREE.TorusGeometry(0.8, 0.04, 16, 100, 0.001), this.arcMat
        );
        this.progressArc.rotation.x = Math.PI / 2;
        this.progressArc.rotation.z = -Math.PI / 2;
        this.scene.add(this.progressArc);

        // ── Particles ────────────────────────────────────────────────────
        this.createParticles();
    }

    createParticles() {
        const count     = 80;
        const positions = new Float32Array(count * 3);

        this.particleAngles    = new Float32Array(count);
        this.particleRadii     = new Float32Array(count);
        this.particleBaseRadii = new Float32Array(count); // saved for expansion
        this.particleHeights   = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const angle  = (i / count) * Math.PI * 2;
            const radius = 1.1 + Math.random() * 0.6;
            const height = (Math.random() - 0.5) * 0.6;

            this.particleAngles[i]    = angle;
            this.particleRadii[i]     = radius;
            this.particleBaseRadii[i] = radius;
            this.particleHeights[i]   = height;

            positions[i * 3]     = Math.cos(angle) * radius;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        this.particleMat = new THREE.PointsMaterial({
            color: '#00ffff', size: 0.045,
            transparent: true, opacity: 0.7,
            blending: THREE.AdditiveBlending, depthWrite: false
        });

        this.particles = new THREE.Points(geo, this.particleMat);
        this.scene.add(this.particles);
    }

    createWelcomeText() {
        const el = document.createElement('div');
        el.id = 'welcome-text';
        el.innerText = 'Welcome to Unimate Robotics Club';

        Object.assign(el.style, {
            position:       'fixed',
            top:            '50%',
            left:           '50%',
            transform:      'translate(-50%, -50%)',
            color:          '#00ffff',
            fontFamily:     '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize:       'clamp(16px, 3.2vw, 34px)',
            fontWeight:     '600',
            letterSpacing:  '0.05em',
            textAlign:      'center',
            textShadow:     '0 0 30px rgba(0,255,255,0.85), 0 0 70px rgba(0,255,255,0.35)',
            opacity:        '0',
            pointerEvents:  'none',
            zIndex:         '150',
            padding:        '0 24px',
            lineHeight:     '1.35',
            maxWidth:       '90vw',
            transition:     'none',
            willChange:     'opacity, transform, text-shadow'
        });

        document.body.appendChild(el);
        this.welcomeEl = el;
    }

    /* ══════════════════════════════════════════════════════════════════════
       CONTROLS — disable look / swipe / arrows (except forward)
    ══════════════════════════════════════════════════════════════════════ */

    disableControls() {
        // Hide all arrow buttons
        ['arrow-backward', 'arrow-left', 'arrow-right', 'arrow-forward'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Block mouse look and touch look during stage 1
        this._blockLook = true;
    }

    enableControls() {
        // Re-show desktop arrows (forward, left, right, backward)
        ['arrow-forward', 'arrow-backward', 'arrow-left', 'arrow-right'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = '';
        });
        this._blockLook = false;
    }

    /* ══════════════════════════════════════════════════════════════════════
       AUDIO
    ══════════════════════════════════════════════════════════════════════ */

    startAudio() {
        const init = () => {
            this.audioManager.init();
            this.audioManager.createMechanicalHum();
            this.audioManager.playMechanicalHum();
            document.removeEventListener('click',      init);
            document.removeEventListener('touchstart', init);
        };
        document.addEventListener('click',      init);
        document.addEventListener('touchstart', init);
    }

    /**
     * Whoosh sound — synthesized high-pitched sweep
     * To swap in a custom audio file later, see AudioManager.js
     */
    playWhoosh() {
        if (!this.audioManager.initialized) return;

        const ctx  = this.audioManager.audioContext;
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + EXIT_DURATION);

        // Sweeping oscillator: starts high, goes higher
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800,  ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + EXIT_DURATION);
        osc.connect(gain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + EXIT_DURATION + 0.05);

        // Noise layer for "air rush" feel
        const bufferSize = ctx.sampleRate * EXIT_DURATION;
        const buffer     = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data       = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buffer;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type      = 'bandpass';
        bandpass.frequency.setValueAtTime(1200, ctx.currentTime);
        bandpass.frequency.exponentialRampToValueAtTime(6000, ctx.currentTime + EXIT_DURATION);
        bandpass.Q.value   = 1.5;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.25, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + EXIT_DURATION);

        noiseSource.connect(bandpass);
        bandpass.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseSource.start(ctx.currentTime);
        noiseSource.stop(ctx.currentTime + EXIT_DURATION + 0.05);
    }

    /* ══════════════════════════════════════════════════════════════════════
       LOADING SIMULATION
    ══════════════════════════════════════════════════════════════════════ */

    simulateLoading() {
        const startTime = Date.now();

        const tick = () => {
            const progress = Math.min((Date.now() - startTime) / LOAD_DURATION_MS, 1);
            this.loadingProgress = progress;
            this.globalState.setLoadingProgress(progress);

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                this.audioManager.stopMechanicalHum();
                this.phase      = 'ringFade';
                this.phaseTimer = 0;
            }
        };

        requestAnimationFrame(tick);
    }

    /* ══════════════════════════════════════════════════════════════════════
       UPDATE  — called every frame by App.js
    ══════════════════════════════════════════════════════════════════════ */

    update(time, delta) {
        if (this.isComplete) return;

        const dt = delta * 0.001; // convert ms → seconds
        this.pulseTime  += dt;
        this.phaseTimer += dt;

        // Always spin background guide ring slowly
        this.progressRing.rotation.z += delta * 0.0004;

        // Always orbit particles
        this.orbitParticles(delta);

        switch (this.phase) {
            case 'loading':     this.updateLoading();          break;
            case 'ringFade':    this.updateRingFade(dt);       break;
            case 'dotExplode':  this.updateDotExplode(dt);     break;
            case 'textPulse':   this.updateTextPulse(dt);      break;
            case 'exitBurst':   this.updateExitBurst(dt);      break;
        }
    }

    /* ── Phase: loading ──────────────────────────────────────────────── */
    updateLoading() {
        // Pulsing dot
        const s = 1 + Math.sin(this.pulseTime * 3) * 0.3;
        this.pulsingDot.scale.setScalar(s);
        this.centerLight.intensity = 1.5 + Math.sin(this.pulseTime * 3) * 0.8;

        // Grow progress arc
        const arcLength = this.loadingProgress * Math.PI * 2;
        this.progressArc.geometry.dispose();
        this.progressArc.geometry = new THREE.TorusGeometry(0.8, 0.04, 16, 100, arcLength);
    }

    /* ── Phase: ringFade — fade ring + arc out over RING_FADE_DURATION ── */
    updateRingFade(dt) {
        const t = Math.min(this.phaseTimer / RING_FADE_DURATION, 1);
        const opacity = 1 - t;

        this.ringMat.opacity = 0.35 * opacity;
        this.arcMat.opacity  = opacity;

        // Dot keeps pulsing normally
        const s = 1 + Math.sin(this.pulseTime * 3) * 0.3;
        this.pulsingDot.scale.setScalar(s);
        this.centerLight.intensity = 1.5 + Math.sin(this.pulseTime * 3) * 0.8;

        if (t >= 1) {
            // Hide rings completely
            this.progressRing.visible = false;
            this.progressArc.visible  = false;
            // Start counting dot pulses
            this.dotPulseCount = 0;
            this.lastSinSign   = Math.sign(Math.sin(this.pulseTime * 3));
            this.phase         = 'dotExplode';
            this.phaseTimer    = 0;
        }
    }

    /* ── Phase: dotExplode — 1 pulse then smooth blast + text crossfade ── */
    updateDotExplode(dt) {
        const sinVal  = Math.sin(this.pulseTime * 3);
        const sinSign = Math.sign(sinVal);

        // Count zero-crossings from + to − (one full pulse = one cycle)
        if (this.lastSinSign > 0 && sinSign <= 0) {
            this.dotPulseCount++;
            if (this.dotPulseCount >= DOT_PULSES_BEFORE_EXPLODE && !this._explodeStarted) {
                // Reset timer precisely at the moment we begin exploding
                this._explodeStarted = true;
                this.phaseTimer = 0;
            }
        }
        this.lastSinSign = sinSign;

        if (!this._explodeStarted) {
            // Normal pulse while waiting
            const s = 1 + sinVal * 0.3;
            this.pulsingDot.scale.setScalar(s);
            this.centerLight.intensity = 1.5 + sinVal * 0.8;
            return;
        }

        // ── EXPLOSION ────────────────────────────────────────────────────
        const t    = Math.min(this.phaseTimer / EXPLODE_DURATION, 1);
        const ease = this.easeInOutCubic(t);  // smooth start AND end

        // Scale: 1 → 60 (fills screen as a cyan flash)
        const scale = 1 + ease * 60;
        this.pulsingDot.scale.setScalar(scale);

        // Dot opacity: 1 → 0  (fades out as it expands)
        this.dotMat.opacity = 1 - ease;

        // Light blooms then fades
        this.centerLight.intensity = 1.5 + Math.sin(t * Math.PI) * 4;

        // Text crossfades IN starting at t=0.25, fully visible by t=0.75
        // This means dot is still partially visible when text appears → smooth handoff
        if (t >= 0.25) {
            const textT = Math.min((t - 0.25) / 0.5, 1);
            const textOpacity = this.easeInOutCubic(textT);
            if (this.welcomeEl) this.welcomeEl.style.opacity = textOpacity;
        }

        // Particles expand from t=0.2 onwards
        if (t >= 0.2) {
            const particleT = (t - 0.2) / 0.8;
            const expandFactor = 1 + this.easeInOutCubic(particleT) * 1.5;
            for (let i = 0; i < this.particleBaseRadii.length; i++) {
                this.particleRadii[i] = this.particleBaseRadii[i] * expandFactor;
            }
        }

        if (t >= 1) {
            // Clean up dot
            this.dotMat.opacity     = 0;
            this.pulsingDot.visible = false;
            this.centerLight.intensity = 1;

            // Lock expanded particle radii
            for (let i = 0; i < this.particleBaseRadii.length; i++) {
                this.particleRadii[i] = this.particleBaseRadii[i] * 2.5;
            }

            if (this.welcomeEl) this.welcomeEl.style.opacity = '1';

            this.phase      = 'textPulse';
            this.phaseTimer = 0;
        }
    }

    /* ── Phase: textPulse — text pulses, particles orbit, then exit ───── */
    updateTextPulse(dt) {
        // Text pulses with a smooth sin
        const pulse      = 0.75 + Math.sin(this.pulseTime * 2.5) * 0.25;
        const glowStr    = Math.floor(20 + pulse * 20);
        const glowStr2   = Math.floor(40 + pulse * 40);

        if (this.welcomeEl) {
            this.welcomeEl.style.opacity   = pulse;
            this.welcomeEl.style.textShadow =
                `0 0 ${glowStr}px rgba(0,255,255,${(0.6 + pulse * 0.4).toFixed(2)}),`+
                `0 0 ${glowStr2}px rgba(0,255,255,${(0.2 + pulse * 0.2).toFixed(2)})`;
        }

        // Particle opacity pulses slightly
        this.particleMat.opacity = 0.4 + pulse * 0.3;

        // After PULSE_HOLD_BEFORE_EXIT seconds → exit burst
        if (this.phaseTimer >= PULSE_HOLD_BEFORE_EXIT) {
            // Trigger on next pulse peak (sin ≈ 1)
            if (Math.sin(this.pulseTime * 2.5) > 0.85) {
                this.playWhoosh();
                this.phase      = 'exitBurst';
                this.phaseTimer = 0;

                // Save current sizes as exit start sizes
                this._exitStartRadii = Float32Array.from(this.particleRadii);
            }
        }
    }

    /* ── Phase: exitBurst — everything expands + fades → scene ends ───── */
    updateExitBurst(dt) {
        const t    = Math.min(this.phaseTimer / EXIT_DURATION, 1);
        const ease = this.easeInQuart(t);

        // Text: scale up + fade out
        const textScale  = 1 + ease * 3;
        const textOpacity = 1 - ease;
        if (this.welcomeEl) {
            this.welcomeEl.style.opacity   = textOpacity;
            this.welcomeEl.style.transform = `translate(-50%, -50%) scale(${textScale})`;
        }

        // Particles: expand radius + fade out
        const expandFactor = 1 + ease * 8;
        for (let i = 0; i < this.particleAngles.length; i++) {
            this.particleRadii[i] = this._exitStartRadii[i] * expandFactor;
        }
        this.particleMat.opacity = (1 - ease) * 0.7;

        // Light fades
        this.centerLight.intensity = (1 - ease) * 1.5;

        if (t >= 1) {
            this.isComplete = true;
            this.enableControls();
            this.globalState.setCanProgress(true);
        }
    }

    /* ══════════════════════════════════════════════════════════════════════
       HELPERS
    ══════════════════════════════════════════════════════════════════════ */

    orbitParticles(delta) {
        const speed     = delta * 0.0004;
        const count     = this.particleAngles.length;
        const positions = this.particles.geometry.attributes.position;

        for (let i = 0; i < count; i++) {
            this.particleAngles[i] += speed + (i % 5) * speed * 0.12;
            const a = this.particleAngles[i];
            const r = this.particleRadii[i];
            positions.setXYZ(i, Math.cos(a) * r, this.particleHeights[i], Math.sin(a) * r);
        }
        positions.needsUpdate = true;
    }

    /** Quartic ease-in: slow start, fast finish — used for exit burst */
    easeInQuart(t) { return t * t * t * t; }

    /** Cubic ease-in-out: smooth at both ends — used for dot→text transition */
    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /* ══════════════════════════════════════════════════════════════════════
       DISPOSE
    ══════════════════════════════════════════════════════════════════════ */

    dispose() {
        if (this.welcomeEl && this.welcomeEl.parentNode) {
            this.welcomeEl.parentNode.removeChild(this.welcomeEl);
        }
        this.scene.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                Array.isArray(obj.material)
                    ? obj.material.forEach(m => m.dispose())
                    : obj.material.dispose();
            }
        });
    }
}