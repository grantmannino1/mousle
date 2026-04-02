'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Bounds, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Region, GuessResult } from '@/types';

const WHOLE_BRAIN_ALLEN_ID = 997;

function proximityToColor(pct: number): { color: string; emissive: string } {
  if (pct >= 90) return { color: '#4af0c4', emissive: '#1a8060' };
  if (pct >= 70) return { color: '#a0e060', emissive: '#406020' };
  if (pct >= 50) return { color: '#f0d050', emissive: '#806020' };
  if (pct >= 30) return { color: '#f09040', emissive: '#804010' };
  return { color: '#f06060', emissive: '#802020' };
}

interface RegionMeshProps {
  allenId: number;
  color: string;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

function RegionMesh({ allenId, color, opacity = 1, emissive = '#000000', emissiveIntensity = 0 }: RegionMeshProps) {
  const { scene } = useGLTF(`/meshes/${allenId}.glb`);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child: any) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color, emissive, emissiveIntensity, opacity,
          transparent: opacity < 1,
          roughness: 0.5,
          metalness: 0.1,
          side: THREE.DoubleSide,
          depthWrite: opacity >= 1,
        });
      }
    });
    return c;
  }, [scene, color, emissive, emissiveIntensity, opacity]);

  return <primitive object={cloned} />;
}

function GhostBrain() {
  const { scene } = useGLTF(`/meshes/${WHOLE_BRAIN_ALLEN_ID}.glb`);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child: any) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: '#4488aa',
          transparent: true,
          opacity: 0.12,
          side: THREE.FrontSide,
          depthWrite: false,
        });
      }
    });
    return c;
  }, [scene]);
  return <primitive object={cloned} />;
}

function LoadingMesh() {
  return (
    <Html center>
      <div className="text-synapse font-mono text-sm animate-pulse">Loading region...</div>
    </Html>
  );
}

interface SceneProps {
  targetRegion: Region;
  guesses: GuessResult[];
  showGhostBrain: boolean;
}

function Scene({ targetRegion, guesses, showGhostBrain }: SceneProps) {
  const isFiber = targetRegion.category === 'fiber';
  const incorrectGuesses = guesses.filter((g) => !g.isCorrect);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.0} />
      <directionalLight position={[-5, -3, -5]} intensity={0.4} color="#4466aa" />
      <pointLight position={[0, 0, 10]} intensity={0.5} color="#4af0c4" />
      <Environment preset="studio" />

      {/* margin reduced from 1.4 → 0.8 to make the brain bigger on screen */}
      <Bounds fit clip observe margin={0.8}>
        <group rotation={[Math.PI, 0, 0]}>
          {showGhostBrain && <GhostBrain />}

          {incorrectGuesses.map((g) => {
            const { color, emissive } = proximityToColor(g.proximity_pct);
            return (
              <RegionMesh
                key={g.region.id}
                allenId={g.region.allenId}
                color={color}
                emissive={emissive}
                emissiveIntensity={0.2}
                opacity={0.5}
              />
            );
          })}

          <RegionMesh
            allenId={targetRegion.allenId}
            color={isFiber ? '#ffffff' : '#f06060'}
            emissive={isFiber ? '#aaaaff' : '#f03030'}
            emissiveIntensity={0.4}
          />
        </group>
      </Bounds>
    </>
  );
}

interface BrainViewerProps {
  targetRegion: Region;
  guesses: GuessResult[];
  showGhostBrain: boolean;
  showNeighbors: boolean;
}

export function BrainViewer({ targetRegion, guesses, showGhostBrain }: BrainViewerProps) {
  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-lab-border bg-lab-bg relative">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45, near: 0.01, far: 100000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0d0f14' }}
      >
        <Suspense fallback={<LoadingMesh />}>
          <Scene
            targetRegion={targetRegion}
            guesses={guesses}
            showGhostBrain={showGhostBrain}
          />
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={50}
          maxDistance={20000}
          zoomSpeed={0.45}
          makeDefault
          autoRotate
          autoRotateSpeed={0.4}
          enablePan={false}
          target={[0, 0, 0]}
        />
      </Canvas>

      <div className="absolute bottom-3 right-3 text-xs font-mono text-gray-600 pointer-events-none select-none">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}
