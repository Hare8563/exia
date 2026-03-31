import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Background3D } from './modules/Background/Background3D';
import { ForegroundLayer } from './modules/ForegroundLayer/ForegroundLayer';

export const ThreeCanvas: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0" style={{ pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true }}
        flat
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Background3D />
          <ForegroundLayer />
        </Suspense>
      </Canvas>
    </div>
  );
};
