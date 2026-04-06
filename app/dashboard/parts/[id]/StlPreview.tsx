"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

type Props = {
  url: string;
  fileName: string;
};

type Status = "loading" | "ready" | "error";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not load STL preview.";
}

export default function StlPreview({ url, fileName }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let disposed = false;
    let animationFrameId = 0;

    container.innerHTML = "";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f8fafc");

    const camera = new THREE.PerspectiveCamera(
      45,
      Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
      0.1,
      5000,
    );

    camera.position.set(120, 120, 120);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(
      Math.max(container.clientWidth, 1),
      Math.max(container.clientHeight, 1),
    );
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;

    const ambientLight = new THREE.AmbientLight("#ffffff", 1.25);
    const directionalLight = new THREE.DirectionalLight("#ffffff", 1.15);
    directionalLight.position.set(120, 180, 140);

    const directionalLightTwo = new THREE.DirectionalLight("#ffffff", 0.6);
    directionalLightTwo.position.set(-120, 80, -100);

    scene.add(ambientLight, directionalLight, directionalLightTwo);

    let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null = null;

    const renderFrame = () => {
      if (disposed) return;
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = window.requestAnimationFrame(renderFrame);
    };

    const fitCameraToGeometry = (geometry: THREE.BufferGeometry) => {
      geometry.computeBoundingBox();

      const boundingBox = geometry.boundingBox;
      if (!boundingBox) return;

      const center = new THREE.Vector3();
      boundingBox.getCenter(center);

      const size = new THREE.Vector3();
      boundingBox.getSize(size);

      const maxDimension = Math.max(size.x, size.y, size.z, 1);
      const distance = maxDimension * 1.8;

      camera.position.set(
        center.x + distance,
        center.y + distance * 0.85,
        center.z + distance,
      );
      camera.near = Math.max(maxDimension / 1000, 0.1);
      camera.far = Math.max(maxDimension * 20, 5000);
      camera.updateProjectionMatrix();

      controls.target.copy(center);
      controls.update();
    };

    const handleResize = () => {
      if (!containerRef.current) return;

      const width = Math.max(containerRef.current.clientWidth, 1);
      const height = Math.max(containerRef.current.clientHeight, 1);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    const loader = new STLLoader();

    loader.load(
      url,
      (geometry) => {
        if (disposed) return;

        geometry.computeVertexNormals();
        geometry.center();

        const material = new THREE.MeshStandardMaterial({
          color: "#0f172a",
          metalness: 0.08,
          roughness: 0.58,
        });

        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        fitCameraToGeometry(geometry);
        setErrorMessage(null);
        setStatus("ready");
        renderFrame();
      },
      undefined,
      (error: unknown) => {
        if (disposed) return;

        console.error("Failed to load STL preview:", error);
        setErrorMessage(getErrorMessage(error));
        setStatus("error");
      },
    );

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();

      if (mesh) {
        mesh.geometry.dispose();

        if (Array.isArray(mesh.material)) {
          for (const material of mesh.material) {
            material.dispose();
          }
        } else {
          mesh.material.dispose();
        }
      }

      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [url]);

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,#eff6ff,#f8fafc_55%,#ffffff)]">
      <div className="absolute left-4 top-4 z-10 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
        STL preview
      </div>

      <div ref={containerRef} className="h-full w-full" />

      {status !== "ready" ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-lg rounded-[24px] border border-slate-200 bg-white/95 p-6 text-center shadow-sm backdrop-blur">
            <div className="text-sm font-semibold text-slate-900">
              {status === "error" ? "Preview unavailable" : "Loading STL model"}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {status === "error"
                ? errorMessage || "Could not load STL preview."
                : "Preparing the STL model for in-browser viewing."}
            </p>
            <p className="mt-4 text-xs text-slate-400">File: {fileName}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}