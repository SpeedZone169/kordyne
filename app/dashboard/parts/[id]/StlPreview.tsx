"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

type Props = {
  url: string;
  fileName: string;
};

export default function StlPreview({ url, fileName }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;

    if (!mountEl) {
      return;
    }

    let animationFrameId = 0;
    let disposed = false;

    setStatus("loading");
    setErrorMessage(null);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f8fafc");

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
    camera.position.set(160, 120, 160);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    mountEl.innerHTML = "";
    mountEl.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 3000;

    const ambientLight = new THREE.HemisphereLight("#ffffff", "#cbd5e1", 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight("#ffffff", 1.25);
    keyLight.position.set(120, 180, 140);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight("#ffffff", 0.65);
    fillLight.position.set(-120, 80, -100);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(260, 16, "#cbd5e1", "#e2e8f0");
    grid.position.y = -50;
    scene.add(grid);

    const material = new THREE.MeshStandardMaterial({
      color: "#334155",
      metalness: 0.15,
      roughness: 0.55,
    });

    let mesh: THREE.Mesh | null = null;

    function resizeRenderer() {
      if (!mountEl) return;

      const width = mountEl.clientWidth || 1;
      const height = mountEl.clientHeight || 1;

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function fitCameraToMesh(targetMesh: THREE.Mesh) {
      const geometry = targetMesh.geometry;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      const boundingBox = geometry.boundingBox;
      const boundingSphere = geometry.boundingSphere;

      if (!boundingBox || !boundingSphere) {
        return;
      }

      const center = boundingSphere.center.clone();
      const radius = Math.max(boundingSphere.radius, 1);

      targetMesh.position.sub(center);

      const maxDim = Math.max(
        boundingBox.max.x - boundingBox.min.x,
        boundingBox.max.y - boundingBox.min.y,
        boundingBox.max.z - boundingBox.min.z,
      );

      const fitDistance =
        maxDim / (2 * Math.tan((Math.PI * camera.fov) / 360));

      camera.near = Math.max(radius / 100, 0.1);
      camera.far = Math.max(radius * 20, 5000);
      camera.position.set(fitDistance * 1.1, fitDistance * 0.85, fitDistance * 1.15);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      controls.target.set(0, 0, 0);
      controls.update();

      grid.position.y = -(boundingBox.max.y - boundingBox.min.y) / 2 - radius * 0.08;
    }

    function animate() {
      animationFrameId = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    resizeRenderer();

    const resizeObserver = new ResizeObserver(() => {
      resizeRenderer();
    });

    resizeObserver.observe(mountEl);

    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        if (disposed) return;

        geometry.computeVertexNormals();
        geometry.center();

        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        fitCameraToMesh(mesh);

        setStatus("ready");
      },
      undefined,
      (error) => {
        if (disposed) return;

        console.error("Failed to load STL preview:", error);
        setStatus("error");
        setErrorMessage("STL preview could not be loaded.");
      },
    );

    animate();

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      window.cancelAnimationFrame(animationFrameId);
      controls.dispose();

      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
      }

      material.dispose();
      grid.geometry.dispose();
      if (Array.isArray(grid.material)) {
        grid.material.forEach((item) => item.dispose());
      } else {
        grid.material.dispose();
      }

      renderer.dispose();

      if (renderer.domElement.parentNode === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, [url]);

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,#eff6ff,#f8fafc_55%,#ffffff)]">
      <div className="absolute left-4 top-4 z-10 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
        STL preview · rotate, zoom and inspect
      </div>

      <div
        ref={mountRef}
        className="h-full w-full"
        aria-label={`3D STL preview for ${fileName}`}
      />

      {status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/45 backdrop-blur-[1px]">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
            Loading STL preview...
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 p-6 backdrop-blur-[1px]">
          <div className="max-w-md rounded-[24px] border border-rose-200 bg-white p-6 text-center shadow-sm">
            <div className="text-sm font-semibold text-rose-700">
              Preview unavailable
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {errorMessage || "This STL file could not be rendered in the browser."}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}