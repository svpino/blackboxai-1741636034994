// Initialize minimap
const minimapCanvas = document.getElementById('minimap');
minimapCanvas.width = 200;  // Set canvas width
minimapCanvas.height = 200; // Set canvas height
const minimapCtx = minimapCanvas.getContext('2d');
const MINIMAP_SCALE = 5; // Scale factor for converting world coordinates to minimap

// World boundaries based on room layout
const worldBounds = {
    minX: -10,
    maxX: 30,
    minZ: -10,
    maxZ: 30
};

// Convert world coordinates to minimap coordinates
function worldToMinimap(x, z) {
    const mapWidth = minimapCanvas.width;
    const mapHeight = minimapCanvas.height;
    const padding = 20; // Add padding to prevent drawing at edges
    
    // Calculate the scale factors with padding
    const scaleX = (mapWidth - 2 * padding) / (worldBounds.maxX - worldBounds.minX);
    const scaleZ = (mapHeight - 2 * padding) / (worldBounds.maxZ - worldBounds.minZ);
    
    // Use the smaller scale to maintain aspect ratio
    const scale = Math.min(scaleX, scaleZ);
    
    // Calculate centering offsets
    const offsetX = (mapWidth - (worldBounds.maxX - worldBounds.minX) * scale) / 2;
    const offsetZ = (mapHeight - (worldBounds.maxZ - worldBounds.minZ) * scale) / 2;
    
    // Convert and flip Z coordinate (since canvas Y grows downward)
    return {
        x: offsetX + (x - worldBounds.minX) * scale,
        y: mapHeight - (offsetZ + (z - worldBounds.minZ) * scale) // Flip Y coordinate
    };
}

