import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// === Scene ===
const canvas = document.querySelector('.webgl')
const scene = new THREE.Scene()

// === Lights ===
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)
const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(5, 10, 5)
dirLight.castShadow = true
scene.add(dirLight)

// === Floor ===
const floorSize = 10
const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize)
const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
const floor = new THREE.Mesh(floorGeo, floorMat)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

// === Cube (Dice) - all white ===
const cubeGeo = new THREE.BoxGeometry(1, 1, 1)
const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff })
const cube = new THREE.Mesh(cubeGeo, [
  whiteMaterial, whiteMaterial, whiteMaterial,
  whiteMaterial, whiteMaterial, whiteMaterial
])
cube.castShadow = true
cube.position.set(0, 0.5, 0)
scene.add(cube)

// === Coins ===
const coinGeo = new THREE.TorusGeometry(0.3, 0.1, 16, 100)
const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700 })
const coins = []
for (let i = 0; i < 6; i++) {
  const coin = new THREE.Mesh(coinGeo, coinMat)
  coin.position.set(
    (Math.random() - 0.5) * (floorSize - 2),
    0.4,
    (Math.random() - 0.5) * (floorSize - 2)
  )
  scene.add(coin)
  coins.push(coin)
}

// === Coin Sound ===
const coinSound = new Audio('coin.mp3')

// === Camera ===
const sizes = { width: window.innerWidth, height: window.innerHeight }
const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 8, 12)
camera.lookAt(0, 0.5, 0)
scene.add(camera)

// === Controls ===
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.enablePan = true
controls.enableZoom = true
controls.minDistance = 5
controls.maxDistance = 15
controls.target.set(0, 0.5, 0)
controls.update()

// === Renderer ===
const renderer = new THREE.WebGLRenderer({ canvas })
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.setClearColor(0x000000)

// === Resize ===
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()
  renderer.setSize(sizes.width, sizes.height)
})

// === Dice Roll Logic ===
let isRolling = false
let rollProgress = 0
const rollSpeed = 0.05
const step = 1
const boundary = floorSize / 2 - 1
let rollStartPos = new THREE.Vector3()
let rollTargetPos = new THREE.Vector3()
let rollStartRot = new THREE.Quaternion()
let rollTargetRot = new THREE.Quaternion()

function roll(direction) {
  if (isRolling) return
  isRolling = true
  rollProgress = 0

  rollStartPos.copy(cube.position)
  rollStartRot.copy(cube.quaternion)

  const move = new THREE.Vector3()
  if (direction === 'ArrowRight' && cube.position.x < boundary) move.set(step, 0, 0)
  else if (direction === 'ArrowLeft' && cube.position.x > -boundary) move.set(-step, 0, 0)
  else if (direction === 'ArrowUp' && cube.position.z > -boundary) move.set(0, 0, -step)
  else if (direction === 'ArrowDown' && cube.position.z < boundary) move.set(0, 0, step)
  else { isRolling = false; return }

  rollTargetPos.copy(rollStartPos).add(move)

  // --- Pivot-based rotation along cube's local axis ---
  const axis = new THREE.Vector3()
  if (direction === 'ArrowRight') axis.set(0, 0, -1)
  if (direction === 'ArrowLeft') axis.set(0, 0, 1)
  if (direction === 'ArrowUp') axis.set(1, 0, 0)
  if (direction === 'ArrowDown') axis.set(-1, 0, 0)

  // Convert axis to cube local space
  axis.applyQuaternion(cube.quaternion).normalize()

  const deltaQuat = new THREE.Quaternion()
  deltaQuat.setFromAxisAngle(axis, Math.PI / 2)
  rollTargetRot.copy(cube.quaternion).multiply(deltaQuat)
}

window.addEventListener('keydown', e => roll(e.key))

// === Animation Loop ===
const clock = new THREE.Clock()
function animate() {
  const delta = clock.getDelta()

  // Spin coins
  coins.forEach(coin => coin.rotation.y += delta * 2)

  if (isRolling) {
    rollProgress += rollSpeed
    if (rollProgress > 1) rollProgress = 1

    // Interpolate rotation and position
    cube.quaternion.slerpQuaternions(rollStartRot, rollTargetRot, rollProgress)
    cube.position.lerpVectors(rollStartPos, rollTargetPos, rollProgress)

    if (rollProgress === 1) {
      isRolling = false
      cube.position.y = 0.5
      cube.quaternion.copy(rollTargetRot)
    }
  }

  // Coin collection
  coins.forEach((coin, index) => {
    if (cube.position.distanceTo(coin.position) < 0.7) {
      scene.remove(coin)
      coins.splice(index, 1)
      coinSound.currentTime = 0
      coinSound.play()
    }
  })

  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

animate()
