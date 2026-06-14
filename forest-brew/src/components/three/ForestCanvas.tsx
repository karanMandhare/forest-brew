'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'

// Pre-create shared geometries and materials for batched rendering
const LEAF_GEOMETRY = new THREE.PlaneGeometry(1, 1.4)
const STEAM_GEOMETRY = new THREE.SphereGeometry(1, 6, 6)

const LEAF_MATERIALS = [
  new THREE.MeshBasicMaterial({ color: '#4a8c3f', transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }),
  new THREE.MeshBasicMaterial({ color: '#7bc47f', transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }),
  new THREE.MeshBasicMaterial({ color: '#558b2f', transparent: true, opacity: 0.60, side: THREE.DoubleSide, depthWrite: false }),
  new THREE.MeshBasicMaterial({ color: '#a8c5a0', transparent: true, opacity: 0.80, side: THREE.DoubleSide, depthWrite: false }),
  new THREE.MeshBasicMaterial({ color: '#2d5a27', transparent: true, opacity: 0.70, side: THREE.DoubleSide, depthWrite: false }),
  new THREE.MeshBasicMaterial({ color: '#8fbc8f', transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }),
]

const STEAM_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#ffffff',
  transparent: true,
  opacity: 0.3,
  depthWrite: false,
})

// Deterministic pseudo-random number generator based on a seed value
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// A single floating leaf particle
interface LeafProps {
  position: [number, number, number]
  speed: number
  size: number
  rotSpeed: number
  materialIndex: number
}

function Leaf({ position, speed, size, rotSpeed, materialIndex }: LeafProps) {
  const mesh = useRef<THREE.Mesh>(null)
  const startY = position[1]

  useFrame((state, delta) => {
    if (!mesh.current) return
    mesh.current.position.y -= speed * delta
    mesh.current.rotation.z += rotSpeed * delta
    mesh.current.rotation.y += rotSpeed * 0.5 * delta
    // Wind sway
    mesh.current.position.x += Math.sin(state.clock.elapsedTime * 0.8 + position[0]) * 0.003

    // Reset when fallen off screen
    if (mesh.current.position.y < -6) {
      mesh.current.position.y = startY + 8
      mesh.current.position.x = position[0] + (Math.random() - 0.5) * 2
    }
  })

  // Select the deterministic material index passed from parent
  const material = LEAF_MATERIALS[materialIndex]

  return (
    <mesh
      ref={mesh}
      position={position}
      geometry={LEAF_GEOMETRY}
      material={material}
      scale={[size, size, 1]}
    />
  )
}

// Coffee steam particle
function SteamParticle({ x, index }: { x: number; index: number }) {
  const mesh = useRef<THREE.Mesh>(null)
  const startY = -1.5
  const phase = useRef(pseudoRandom(index * 17 + 1) * Math.PI * 2)
  const size = useMemo(() => 0.04 + pseudoRandom(index * 17 + 2) * 0.03, [index])

  // Create a instance-specific material so we can adjust opacity independently without affecting others
  const material = useMemo(() => {
    return STEAM_MATERIAL.clone()
  }, [])

  useFrame((state, delta) => {
    if (!mesh.current) return
    const t = state.clock.elapsedTime + phase.current
    mesh.current.position.y += 0.4 * delta
    mesh.current.position.x = x + Math.sin(t * 1.5) * 0.08
    ;(mesh.current.material as THREE.MeshBasicMaterial).opacity =
      Math.max(0, 0.35 - (mesh.current.position.y - startY) * 0.2)

    if (mesh.current.position.y > startY + 2) {
      mesh.current.position.y = startY
    }
  })

  return (
    <mesh
      ref={mesh}
      position={[x, startY, 0]}
      geometry={STEAM_GEOMETRY}
      material={material}
      scale={[size, size, size]}
    />
  )
}

// Leaves scene — reduced density to 18 particles for better scroll performance on mobile
function LeavesScene() {
  const leaves = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const seedBase = i * 7
      return {
        id: i,
        position: [
          (pseudoRandom(seedBase + 1) - 0.5) * 16,
          pseudoRandom(seedBase + 2) * 10 - 2,
          (pseudoRandom(seedBase + 3) - 0.5) * 2,
        ] as [number, number, number],
        speed: 0.3 + pseudoRandom(seedBase + 4) * 0.5,
        size: 0.06 + pseudoRandom(seedBase + 5) * 0.1,
        rotSpeed: (pseudoRandom(seedBase + 6) - 0.5) * 2,
        materialIndex: Math.floor(pseudoRandom(seedBase + 7) * LEAF_MATERIALS.length),
      }
    })
  }, [])

  const steam = useMemo(() => [-0.1, 0.05, 0.18], [])

  return (
    <>
      {leaves.map((l) => (
        <Leaf key={l.id} {...l} />
      ))}
      {steam.map((x, i) => (
        <SteamParticle key={`steam-${i}`} x={x} index={i} />
      ))}
    </>
  )
}

export default function ForestCanvas() {
  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
      dpr={[1, 1.2]}
    >
      <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={80} />
      <ambientLight intensity={0.6} />
      <LeavesScene />
    </Canvas>
  )
}
