'use client';

import { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { Region, GuessResult } from '@/types';

const WHOLE_BRAIN_ALLEN_ID = 997;

/**
 * Map proximity % to a color for guessed regions.
 */
function proximityToColor(pct: number): { color: string; emissive: string } {
  if (pct >= 90) return { color: '#4af0c4', emissive: '#1a8060' };
  if (pct >= 70) return { color: '#a0e060', emissive: '#406020' };
  if (pct >= 50) return { color: '#f0d050', emissive: '#806020' };
  if (pct >= 30) return { color: '#f09040', emissive: '#804010' };
  return { color: '#f06060', emissive: '#802020' };
}

function RegionMesh({
  allenId,
  color,
  emissive = '#000000',
  emissiveIntensity = 0,
  opacity = 1,
}: {
  allenId: number;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
}) {
  const { scene } = useGLTF(`/meshes/${allenId}.glb`);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child: any) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color,
          emissive,
          emissiveIntensity,
          roughness: 0.6,
          metalness: 0.1,
          transparent: opacity < 1,
          opacity,
          depthWrite: opacity >= 1,
          side: THREE.DoubleSide,
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

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0f14] rounded-xl z-10">
      <div className="w-8 h-8 rounded-full border-2 border-gray-600 border-t-cyan-400 animate-spin mb-3" />
      <span className="text-xs text-gray-500 font-mono tracking-widest uppercase">
        Loading atlas…
      </span>
    </div>
  );
}

interface BrainViewerProps {
  targetRegion: Region;
  guesses: GuessResult[];
  showGhostBrain: boolean;
  showNeighbors: boolean;
  solved?: boolean;
}

export function BrainViewer({
  targetRegion,
  guesses,
  showGhostBrain,
  showNeighbors,
  solved = false,
}: BrainViewerProps) {
  const [loading, setLoading] = useState(true);
  const isFiber = targetRegion.category === 'fiber';

  // Determine target region appearance based on solve state
  const targetColor = solved ? '#4af0c4' : isFiber ? '#ffffff' : '#f06060';
  const targetEmissive = solved ? '#1a8060' : isFiber ? '#aaaaff' : '#f03030';
  const targetEmissiveIntensity = solved ? 0.8 : 0.4;

  // Collect neighbor allenIds from correct guesses that are adjacent to target
  // (assumes GuessResult has an optional `isNeighbor` boolean)
  const neighborIds = useMemo(() => {
    if (!showNeighbors) return new Set<number>();
    return new Set(
      guesses
        .filter((g) => (g as any).isNeighbor && !g.isCorrect)
        .map((g) => g.region.allenId)
    );
  }, [guesses, showNeighbors]);

  const incorrectGuesses = guesses.filter((g) => !g.isCorrect);

  return (
    <div
      className="relative w-full h-full rounded-xl overflow-hidden"
      style={{ background: '#0d0f14' }}
    >
      {loading && <LoadingOverlay />}

      <Canvas
        camera={{ position: [200, 150, 200], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={() => setLoading(false)}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 50, 50]} intensity={1.2} />
        <directionalLight position={[-50, -30, -50]} intensity={0.4} color="#4466aa" />
        <Environment preset="studio" />

        <OrbitControls
          enablePan={false}
          enableZoom
          enableRotate
          autoRotate
          autoRotateSpeed={0.3}
          minDistance={150}
          maxDistance={500}
          dampingFactor={0.05}
          enableDamping
          target={[0, 0, 0]}
        />

        {/* Allen CCF → Three.js: flip Y axis */}
        <group rotation={[Math.PI, 0, 0]}>
          <Suspense fallback={null}>
            <Center>
              {/* Optional ghost brain outline */}
              {showGhostBrain && <GhostBrain />}

              {/* Past incorrect guesses colored by proximity */}
              {incorrectGuesses.map((g) => {
                const isNeighbor = neighborIds.has(g.region.allenId);
                const isFiberGuess = g.region.category === 'fiber';

                // Fiber tracts: color by proximity like normal regions
                const { color, emissive } = isFiberGuess
                  ? proximityToColor(g.proximity_pct)
                  : proximityToColor(g.proximity_pct);

                // Neighbors get a slight blue tint to indicate adjacency
                const finalColor = isNeighbor ? '#88aaff' : color;
                const finalEmissive = isNeighbor ? '#2244aa' : emissive;

                return (
                  <RegionMesh
                    key={g.region.id}
                    allenId={g.region.allenId}
                    color={finalColor}
                    emissive={finalEmissive}
                    emissiveIntensity={isNeighbor ? 0.4 : 0.2}
                    opacity={0.5}
                  />
                );
              })}

              {/* Target region — revealed red normally, green when solved */}
              <RegionMesh
                allenId={targetRegion.allenId}
                color={targetColor}
                emissive={targetEmissive}
                emissiveIntensity={targetEmissiveIntensity}
              />
            </Center>
          </Suspense>
        </group>
      </Canvas>

      <div className="absolute bottom-3 right-3 text-xs font-mono text-gray-600 pointer-events-none select-none">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}
