'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { Region, GuessResult } from '@/types';

// Allen CCF → Three.js orientation
const CCF_TO_THREEJS: [number, number, number] = [Math.PI, 0, 0];

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

function RegionMesh({ allenId, color, emissive = '#000000', emissiveIntensity = 0, opacity = 1 }: {
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

interface BrainViewerProps {
  targetRegion: Region;
  guesses: GuessResult[];
  showGhostBrain: boolean;
  showNeighbors: boolean;
}

export function BrainViewer({ targetRegion, guesses }: BrainViewerProps) {
  const isFiber = targetRegion.category === 'fiber';

  return (
    <div className="w-full h-full rounded-xl overflow-hidden" style={{ background: '#0d0f14' }}>
      <Canvas
        camera={{ position: [200, 150, 200], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
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

        <group rotation={[Math.PI, 0, 0]}>
          <Suspense fallback={null}>
            <Center>
              {/* Ghost brain outline */}
              <GhostBrain />

              {/* Past guesses colored by proximity */}
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
                      emissive={emissive}
                      emissiveIntensity={0.2}
                      opacity={0.5}
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
            </Center>
          </Suspense>
        </group>
      </Canvas>

      <div className="absolute bottom-3 right-3 text-xs font-mono text-gray-600 pointer-events-none">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}
