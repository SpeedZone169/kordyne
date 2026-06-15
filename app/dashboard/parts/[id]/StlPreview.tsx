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
  pendingAnnotation?: StlAnnotationDraft | null;
  selectedAnnotationId?: string | null;
  focusRequest?: {
    annotationId: string;
    nonce: number;
  } | null;
  onCreateAnnotation?: (annotation: StlAnnotationDraft) => void;
  onCancelPendingAnnotation?: () => void;
  onSelectAnnotation?: (annotation: StlViewerAnnotation) => void;
};

type Status = "loading" | "ready" | "error";

export type VectorPoint = {
  x: number;
  y: number;
  z: number;
};

export type StlAnnotationCamera = {
  position: VectorPoint;
  target: VectorPoint | null;
  zoom: number | null;
  distance: number | null;
};

export type StlAnnotationDraft = {
  kind: "stl_surface_point";
  fileId: string;
  fileName: string;
  position: VectorPoint;
  normal: VectorPoint | null;
  camera: StlAnnotationCamera | null;
  screen: {
    x: number;
    y: number;
  };
};

export type StlViewerAnnotation = {
  id: string;
  fileId: string;
  fileName: string;
  title: string;
  status: "open" | "in_review" | "resolved" | "reopened";
  severity: "info" | "question" | "issue" | "critical";
  category: string;
  position: VectorPoint;
  normal: VectorPoint | null;
  camera: StlAnnotationCamera | null;
  creatorName: string;
  assigneeName: string | null;
  createdAt: string;
  latestMessagePreview: string | null;
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
    x: Number(vector.x.toFixed(5)),
    y: Number(vector.y.toFixed(5)),
    z: Number(vector.z.toFixed(5)),
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

function getMarkerClass(annotation: StlViewerAnnotation, isSelected: boolean) {
  if (annotation.status === "resolved") {
    return isSelected
      ? "border-slate-900 bg-slate-500 text-white"
      : "border-white bg-slate-400 text-white opacity-70";
  }

  if (annotation.severity === "critical") {
    return isSelected
      ? "border-slate-950 bg-rose-600 text-white"
      : "border-white bg-rose-500 text-white";
  }

  if (annotation.severity === "issue") {
    return isSelected
      ? "border-slate-950 bg-amber-500 text-slate-950"
      : "border-white bg-amber-400 text-slate-950";
  }

  if (annotation.severity === "question") {
    return isSelected
      ? "border-slate-950 bg-violet-600 text-white"
      : "border-white bg-violet-500 text-white";
  }

  return isSelected
    ? "border-slate-950 bg-cyan-600 text-white"
    : "border-white bg-cyan-500 text-white";
}

function focusCameraOnAnnotation(
  annotation: StlViewerAnnotation,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
) {
  const target = new THREE.Vector3(
    annotation.position.x,
    annotation.position.y,
    annotation.position.z,
  );

  if (annotation.camera?.position) {
    camera.position.set(
      annotation.camera.position.x,
      annotation.camera.position.y,
      annotation.camera.position.z,
    );
    const savedTarget = annotation.camera.target;

    controls.target.set(
      savedTarget?.x ?? target.x,
      savedTarget?.y ?? target.y,
      savedTarget?.z ?? target.z,
    );
  } else {
    const offset = new THREE.Vector3(42, 32, 42);
    camera.position.copy(target.clone().add(offset));
    controls.target.copy(target);
  }

  camera.updateProjectionMatrix();
  controls.update();
}

export default function StlPreview({
  fileId,
  url,
  fileName,
  annotations = [],
  pendingAnnotation = null,
  selectedAnnotationId = null,
  focusRequest = null,
  onCreateAnnotation,
  onCancelPendingAnnotation,
  onSelectAnnotation,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const tagModeRef = useRef(false);
  const annotationsRef = useRef(annotations);
  const pendingAnnotationRef = useRef(pendingAnnotation);
  const onCreateAnnotationRef = useRef(onCreateAnnotation);
  const onSelectAnnotationRef = useRef(onSelectAnnotation);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [projectedPins, setProjectedPins] = useState<Record<string, ProjectedPin>>(
    {},
  );
  const [projectedDraftPin, setProjectedDraftPin] = useState<ProjectedPin | null>(
    null,
  );

  useEffect(() => {
    tagModeRef.current = annotationMode;
  }, [annotationMode]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useEffect(() => {
    pendingAnnotationRef.current = pendingAnnotation;
  }, [pendingAnnotation]);

  useEffect(() => {
    onCreateAnnotationRef.current = onCreateAnnotation;
  }, [onCreateAnnotation]);

  useEffect(() => {
    onSelectAnnotationRef.current = onSelectAnnotation;
  }, [onSelectAnnotation]);

  useEffect(() => {
    if (!focusRequest) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const annotation = annotations.find(
      (item) => item.id === focusRequest.annotationId,
    );

    if (!camera || !controls || !annotation) return;
    focusCameraOnAnnotation(annotation, camera, controls);
  }, [annotations, focusRequest]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setAnnotationMode(false);
      onCancelPendingAnnotation?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancelPendingAnnotation]);

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
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
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
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight("#ffffff", 1.25);
    const directionalLight = new THREE.DirectionalLight("#ffffff", 1.15);
    directionalLight.position.set(120, 180, 140);

    const directionalLightTwo = new THREE.DirectionalLight("#ffffff", 0.6);
    directionalLightTwo.position.set(-120, 80, -100);

    scene.add(ambientLight, directionalLight, directionalLightTwo);

    let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null = null;

    const projectPoint = (pointValue: VectorPoint) => {
      if (!containerRef.current) return null;

      const width = Math.max(containerRef.current.clientWidth, 1);
      const height = Math.max(containerRef.current.clientHeight, 1);
      const point = new THREE.Vector3(pointValue.x, pointValue.y, pointValue.z);

      point.project(camera);

      return {
        x: Math.round((point.x * 0.5 + 0.5) * width),
        y: Math.round((-point.y * 0.5 + 0.5) * height),
        visible: point.z >= -1 && point.z <= 1,
      };
    };

    const projectAnnotations = () => {
      const nextPins: Record<string, ProjectedPin> = {};

      for (const annotation of annotationsRef.current) {
        const pin = projectPoint(annotation.position);
        if (pin) nextPins[annotation.id] = pin;
      }

      setProjectedPins((currentPins) =>
        areProjectedPinsEqual(currentPins, nextPins) ? currentPins : nextPins,
      );

      setProjectedDraftPin((currentPin) => {
        const draftAnnotation = pendingAnnotationRef.current;
        if (!draftAnnotation) return null;
        const nextPin = projectPoint(draftAnnotation.position);
        if (!nextPin) return null;

        if (
          currentPin &&
          currentPin.x === nextPin.x &&
          currentPin.y === nextPin.y &&
          currentPin.visible === nextPin.visible
        ) {
          return currentPin;
        }

        return nextPin;
      });
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

      const cameraTarget = controls.target.clone();
      const distance = camera.position.distanceTo(cameraTarget);

      onCreateAnnotationRef.current({
        kind: "stl_surface_point",
        fileId,
        fileName,
        position: vectorToPoint(hit.point),
        normal: worldNormal ? vectorToPoint(worldNormal) : null,
        screen: {
          x: Number(((event.clientX - rect.left) / rect.width).toFixed(5)),
          y: Number(((event.clientY - rect.top) / rect.height).toFixed(5)),
        },
        camera: {
          position: vectorToPoint(camera.position),
          target: vectorToPoint(cameraTarget),
          zoom: Number(camera.zoom.toFixed(5)),
          distance: Number(distance.toFixed(5)),
        },
      });

      setAnnotationMode(false);
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
      cameraRef.current = null;
      controlsRef.current = null;

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [fileId, fileName, url]);

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,#eff6ff,#f8fafc_55%,#ffffff)]">
      <div className="absolute left-4 right-4 top-4 z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
          STL review viewer
        </div>

        {onCreateAnnotation && fileId ? (
          <button
            type="button"
            onClick={() => setAnnotationMode((current) => !current)}
            disabled={status !== "ready"}
            className={`rounded-full border px-3 py-1.5 text-xs font-black shadow-sm backdrop-blur transition disabled:cursor-not-allowed disabled:opacity-50 ${
              annotationMode
                ? "border-cyan-400 bg-cyan-500 text-white"
                : "border-slate-200 bg-white/90 text-slate-800 hover:border-cyan-300 hover:text-cyan-700"
            }`}
          >
            {annotationMode ? "Click model surface" : "Add annotation"}
          </button>
        ) : null}
      </div>

      <div
        ref={containerRef}
        className={`h-full w-full ${annotationMode ? "cursor-crosshair" : ""}`}
      />

      {annotations.map((annotation, index) => {
        const pin = projectedPins[annotation.id];

        if (!pin?.visible) return null;

        const isSelected = annotation.id === selectedAnnotationId;

        return (
          <button
            key={annotation.id}
            type="button"
            title={`${annotation.title} - ${annotation.status}`}
            onClick={() => onSelectAnnotationRef.current?.(annotation)}
            className={`group absolute z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[11px] font-black shadow-[0_14px_28px_rgba(15,23,42,0.22)] transition hover:scale-110 ${getMarkerClass(
              annotation,
              isSelected,
            )} ${isSelected ? "ring-4 ring-cyan-200" : ""}`}
            style={{
              left: pin.x,
              top: pin.y,
            }}
          >
            {index + 1}
            <span className="pointer-events-none absolute left-1/2 top-9 hidden w-56 -translate-x-1/2 rounded-[12px] border border-slate-200 bg-white p-3 text-left text-xs font-semibold text-slate-700 shadow-xl group-hover:block">
              <span className="block text-sm font-black text-slate-950">
                {annotation.title}
              </span>
              <span className="mt-1 block text-slate-500">
                {annotation.status.replace("_", " ")} - {annotation.severity}
              </span>
            </span>
          </button>
        );
      })}

      {pendingAnnotation && projectedDraftPin?.visible ? (
        <div
          className="absolute z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-slate-950 text-[10px] font-black uppercase text-white shadow-[0_16px_32px_rgba(15,23,42,0.28)] ring-4 ring-cyan-200"
          style={{
            left: projectedDraftPin.x,
            top: projectedDraftPin.y,
          }}
        >
          New
        </div>
      ) : null}

      {annotationMode ? (
        <div className="absolute bottom-4 left-4 right-4 z-10 rounded-[14px] border border-cyan-200 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-sm backdrop-blur">
          Click the STL mesh surface to place a revision-scoped annotation.
          Press Escape to cancel.
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
                : "Preparing the STL model for in-browser review."}
            </p>
            <p className="mt-4 text-xs text-slate-400">File: {fileName}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
