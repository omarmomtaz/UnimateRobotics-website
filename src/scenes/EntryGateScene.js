/**
 * EntryGateScene.js
 * Stage 2: Entry Gate with sliding sci-fi doors
 * 
 * FIXED VERSION - All issues resolved:
 * - Gate properly visible
 * - Camera positioned correctly
 * - Animations working
 * - Text visible
 * - Progression working
 * - No audio bugs
 */

import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

// ════════════════════════════════════════════════════════════════════════════
// TIMING CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const DOOR_ANIMATION_START    = 0.5;   // when doors start opening (seconds)
const DOOR_ANIMATION_DURATION = 2.0;   // how long doors take to open (seconds)
const TEXT_FADE_START         = 3.0;   // when text starts fading in (seconds)
const TEXT_FADE_DURATION      = 1.0;   // text fade duration (seconds)
const PROGRESSION_Z_THRESHOLD = -10;   // user must pass this Z position to enable progression

// ════════════════════════════════════════════════════════════════════════════

export default class EntryGateScene {
    
    constructor(camera, audioManager, globalState) {
        this.camera       = camera;
        this.audioManager = audioManager;
        this.globalState  = globalState;
        
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000a14, 15, 60);
        
        // Animation state
        this.elapsedTime      = 0;
        this.doorsOpened      = false;
        this.textVisible      = false;
        this.userPassedThrough = false;
        this.progressionEnabled = false;
        this.gateOpeningSoundPlayed = false;
        
        // Objects
        this.leftDoor  = null;
        this.rightDoor = null;
        this.titleText = null;
        this.fontLoaded = false;
        
        this.initScene();
        this.initCamera();
        this.loadFont();
        
