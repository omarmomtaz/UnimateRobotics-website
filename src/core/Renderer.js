/**
 * Renderer.js
 * WebGL renderer setup with pixel ratio and resize handling
 */

import * as THREE from 'three';

export default class Renderer {
    constructor(canvas, sizes) {
        this.canvas = canvas;
        this.sizes = sizes;
        
        this.instance = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        
        this.instance.setSize(this.sizes.width, this.sizes.height);
        this.instance.setPixelRatio(this.sizes.pixelRatio);
        this.instance.setClearColor('#000000', 1);
        
        // Enable shadows for better visuals
        this.instance.shadowMap.enabled = true;
        this.instance.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Better color management
        this.instance.outputColorSpace = THREE.SRGBColorSpace;
        this.instance.toneMapping = THREE.ACESFilmicToneMapping;
        this.instance.toneMappingExposure = 1.0;
        
        // Handle resize
        window.addEventListener('sizes-resize', () => {
            this.instance.setSize(this.sizes.width, this.sizes.height);
            this.instance.setPixelRatio(this.sizes.pixelRatio);
        });
    }
    
    render(scene, camera) {
        this.instance.render(scene, camera);
    }
}