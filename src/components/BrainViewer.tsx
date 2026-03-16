'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Center, Bounds, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Region, GuessResult } from '@/types';

interface RegionMeshProps {
  allenId: number;
  color: string;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

function RegionMesh({ allenId, color, opacity = 1, emissive = '#000000', emissiveIntensity = 0 }: RegionMeshProps) {
  const { scene } = useGLTF(`/meshes/${allenId}.glb`);
  const cloned = scene.clone();
  cloned.traverse((child: any) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        color, emissive, emissiveIntensity, opacity,
        transparent: opacity < 1, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide,
      });
    }
  });
  return <primitive object={cloned} />;
}

function GhostBrain({ allenId }: { allenId: number }) {
  const { scene } = useGLTF(`/meshes/${allenId}.glb`);
  const cloned = scene.clone();
  cloned.traverse((child: any) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        color: '#4488aa', transparent: true, opacity: 0.12,
        side: THREE.FrontSide, depthWrite: false,
      });
    }
  });
  return <primitive object={cloned} />;
}

/**
 * Map proximity % to a color:
 * 0%   → red    #f06060
 * 30%  → orange #f09040
 * 50%  → yellow #f0d050
 * 70%  → yellow-green #a0e060
 * 90%+ → green  #4af0c4
 */
function proximityToColor(pct: number): { color: string; emissive: string } {
  if (pct >= 90) return { color: '#4af0c4', emissive: '#1a8060' };
  if (pct >= 70) return { color: '#a0e060', emissive: '#406020' };
  if (pct >= 50) return { color: '#f0d050', emissive: '#806020' };
  if (pct >= 30) return { color: '#f09040', emissive: '#804010' };
  return { color: '#f06060', emissive: '#802020' };
}

const WHOLE_BRAIN_ALLEN_ID = 997;

function Scene({ targetRegion, guesses }: { targetRegion: Region; guesses: GuessResult[] }) {
  const isFiber = targetRegion.category === 'fiber';

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.0} castShadow />
      <directionalLight position={[-5, -3, -5]} intensity={0.4} color="#4466aa" />
      <pointLight position={[0, 0, 10]} intensity={0.5} color="#4af0c4" />
      <Environment preset="studio" />
      <Bounds fit clip observe margin={1.4}>
        <Center>
          <group rotation={[Math.PI, 0, 0]}>
            <GhostBrain allenId={WHOLE_BRAIN_ALLEN_ID} />

            {/* Past guesses — colored by proximity, white if fiber */}
            {guesses
              .filter((g) => !g.isCorrect)
              .map((g) => {
                const isFiberGuess = g.region.category === 'fiber';
                const { color, emissive } = isFiberGuess
                  ? { color: '#ffffff', emissive: '#aaaaaa' }
                  : proximityToColor(g.proximity_pct);
                return (
                  <RegionMesh
                    key={g.region.id}
                    allenId={g.region.allenId}
                    color={color}
                    opacity={0.5}
                    emissive={emissive}
                    emissiveIntensity={0.2}
                  />
                );
              })}

            {/* Target region */}
            <RegionMesh
              allenId={targetRegion.allenId}
              color={isFiber ? '#ffffff' : '#f06060'}
              emissive={isFiber ? '#aaaaff' : '#f03030'}
              emissiveIntensity={0.4}
            />
          </group>
        </Center>
      </Bounds>
    </>
  );
}

function LoadingMesh() {
  return (
    <Html center>
      <div className="text-synapse font-mono text-sm animate-pulse">Loading region...</div>
    </Html>
  );
}

interface BrainViewerProps {
  targetRegion: Region;
  guesses: GuessResult[];
  showGhostBrain: boolean;
  showNeighbors: boolean;
}

export function BrainViewer({ targetRegion, guesses }: BrainViewerProps) {
  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-lab-border bg-lab-bg relative">
      <Canvas
        camera={{ position: [200, 150, 200], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0d0f14' }}
      >
        <Suspense fallback={<LoadingMesh />}>
          <Scene targetRegion={targetRegion} guesses={guesses} />
        </Suspense>
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={150}
          maxDistance={600}
          makeDefault
          autoRotate
          autoRotateSpeed={0.7}
          enablePan={false}
        />
      </Canvas>
      <div className="absolute bottom-3 right-3 text-xs font-mono text-gray-600">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}