// Draw the minimap
function updateMinimap() {
    // Clear the canvas
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    // Draw rooms
    minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    minimapCtx.lineWidth = 2;
    
    rooms.forEach(room => {
        // Calculate room corners in world space
        const halfWidth = room.size.width / 2;
        const halfDepth = room.size.depth / 2;
        
        const topLeft = worldToMinimap(room.x - halfWidth, room.z - halfDepth);
        const bottomRight = worldToMinimap(room.x + halfWidth, room.z + halfDepth);
        
        // Draw room rectangle
        minimapCtx.beginPath();
        minimapCtx.rect(
            topLeft.x,
            topLeft.y,
            bottomRight.x - topLeft.x,
            bottomRight.y - topLeft.y
        );
        minimapCtx.stroke();
        
        // Fill room with a subtle color
        minimapCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        minimapCtx.fill();
    });
    
    // Draw doorways with glow effect
    doorways.forEach(door => {
        const doorPos = worldToMinimap(door.x, door.z);
        
        // Draw outer glow
        minimapCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        minimapCtx.beginPath();
        minimapCtx.arc(doorPos.x, doorPos.y, 6, 0, Math.PI * 2);
        minimapCtx.fill();
        
        // Draw inner door marker
        minimapCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        minimapCtx.beginPath();
        minimapCtx.arc(doorPos.x, doorPos.y, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    });
    
    // Draw player position with glow
    const playerPos = worldToMinimap(camera.position.x, camera.position.z);
    
    // Add player glow
    minimapCtx.beginPath();
    minimapCtx.arc(playerPos.x, playerPos.y, 8, 0, Math.PI * 2);
    minimapCtx.fillStyle = 'rgba(255, 153, 0, 0.2)';
    minimapCtx.fill();
    
    // Draw player direction indicator
    minimapCtx.beginPath();
    minimapCtx.moveTo(playerPos.x, playerPos.y);
    const directionLength = 10;
    const directionX = playerPos.x - Math.sin(camera.rotation.y) * directionLength;
    const directionY = playerPos.y - Math.cos(camera.rotation.y) * directionLength;
    minimapCtx.lineTo(directionX, directionY);
    minimapCtx.strokeStyle = '#ff9900';
    minimapCtx.lineWidth = 2;
    minimapCtx.stroke();
    
    // Draw player position dot
    minimapCtx.beginPath();
    minimapCtx.arc(playerPos.x, playerPos.y, 4, 0, Math.PI * 2);
    minimapCtx.fillStyle = '#ff9900';
    minimapCtx.fill();
}

// Initialize Three.js scene, camera, and renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Create textured materials
const wallTexture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/brick_diffuse.jpg');
wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
wallTexture.repeat.set(4, 4);

const floorTexture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/hardwood2_diffuse.jpg');
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(8, 8);

// Game configuration
let doorways = [];
const rooms = [
    { x: 0, z: 0, size: { width: 20, height: 10, depth: 20 } },
    { x: 20, z: 0, size: { width: 20, height: 10, depth: 20 } },
    { x: 0, z: 20, size: { width: 20, height: 10, depth: 20 } },
    { x: 20, z: 20, size: { width: 20, height: 10, depth: 20 } }
];

// Create multiple rooms
function createRooms() {
    rooms.forEach((room, index) => {
        // Walls
        const wallsGeometry = new THREE.BoxGeometry(
            room.size.width,
            room.size.height,
            room.size.depth
        );
        const wallsMaterial = new THREE.MeshPhongMaterial({
            map: wallTexture,
            side: THREE.BackSide
        });
        const walls = new THREE.Mesh(wallsGeometry, wallsMaterial);
        walls.position.set(room.x, 0, room.z);
        walls.receiveShadow = true;
        scene.add(walls);

        // Floor
        const floorGeometry = new THREE.PlaneGeometry(
            room.size.width,
            room.size.depth
        );
        const floorMaterial = new THREE.MeshPhongMaterial({
            map: floorTexture,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = Math.PI / 2;
        floor.position.set(room.x, -5, room.z);
        floor.receiveShadow = true;
        scene.add(floor);

        // Add random obstacles in each room
        const boxCount = 3;
        const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
        const boxMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });

        for (let i = 0; i < boxCount; i++) {
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            box.position.x = room.x + (Math.random() * 16 - 8);
            box.position.z = room.z + (Math.random() * 16 - 8);
            box.position.y = -4;
            box.castShadow = true;
            box.receiveShadow = true;
            scene.add(box);
        }
    });

    // Add doorways between rooms
    doorways = [
        { x: 10, z: 0 },  // Between room 0 and 1
        { x: 0, z: 10 },  // Between room 0 and 2
        { x: 20, z: 10 }, // Between room 1 and 3
        { x: 10, z: 20 }  // Between room 2 and 3
    ];

    doorways.forEach(door => {
        const doorGeometry = new THREE.BoxGeometry(4, 6, 4);
        const doorMaterial = new THREE.MeshPhongMaterial({
            color: 0x8b4513,
            transparent: true,
            opacity: 0
        });
        const doorway = new THREE.Mesh(doorGeometry, doorMaterial);
        doorway.position.set(door.x, -2, door.z);
        scene.add(doorway);
    });
}

// Create gun model
function createGun() {
    const gunGroup = new THREE.Group();

    // Gun barrel
    const barrelGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const barrelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    
    // Gun handle
    const handleGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.1);
    const handleMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.1;
    handle.position.z = 0.1;

    gunGroup.add(barrel);
    gunGroup.add(handle);
    gunGroup.position.set(0.3, -0.2, -0.5);
    camera.add(gunGroup);
    scene.add(camera);
    
    return gunGroup;
}

// Add lighting
function addLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    rooms.forEach(room => {
        const light = new THREE.PointLight(0xffffff, 0.8, 15);
        light.position.set(room.x, 3, room.z);
        light.castShadow = true;
        scene.add(light);
    });
}

// Initialize game elements
createRooms();
const gun = createGun();
addLighting();

// Set initial camera position
camera.position.set(0, 2, 0);

// Game state
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let turnLeft = false;
let turnRight = false;
let canShoot = true;
let isLocked = false;

// Movement and turning speed
const MOVE_SPEED = 0.15;
const TURN_SPEED = 0.03;
const SHOOT_COOLDOWN = 500;

// Instructions handling
const instructions = document.getElementById('instructions');
document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === document.body;
    instructions.classList.toggle('hidden', isLocked);
});

// Handle keyboard controls
document.addEventListener('keydown', (event) => {
    if (!isLocked) return;
    
    switch(event.code) {
        case 'ArrowUp':
            moveForward = true;
            break;
        case 'ArrowDown':
            moveBackward = true;
            break;
        case 'ArrowLeft':
            turnLeft = true;
            break;
        case 'ArrowRight':
            turnRight = true;
            break;
        case 'KeyA':
            moveLeft = true;
            break;
        case 'KeyD':
            moveRight = true;
            break;
        case 'Space':
            if (canShoot) {
                shoot();
            }
            break;
    }
});

