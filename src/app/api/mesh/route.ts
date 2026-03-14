// ============================================================
//  app/api/mesh/route.ts
//  Server-side proxy for Allen Brain Atlas 3D meshes.
//
//  The Allen API (connectivity.brain-map.org) does not set
//  CORS headers allowing direct browser fetches, so we proxy
//  through Next.js server functions.
//
//  Usage: GET /api/mesh?id=<allenId>
//  Returns the .obj file bytes with appropriate headers.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

// The Allen Atlas 3D mesh endpoint
// This returns a .obj file for the given structure ID
const ALLEN_MESH_BASE = 'https://connectivity.brain-map.org/api/v2/well_known_file_download';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: 'Invalid structure ID' }, { status: 400 });
  }

  try {
    const allenUrl = `${ALLEN_MESH_BASE}/${id}`;
    const response = await fetch(allenUrl, {
      headers: {
        // Identify our app to Allen Institute
        'User-Agent': 'MouseWordle/1.0 (educational neuroanatomy game)',
      },
      // Cache meshes for 24 hours — they never change
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Allen API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.arrayBuffer();

    return new NextResponse(data, {
      headers: {
        'Content-Type': 'model/obj',
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('Mesh proxy error:', err);
    return NextResponse.json({ error: 'Failed to fetch mesh' }, { status: 500 });
  }
}

/*
 * ── HOW TO ADD REAL 3D MESHES ──────────────────────────────
 *
 * The Allen CCFv3 mesh IDs for our regions:
 *
 *   Region          | Allen ID | File at Allen
 *   ----------------|----------|----------------------------------
 *   Isocortex       | 315      | Download manually if needed
 *   Hippocampus     | 1080     |
 *   Amygdala        | 131      |
 *   Thalamus        | 549      |
 *   Striatum        | 477      |
 *   Hypothalamus    | 1097     |
 *   Midbrain        | 313      |
 *   Cerebellum      | 512      |
 *   Medulla         | 354      |
 *   Pons            | 771      |
 *
 * You can also download all meshes in bulk from:
 *   http://download.alleninstitute.org/informatics-archive/current-release/mouse_ccf/annotation/
 *
 * The 3D mesh files are in the "structure_meshes" directory as .obj files.
 * Place them in /public/meshes/{allenId}.obj and update BrainViewer.tsx
 * to load from local files instead of the proxy.
 *
 * For local loading (faster, no API dependency):
 *   1. Download all .obj files from Allen
 *   2. Convert to .glb with obj2gltf (npm install -g obj2gltf)
 *   3. Place in /public/meshes/{allenId}.glb
 *   4. In BrainViewer.tsx, use useGLTF(`/meshes/${allenId}.glb`)
 */
