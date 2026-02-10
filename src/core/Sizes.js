/**
 * Sizes.js
 * Handles screen size, resize events, and orientation changes
 */

export default class Sizes {
    constructor() {
        // Set initial sizes
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.aspect = this.width / this.height;
        this.pixelRatio = Math.min(window.devicePixelRatio, 2);
        
        // Device detection
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(navigator.userAgent);
        this.isDesktop = !this.isMobile && !this.isTablet;
        
        // Orientation
        this.isPortrait = this.height > this.width;
        this.isLandscape = this.width > this.height;
        
        // Resize event
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.aspect = this.width / this.height;
            this.pixelRatio = Math.min(window.devicePixelRatio, 2);
            
            this.isPortrait = this.height > this.width;
            this.isLandscape = this.width > this.height;
            
            // Trigger resize event
            window.dispatchEvent(new Event('sizes-resize'));
        });
        
        // Orientation change event
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.width = window.innerWidth;
                this.height = window.innerHeight;
                this.aspect = this.width / this.height;
                
                this.isPortrait = this.height > this.width;
                this.isLandscape = this.width > this.height;
                
                window.dispatchEvent(new Event('sizes-resize'));
            }, 100);
        });
    }
}