document.addEventListener('keyup', (event) => {
    if (!isLocked) return;
    
    switch(event.code) {
        case 'ArrowUp':
            moveForward = false;
            break;
        case 'ArrowDown':
            moveBackward = false;
            break;
        case 'ArrowLeft':
            turnLeft = false;
            break;
        case 'ArrowRight':
            turnRight = false;
            break;
        case 'KeyA':
            moveLeft = false;
            break;
        case 'KeyD':
            moveRight = false;
            break;
    }
});

// Mouse look controls
document.addEventListener('mousemove', (event) => {
    if (isLocked) {
        camera.rotation.y -= event.movementX * 0.002;
        camera.rotation.x -= event.movementY * 0.002;
        camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
    }
});

// Handle pointer lock
renderer.domElement.addEventListener('click', () => {
    if (!isLocked) {
        document.body.requestPointerLock();
    }
});

// Shooting mechanism with particle effects
function shoot() {
    canShoot = false;
    
    // Create bullet
    const bulletGeometry = new THREE.SphereGeometry(0.05);
    const bulletMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff8800,
        emissive: 0xff8800,
        emissiveIntensity: 1
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    bullet.position.copy(camera.position);
    bullet.rotation.copy(camera.rotation);
    scene.add(bullet);
    
    // Create muzzle flash particles
    const particleCount = 20;
    const particles = new THREE.Group();
    
    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.02),
            new THREE.MeshBasicMaterial({ color: 0xff4400 })
        );
        
        particle.position.copy(gun.position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            -Math.random() * 0.5
        );
        particles.add(particle);
    }
    camera.add(particles);
    
    // Animate particles
    const particleAnimation = () => {
        particles.children.forEach((particle) => {
            particle.position.add(particle.velocity);
            particle.material.opacity *= 0.95;
        });
        
        if (particles.children[0].material.opacity > 0.01) {
            requestAnimationFrame(particleAnimation);
        } else {
            camera.remove(particles);
        }
    };
    particleAnimation();
    
    // Bullet movement animation
    const bulletSpeed = 1;
    const bulletDirection = new THREE.Vector3(0, 0, -1);
    bulletDirection.applyQuaternion(camera.quaternion);
    
    function animateBullet() {
        bullet.position.add(bulletDirection.multiplyScalar(bulletSpeed));
        
        if (bullet.position.distanceTo(camera.position) > 50) {
            scene.remove(bullet);
        } else {
            requestAnimationFrame(animateBullet);
        }
    }
    
    animateBullet();
    
    setTimeout(() => {
        canShoot = true;
    }, SHOOT_COOLDOWN);
    
    gun.children[0].material.emissive = new THREE.Color(0xff0000);
    setTimeout(() => {
        gun.children[0].material.emissive = new THREE.Color(0x000000);
    }, 50);
}

// Game loop
function animate() {
    requestAnimationFrame(animate);
    
    if (isLocked) {
        // Handle movement
        if (moveForward) {
            camera.translateZ(-MOVE_SPEED);
        }
        if (moveBackward) {
            camera.translateZ(MOVE_SPEED);
        }
        if (moveLeft) {
            camera.translateX(-MOVE_SPEED);
        }
        if (moveRight) {
            camera.translateX(MOVE_SPEED);
        }
        // Handle turning with arrow keys
        if (turnLeft) {
            camera.rotation.y += TURN_SPEED;
        }
        if (turnRight) {
            camera.rotation.y -= TURN_SPEED;
        }
        
        // Collision detection with room boundaries
        const totalWidth = 40; // Total width of all rooms
        const totalDepth = 40; // Total depth of all rooms
        
        if (camera.position.x < -9) camera.position.x = -9;
        if (camera.position.x > totalWidth - 11) camera.position.x = totalWidth - 11;
        if (camera.position.z < -9) camera.position.z = -9;
        if (camera.position.z > totalDepth - 11) camera.position.z = totalDepth - 11;
    }
    
    renderer.render(scene, camera);
    updateMinimap();
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the game loop
animate();
