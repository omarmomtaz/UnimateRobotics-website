/**
 * MainCamera.js
 * Third-person floating camera setup
 */

import * as THREE from 'three';

export default class MainCamera {
    constructor(sizes) {
        this.sizes = sizes;
        
        // Create camera with narrow FOV for guided feeling
        this.instance = new THREE.PerspectiveCamera(
            45, // FOV - narrower for more guided feeling
            this.sizes.aspect,
            0.1,
            1000
        );
        
        // Default position (will be overridden by scenes)
        this.instance.position.set(0, 1.6, 5); // Slightly above eye level
        
        // Handle resize
        window.addEventListener('sizes-resize', () => {
            this.instance.aspect = this.sizes.aspect;
            this.instance.updateProjectionMatrix();
        });
    }
    
    setPosition(x, y, z) {
        this.instance.position.set(x, y, z);
    }
    
    lookAt(x, y, z) {
        this.instance.lookAt(x, y, z);
    }
}