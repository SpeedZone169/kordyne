"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

type Props = {
  fileId?: string;
  url: string;
  fileName: string;
  annotations?: StlViewerAnnotation[];
  onCreateAnnotation?: (annotation: PendingStlAnnotation) => void;
};

type Status = "loading" | "ready" | "error";

type VectorPoint = {
  x: number;
  y: number;
  z: number;
};

export type PendingStlAnnotation = {
  kind: "stl_surface_point";
  fileId: string;
  fileName: string;
  label: string;
  point: VectorPoint;
  normal: VectorPoint | null;
  screen: {
    x: number;
    y: number;
  };
  cameraPosition: VectorPoint;
};

export type StlViewerAnnotation = PendingStlAnnotation & {
  id: string;
  messageId?: string;
  messageBody?: string;
  senderName?: string;
  createdAt?: string;
};

type ProjectedPin = {
  x: number;
  y: number;
  visible: boolean;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not load STL preview.";
}

function vectorToPoint(vector: THREE.Vector3): VectorPoint {
  return {
    x: Number(vector.x.toFixed(4)),
    y: Number(vector.y.toFixed(4)),
    z: Number(vector.z.toFixed(4)),
  };
}

function areProjectedPinsEqual(
  left: Record<string, ProjectedPin>,
  right: Record<string, ProjectedPin>,
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) return false;

  return rightKeys.every((key) => {
    const leftPin = left[key];
    const rightPin = right[key];

    return (
      Boolean(leftPin) &&
      leftPin.x === rightPin.x &&
      leftPin.y === rightPin.y &&
      leftPin.visible === rightPin.visible
    );
  });
}

export default function StlPreview({
  fileId,
  url,
  fileName,
  annotations = [],
  onCreateAnnotation,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tagModeRef = useRef(false);
  const annotationsRef = useRef(annotations);
  const onCreateAnnotationRef = useRef(onCreateAnnotation);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tagMode, setTagMode] = useState(false);
  const [projectedPins, setProjectedPins] = useState<Record<string, ProjectedPin>>(
    {},
  );

  useEffect(() => {
    tagModeRef.current = tagMode;
  }, [tagMode]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useEffect(() => {
    onCreateAnnotationRef.current = onCreateAnnotation;
  }, [onCreateAnnotation]);

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

    const projectAnnotations = () => {
      if (!containerRef.current) return;

      const width = Math.max(containerRef.current.clientWidth, 1);
      const height = Math.max(containerRef.current.clientHeight, 1);
      const nextPins: Record<string, ProjectedPin> = {};

      for (const annotation of annotationsRef.current) {
        const point = new THREE.Vector3(
          annotation.point.x,
          annotation.point.y,
          annotation.point.z,
        );
        point.project(camera);

        const visible = point.z >= -1 && point.z <= 1;

        nextPins[annotation.id] = {
          x: Math.round((point.x * 0.5 + 0.5) * width),
          y: Math.round((-point.y * 0.5 + 0.5) * height),
          visible,
        };
      }

      setProjectedPins((currentPins) =>
        areProjectedPinsEqual(currentPins, nextPins) ? currentPins : nextPins,
      );
    };

    const renderFrame = () => {
      if (disposed) return;
      controls.update();
      projectAnnotations();
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
      projectAnnotations();
    };

    window.addEventListener("resize", handleResize);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      if (
        !tagModeRef.current ||
        !fileId ||
        !mesh ||
        !onCreateAnnotationRef.current
      ) {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();

      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      const [hit] = raycaster.intersectObject(mesh, false);

      if (!hit) return;

      const worldNormal = hit.face?.normal.clone() ?? null;

      if (worldNormal) {
        worldNormal.transformDirection(mesh.matrixWorld).normalize();
      }

      onCreateAnnotationRef.current({
        kind: "stl_surface_point",
        fileId,
        fileName,
        label: `Feature ${annotationsRef.current.length + 1}`,
        point: vectorToPoint(hit.point),
        normal: worldNormal ? vectorToPoint(worldNormal) : null,
        screen: {
          x: Number(((event.clientX - rect.left) / rect.width).toFixed(4)),
          y: Number(((event.clientY - rect.top) / rect.height).toFixed(4)),
        },
        cameraPosition: vectorToPoint(camera.position),
      });

      setTagMode(false);
    };

    renderer.domElement.addEventListener("click", handleCanvasClick);

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
        projectAnnotations();
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
      renderer.domElement.removeEventListener("click", handleCanvasClick);
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
  }, [fileId, fileName, url]);

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,#eff6ff,#f8fafc_55%,#ffffff)]">
      <div className="absolute left-4 right-4 top-4 z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
          STL preview
        </div>

        {onCreateAnnotation && fileId ? (
          <button
            type="button"
            onClick={() => setTagMode((current) => !current)}
            disabled={status !== "ready"}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur transition disabled:cursor-not-allowed disabled:opacity-50 ${
              tagMode
                ? "border-cyan-400 bg-cyan-500 text-white"
                : "border-slate-200 bg-white/90 text-slate-800 hover:border-cyan-300 hover:text-cyan-700"
            }`}
          >
            {tagMode ? "Click surface to tag" : "Tag feature"}
          </button>
        ) : null}
      </div>

      <div ref={containerRef} className="h-full w-full" />

      {annotations.map((annotation, index) => {
        const pin = projectedPins[annotation.id];

        if (!pin?.visible) return null;

        return (
          <button
            key={annotation.id}
            type="button"
            title={annotation.messageBody || annotation.label}
            className="absolute z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-cyan-500 text-[11px] font-black text-white shadow-[0_12px_26px_rgba(0,189,222,0.32)]"
            style={{
              left: pin.x,
              top: pin.y,
            }}
          >
            {index + 1}
          </button>
        );
      })}

      {tagMode ? (
        <div className="absolute bottom-4 left-4 right-4 z-10 rounded-[14px] border border-cyan-200 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-sm backdrop-blur">
          Click the model surface you want to discuss. Kordyne will attach that
          feature tag to your next workspace message.
        </div>
      ) : null}

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
