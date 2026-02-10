/**
 * Controls.js
 * Unified control system for mobile (swipe) and desktop (mouse/scroll)
 */

export default class Controls {
    constructor(sizes, camera) {
        this.sizes = sizes;
        this.camera = camera;
        
        // Movement state
        this.movement = {
            forward: 0,    // -1 to 1
            rotation: 0,   // -1 to 1 (horizontal rotation)
            rotationY: 0   // -1 to 1 (vertical rotation)
        };
        
        // Touch/Mouse state
        this.touch = {
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            isActive: false,
            isSwiping: false
        };
        
        // Keyboard state
        this.keys = {};
        
        // Scroll state
        this.scrollDelta = 0;
        
        // Camera rotation
        this.rotation = {
            horizontal: 0,
            vertical: 0,
            targetHorizontal: 0,
            targetVertical: 0,
            smoothness: 0.1
        };
        
        this.initControls();
    }
    
    initControls() {
        const canvas = document.getElementById('canvas');
        
        // === TOUCH CONTROLS (Mobile) ===
        canvas.addEventListener('touchstart', (e) => {
            this.touch.isActive = true;
            this.touch.startX = e.touches[0].clientX;
            this.touch.startY = e.touches[0].clientY;
            this.touch.currentX = this.touch.startX;
            this.touch.currentY = this.touch.startY;
        });
        
        canvas.addEventListener('touchmove', (e) => {
            if (!this.touch.isActive) return;
            
            e.preventDefault();
            this.touch.currentX = e.touches[0].clientX;
            this.touch.currentY = e.touches[0].clientY;
            
            const deltaX = this.touch.currentX - this.touch.startX;
            const deltaY = this.touch.currentY - this.touch.startY;
            
            // Determine if it's a horizontal or vertical swipe
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe = rotation
                this.rotation.targetHorizontal += deltaX * 0.005;
                this.touch.isSwiping = true;
            } else {
                // Vertical swipe = movement
                this.movement.forward = deltaY > 0 ? -0.5 : 0.5;
                this.touch.isSwiping = true;
            }
            
            this.touch.startX = this.touch.currentX;
            this.touch.startY = this.touch.currentY;
        });
        
        canvas.addEventListener('touchend', () => {
            this.touch.isActive = false;
            this.touch.isSwiping = false;
            this.movement.forward = 0;
        });
        
        // === MOUSE CONTROLS (Desktop) ===
        canvas.addEventListener('mousedown', (e) => {
            this.touch.isActive = true;
            this.touch.startX = e.clientX;
            this.touch.startY = e.clientY;
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!this.touch.isActive) return;
            
            const deltaX = e.clientX - this.touch.startX;
            const deltaY = e.clientY - this.touch.startY;
            
            this.rotation.targetHorizontal += deltaX * 0.003;
            this.rotation.targetVertical -= deltaY * 0.003;
            
            // Clamp vertical rotation
            this.rotation.targetVertical = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.rotation.targetVertical));
            
            this.touch.startX = e.clientX;
            this.touch.startY = e.clientY;
        });
        
        canvas.addEventListener('mouseup', () => {
            this.touch.isActive = false;
        });
        
        // === SCROLL CONTROLS (Desktop) ===
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.scrollDelta = e.deltaY;
            this.movement.forward = e.deltaY > 0 ? -0.3 : 0.3;
            
            // Reset movement after a delay
            setTimeout(() => {
                this.movement.forward = 0;
            }, 100);
        }, { passive: false });
        
        // === ARROW BUTTON CONTROLS ===
        this.setupArrowButtons();
        
        // === KEYBOARD CONTROLS (Optional) ===
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    setupArrowButtons() {
        const arrowForward = document.getElementById('arrow-forward');
        const arrowBackward = document.getElementById('arrow-backward');
        const arrowLeft = document.getElementById('arrow-left');
        const arrowRight = document.getElementById('arrow-right');
        
        if (arrowForward) {
            arrowForward.addEventListener('click', () => {
                this.movement.forward = 0.5;
                setTimeout(() => { this.movement.forward = 0; }, 100);
            });
        }
        
        if (arrowBackward) {
            arrowBackward.addEventListener('click', () => {
                this.movement.forward = -0.5;
                setTimeout(() => { this.movement.forward = 0; }, 100);
            });
        }
        
        if (arrowLeft) {
            arrowLeft.addEventListener('click', () => {
                this.rotation.targetHorizontal -= 0.2;
            });
        }
        
        if (arrowRight) {
            arrowRight.addEventListener('click', () => {
                this.rotation.targetHorizontal += 0.2;
            });
        }
    }
    
    update() {
        // Smooth camera rotation
        this.rotation.horizontal += (this.rotation.targetHorizontal - this.rotation.horizontal) * this.rotation.smoothness;
        this.rotation.vertical += (this.rotation.targetVertical - this.rotation.vertical) * this.rotation.smoothness;
        
        // Apply rotation to camera
        const cam = this.camera.instance;
        cam.rotation.y = this.rotation.horizontal;
        cam.rotation.x = this.rotation.vertical;
    }
    
    getMovement() {
        return this.movement;
    }
}