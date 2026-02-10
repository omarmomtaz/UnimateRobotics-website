/**
 * Time.js
 * Handles time, delta time, and elapsed time
 */

export default class Time {
    constructor() {
        this.start = Date.now();
        this.current = this.start;
        this.elapsed = 0;
        this.delta = 16; // ~60fps initial
        
        // Start the clock
        this.tick();
    }
    
    tick() {
        const currentTime = Date.now();
        this.delta = currentTime - this.current;
        this.current = currentTime;
        this.elapsed = this.current - this.start;
        
        // Trigger tick event
        window.dispatchEvent(new Event('tick'));
        
        // Continue the loop
        window.requestAnimationFrame(() => this.tick());
    }
}