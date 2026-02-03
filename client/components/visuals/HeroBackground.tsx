import React, { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial, MeshWobbleMaterial } from "@react-three/drei";
import * as THREE from "three";

const FloatingShape = ({ position, color, size, speed, distort }: { position: [number, number, number], color: string, size: number, speed: number, distort: number }) => {
  return (
    <Float speed={speed} rotationIntensity={2} floatIntensity={2}>
      <mesh position={position}>
        <sphereGeometry args={[size, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          speed={speed}
          distort={distort}
          radius={1}
        />
      </mesh>
    </Float>
  );
};

const HeroBackground = () => {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden opacity-30">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} />

          <FloatingShape
            position={[-4, 2, -2]}
            color="#3b82f6"
            size={1.5}
            speed={1.5}
            distort={0.4}
          />
          <FloatingShape
            position={[4, -2, -3]}
            color="#60a5fa"
            size={1.2}
            speed={2}
            distort={0.3}
          />
          <FloatingShape
            position={[2, 3, -4]}
            color="#2563eb"
            size={0.8}
            speed={1.2}
            distort={0.5}
          />

          {/* Subtle grid of points */}
          <points>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={500}
                array={new Float32Array(500 * 3).map(() => (Math.random() - 0.5) * 20)}
                itemSize={3}
              />
            </bufferGeometry>
            <pointsMaterial size={0.02} color="#3b82f6" transparent opacity={0.2} sizeAttenuation />
          </points>
        </Suspense>
      </Canvas>
    </div>
  );
};

export default HeroBackground;