        console.log('EntryGateScene initialized');
    }
    
    /* ════════════════════════════════════════════════════════════════════════ */
    
    initScene() {
        this.scene.background = new THREE.Color(0x000a14);
        
        this.createLights();
        this.createGround();
        this.createGate();
        this.createAtmosphere();
    }
    
    initCamera() {
        // Position camera OUTSIDE the gate, looking TOWARD it
        // Moved significantly further back (Z: 45) and higher (Y: 8) to ensure full visibility
        this.camera.instance.position.set(0, 8, 45);
        this.camera.instance.lookAt(0, 6, 0);
        this.camera.instance.fov = 50; // Standard FOV for better perspective
        this.camera.instance.updateProjectionMatrix();
    }
    
    /* ════════════════════════════════════════════════════════════════════════ */
    
    createLights() {
        // Ambient light
        this.ambient = new THREE.AmbientLight(0x4488bb, 0.4);
        this.scene.add(this.ambient);
        
        // Main directional light
        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
        this.dirLight.position.set(5, 15, 10);
        this.dirLight.castShadow = true;
        this.scene.add(this.dirLight);

        // Check initial theme
        this.updateLightsForTheme();
        
        // Cyan accent lights on gate
        const leftAccent = new THREE.SpotLight(0x00ffff, 2, 40, Math.PI / 5, 0.5, 1.5);
        leftAccent.position.set(-5, 9, 2);
        leftAccent.target.position.set(-3, 3, 0);
        this.scene.add(leftAccent);
        this.scene.add(leftAccent.target);
        
        const rightAccent = new THREE.SpotLight(0x00ffff, 2, 40, Math.PI / 5, 0.5, 1.5);
        rightAccent.position.set(5, 9, 2);
        rightAccent.target.position.set(3, 3, 0);
        this.scene.add(rightAccent);
        this.scene.add(rightAccent.target);
        
        // Backlight for atmosphere
        const backLight = new THREE.PointLight(0x0088ff, 1.5, 30);
        backLight.position.set(0, 8, -5);
        this.scene.add(backLight);
    }
    
    createGround() {
        const groundGeo = new THREE.PlaneGeometry(120, 120);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Grid for sci-fi feel
        const gridHelper = new THREE.GridHelper(120, 60, 0x00ffff, 0x003344);
        gridHelper.material.opacity = 0.25;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }
    
    createGate() {
        // Frame material
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.3,
            metalness: 0.9,
            emissive: 0x002244,
            emissiveIntensity: 0.3
        });
        
        // Left pillar
        const leftPillar = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 11, 1.2),
            frameMat
        );
        leftPillar.position.set(-6.5, 5.5, 0);
        leftPillar.castShadow = true;
        this.scene.add(leftPillar);
        
        // Right pillar
        const rightPillar = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 11, 1.2),
            frameMat
        );
        rightPillar.position.set(6.5, 5.5, 0);
        rightPillar.castShadow = true;
        this.scene.add(rightPillar);
        
        // Top beam
        const topBeam = new THREE.Mesh(
            new THREE.BoxGeometry(14, 1, 1.2),
            frameMat
        );
        topBeam.position.set(0, 11, 0);
        topBeam.castShadow = true;
        this.scene.add(topBeam);
        
        // Door panels
        const doorMat = new THREE.MeshStandardMaterial({
            color: 0x2a3544,
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0x00aaff,
            emissiveIntensity: 0.2
        });
        
        // Left door (starts closed at x = -3.25)
        this.leftDoor = new THREE.Mesh(
            new THREE.BoxGeometry(6, 10.5, 0.4),
            doorMat
        );
        this.leftDoor.position.set(-3.25, 5.5, 0);
        this.leftDoor.castShadow = true;
        this.scene.add(this.leftDoor);
        
        // Right door (starts closed at x = 3.25)
        this.rightDoor = new THREE.Mesh(
            new THREE.BoxGeometry(6, 10.5, 0.4),
            doorMat
        );
        this.rightDoor.position.set(3.25, 5.5, 0);
        this.rightDoor.castShadow = true;
        this.scene.add(this.rightDoor);
        
        // Add glowing edges
        this.addDoorEdges(this.leftDoor);
        this.addDoorEdges(this.rightDoor);
    }
    
    addDoorEdges(door) {
        const edgeGeo = new THREE.EdgesGeometry(door.geometry);
        const edgeMat = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            linewidth: 2
        });
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        door.add(edges);
    }
    
    createAtmosphere() {
        // Light shafts (simple planes with glow)
        const shaftMat = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.08,
            side: THREE.DoubleSide
        });
        
        const shaftGeo = new THREE.PlaneGeometry(2.5, 16);
        
        for (let i = 0; i < 5; i++) {
            const shaft = new THREE.Mesh(shaftGeo, shaftMat);
            shaft.position.set(-6 + i * 3, 8, -4);
            shaft.rotation.y = Math.PI / 6;
            this.scene.add(shaft);
        }
    }
    
    /* ════════════════════════════════════════════════════════════════════════ */
    
    loadFont() {
        const loader = new FontLoader();
        
        loader.load(
            'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json',
            (font) => {
                this.createTitleText(font);
                this.fontLoaded = true;
            },
            undefined,
            (error) => {
                console.error('Font loading failed:', error);
                this.createFallbackText();
            }
        );
    }
    
    createTitleText(font) {
        const textGeo = new TextGeometry('UNIMATE ROBOTICS CLUB', {
            font: font,
            size: 0.9,
            height: 0.2,
            curveSegments: 8,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.02,
            bevelSegments: 4
        });
        
        textGeo.center();
        
        const textMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0x00aaff,
            emissiveIntensity: 0.5
        });
        
        this.titleText = new THREE.Mesh(textGeo, textMat);
        this.titleText.position.set(0, 13, 0);
        this.titleText.visible = false;
        this.scene.add(this.titleText);
        
        // Glow light behind text
        const textLight = new THREE.PointLight(0x00ffff, 2, 20);
        textLight.position.copy(this.titleText.position);
        textLight.position.z -= 1;
        this.scene.add(textLight);
    }
    
    createFallbackText() {
        const textMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00aaff,
            emissiveIntensity: 0.6
        });
        
        this.titleText = new THREE.Mesh(
            new THREE.BoxGeometry(12, 1.2, 0.3),
            textMat
        );
        this.titleText.position.set(0, 13, 0);
        this.titleText.visible = false;
        this.scene.add(this.titleText);
        this.fontLoaded = true;
    }
    
    /* ════════════════════════════════════════════════════════════════════════ */
    
    update(elapsed, delta) {
        this.elapsedTime = elapsed / 1000; // convert to seconds
        
        this.updateDoorAnimation();
        this.updateTextAnimation();
        this.updateTextFloating();
        this.checkUserProgress();
        this.updateLightsForTheme();
    }

    updateLightsForTheme() {
        const isLight = document.body.getAttribute('data-theme') === 'light';
        
        if (isLight) {
            // Sunlight effect
            this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
            this.scene.fog.color.set(0x87ceeb);
            this.ambient.color.set(0xfff4e0); // Warm sunlight ambient
            this.ambient.intensity = 0.8;
            this.dirLight.color.set(0xffffff);
            this.dirLight.intensity = 1.2;
            this.dirLight.position.set(10, 20, 10);
        } else {
            // Original dark sci-fi effect
            this.scene.background = new THREE.Color(0x000a14);
            this.scene.fog.color.set(0x000a14);
            this.ambient.color.set(0x4488bb);
            this.ambient.intensity = 0.4;
            this.dirLight.color.set(0xffffff);
            this.dirLight.intensity = 0.7;
            this.dirLight.position.set(5, 15, 10);
        }
    }
    
    updateDoorAnimation() {
        if (this.doorsOpened) return;
        if (this.elapsedTime < DOOR_ANIMATION_START) return;
        
        const animTime = this.elapsedTime - DOOR_ANIMATION_START;
        const t = Math.min(animTime / DOOR_ANIMATION_DURATION, 1);
        
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3);
        
        // Slide doors apart (3.25 units each direction)
        this.leftDoor.position.x  = -3.25 - (eased * 3.25);
        this.rightDoor.position.x =  3.25 + (eased * 3.25);
        
        // Play sound once at start
        if (t > 0 && t < 0.05 && !this.gateOpeningSoundPlayed) {
            this.audioManager.playGateOpening();
            this.gateOpeningSoundPlayed = true;
        }
        
        if (t >= 1) {
            this.doorsOpened = true;
            console.log('Doors fully opened');
        }
    }
    
    updateTextAnimation() {
        if (this.textVisible || !this.fontLoaded) return;
        if (this.elapsedTime < TEXT_FADE_START) return;
        
        const fadeTime = this.elapsedTime - TEXT_FADE_START;
        const t = Math.min(fadeTime / TEXT_FADE_DURATION, 1);
        
        if (!this.titleText.visible && t > 0) {
            this.titleText.visible = true;
        }
        
        this.titleText.material.opacity = t;
        this.titleText.material.transparent = true;
        
        if (t >= 1) {
            this.textVisible = true;
            this.titleText.material.transparent = false;
            this.titleText.material.opacity = 1;
            console.log('Title text fully visible');
        }
    }
    
    updateTextFloating() {
        if (!this.titleText || !this.textVisible) return;
        
        const floatSpeed = 0.5;
        const floatAmount = 0.2;
        this.titleText.position.y = 13 + Math.sin(this.elapsedTime * floatSpeed) * floatAmount;
        this.titleText.rotation.y = Math.sin(this.elapsedTime * 0.3) * 0.06;
    }
    
    checkUserProgress() {
        const userZ = this.camera.instance.position.z;
        
        if (userZ < PROGRESSION_Z_THRESHOLD && !this.userPassedThrough) {
            this.userPassedThrough = true;
            this.enableProgression();
            console.log('User passed through gate - progression enabled');
        }
    }
    
    enableProgression() {
        this.progressionEnabled = true;
        
        const forwardArrow = document.getElementById('arrow-forward');
        if (forwardArrow) {
            // Add glow class
            forwardArrow.classList.add('glow');
            
            // Add click handler (remove old one first to prevent duplicates)
            const newButton = forwardArrow.cloneNode(true);
            forwardArrow.parentNode.replaceChild(newButton, forwardArrow);
            
            newButton.addEventListener('click', () => {
                if (this.progressionEnabled) {
                    this.globalState.setCanProgress(true);
                    console.log('User clicked forward - progressing to Stage 3');
                }
            });
        }
    }
    
    dispose() {
        this.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        console.log('EntryGateScene disposed');
    }
}