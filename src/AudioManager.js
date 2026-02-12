/**
 * AudioManager.js
 * Centralized audio control for all sounds in the experience
 */

export default class AudioManager {
    constructor() {
        this.sounds = new Map();
        this.audioContext = null;
        this.masterVolume = 1.0;
        this.isMuted = false;
        
        // Initialize on user interaction (required by browsers)
        this.initialized = false;
        
        // Sound categories
        this.categories = {
            ambient: 0.6,
            effects: 0.8,
            music: 0.5,
            ui: 0.7
        };
    }
    
    /**
     * Initialize audio context (must be called after user interaction)
     */
    init() {
        if (this.initialized) return;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.initialized = true;
        
        console.log('AudioManager initialized');
    }
    
    /**
     * Create a sound from frequency (for synthetic sounds)
     */
    createTone(name, frequency, duration, category = 'effects') {
        if (!this.initialized) this.init();
        
        const sound = {
            type: 'tone',
            frequency,
            duration,
            category,
            isPlaying: false
        };
        
        this.sounds.set(name, sound);
        return sound;
    }
    
    /**
     * Play a tone
     */
    playTone(name) {
        if (!this.initialized || this.isMuted) return;
        
        const sound = this.sounds.get(name);
        if (!sound || sound.type !== 'tone') return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = sound.frequency;
        oscillator.type = 'sine';
        
        const volume = this.masterVolume * this.categories[sound.category];
        gainNode.gain.setValueAtTime(volume * 0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + sound.duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + sound.duration);
        
        sound.isPlaying = true;
        setTimeout(() => {
            sound.isPlaying = false;
        }, sound.duration * 1000);
    }
    
    /**
     * Create mechanical hum (for loading scene)
     */
    createMechanicalHum() {
        if (!this.initialized) this.init();
        
        const sound = {
            type: 'hum',
            category: 'ambient',
            isPlaying: false,
            oscillators: [],
            gainNode: null
        };
        
        this.sounds.set('mechanical-hum', sound);
        return sound;
    }
    
    /**
     * Play mechanical hum
     */
    playMechanicalHum() {
        if (!this.initialized || this.isMuted) return;
        
        const sound = this.sounds.get('mechanical-hum');
        if (!sound || sound.isPlaying) return;
        
        // Create multiple oscillators for rich mechanical sound
        const frequencies = [60, 120, 180, 240];
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        
        const volume = this.masterVolume * this.categories[sound.category];
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.15, this.audioContext.currentTime + 0.5);
        
        frequencies.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = i % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.value = freq;
            osc.connect(gainNode);
            osc.start();
            sound.oscillators.push(osc);
        });
        
        sound.gainNode = gainNode;
        sound.isPlaying = true;
    }
    
    /**
     * Stop mechanical hum
     */
    stopMechanicalHum() {
        const sound = this.sounds.get('mechanical-hum');
        if (!sound || !sound.isPlaying) return;
        
        const currentTime = this.audioContext.currentTime;
        sound.gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.5);
        
        setTimeout(() => {
            sound.oscillators.forEach(osc => osc.stop());
            sound.oscillators = [];
            sound.isPlaying = false;
        }, 500);
    }
    
    /**
     * Mute/unmute all sounds
     */
    setMuted(muted) {
        this.isMuted = muted;
        if (muted) {
            // Stop all playing sounds
            this.sounds.forEach(sound => {
                if (sound.type === 'hum' && sound.isPlaying) {
                    this.stopMechanicalHum();
                }
            });
        }
    }
    
    /**
     * Set master volume (0-1)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
    
    /**
     * Play gate opening sound (PLACEHOLDER - replace with audio file)
     * 
     * TO USE YOUR OWN AUDIO FILE:
     * 1. Place your audio file in: assets/audios/gate-opening.mp3
     * 2. Replace this method body with:
     *    const audio = new Audio('../assets/audios/gate-opening.mp3');
     *    audio.volume = 0.8 * this.masterVolume;
     *    audio.play();
     */
    playGateOpening() {
        if (!this.initialized || this.isMuted) return;
        
        // Placeholder: simple mechanical sound using oscillators
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc1.frequency.value = 80;
        osc2.frequency.value = 120;
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        
        const volume = this.masterVolume * this.categories.effects;
        gainNode.gain.setValueAtTime(volume * 0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 2);
        
        osc1.start(this.audioContext.currentTime);
        osc2.start(this.audioContext.currentTime);
        osc1.stop(this.audioContext.currentTime + 2);
        osc2.stop(this.audioContext.currentTime + 2);
        
        console.log('Gate opening sound played (placeholder)');
    }
    
    /**
     * Play ambient background music (PLACEHOLDER - replace with audio file)
     * 
     * TO USE YOUR OWN AUDIO FILE:
     * 1. Place your audio file in: assets/audios/ambient-music.mp3
     * 2. Replace this method body with:
     *    if (this.backgroundMusic) this.backgroundMusic.pause();
     *    this.backgroundMusic = new Audio('../assets/audios/ambient-music.mp3');
     *    this.backgroundMusic.volume = 0.3 * this.masterVolume;
     *    this.backgroundMusic.loop = true;
     *    this.backgroundMusic.play();
     */
    playAmbientMusic() {
        if (!this.initialized || this.isMuted) return;
        
        // Placeholder: subtle ambient drone
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc.frequency.value = 55; // Low A note
        osc.type = 'sine';
        
        const volume = this.masterVolume * this.categories.ambient;
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.1, this.audioContext.currentTime + 3);
        
        osc.start(this.audioContext.currentTime);
        
        // Store for cleanup
        this.ambientOscillator = osc;
        this.ambientGain = gainNode;
        
        console.log('Ambient music started (placeholder)');
    }
    
    /**
     * Stop ambient music
     */
    stopAmbientMusic() {
        if (this.ambientOscillator) {
            const currentTime = this.audioContext.currentTime;
            this.ambientGain.gain.linearRampToValueAtTime(0, currentTime + 1);
            
            setTimeout(() => {
                this.ambientOscillator.stop();
                this.ambientOscillator = null;
                this.ambientGain = null;
            }, 1000);
        }
    }
}