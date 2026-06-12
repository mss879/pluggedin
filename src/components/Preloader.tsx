"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface PreloadResult {
  videoUrl: string;
  logoUrl: string;
}

interface PreloaderProps {
  onComplete: (assets: PreloadResult) => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const preloaderRef = useRef<HTMLDivElement>(null);
  const downloadPctRef = useRef(0);
  
  // UI Refs for high-performance direct DOM manipulation (bypasses 60fps React re-renders)
  const percentTextRef = useRef<HTMLSpanElement>(null);
  const cellsContainerRef = useRef<HTMLDivElement>(null);
  
  // States for diagnostic console HUD (slow interval updates, safe for React state)
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "// BOOTING PLUGGEDIN ARCHITECTURE...",
  ]);
  const [stats, setStats] = useState({
    temp: "37.2°C",
    ping: "12ms",
    link: "SECURE",
    fps: "60"
  });

  const preloadedUrls = useRef<PreloadResult>({
    videoUrl: "/Products_drifting_in_frame_202606111905.mp4",
    logoUrl: "/logo.webp",
  });

  // --- 1. Background Asset Preloading ---
  useEffect(() => {
    let active = true;
    let videoReceived = 0;
    let logoReceived = 0;
    let videoLength = 12343695;
    let logoLength = 514345;

    const updateProgress = () => {
      const totalContentLength = videoLength + logoLength;
      const totalReceived = videoReceived + logoReceived;
      downloadPctRef.current = Math.min(totalReceived / totalContentLength, 0.99);
    };

    const downloadAsset = async (
      url: string,
      mimeType: string,
      onProgress: (bytes: number) => void
    ): Promise<string> => {
      const response = await fetch(url);
      if (!response.body) {
        throw new Error(`Failed to fetch ${url}: no response body`);
      }

      const contentLengthHeader = response.headers.get("Content-Length");
      const contentLength = contentLengthHeader ? +contentLengthHeader : 0;
      if (contentLength > 0) {
        if (url.includes(".mp4")) {
          videoLength = contentLength;
        } else if (url.includes("logo.png")) {
          logoLength = contentLength;
        }
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (active) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          onProgress(received);
        }
      }

      if (!active) {
        throw new Error(`Download of ${url} aborted`);
      }

      const blob = new Blob(chunks as BlobPart[], { type: mimeType });
      return URL.createObjectURL(blob);
    };

    const preload = async () => {
      try {
        const [videoBlobUrl, logoBlobUrl] = await Promise.all([
          downloadAsset(
            "/Products_drifting_in_frame_202606111905.mp4",
            "video/mp4",
            (bytes) => {
              videoReceived = bytes;
              updateProgress();
            }
          ),
          downloadAsset(
            "/logo.webp",
            "image/webp",
            (bytes) => {
              logoReceived = bytes;
              updateProgress();
            }
          ),
        ]);

        if (active) {
          downloadPctRef.current = 1.0;
          preloadedUrls.current = {
            videoUrl: videoBlobUrl,
            logoUrl: logoBlobUrl,
          };
        }
      } catch (err) {
        console.warn("Preload failed, continuing with fallback paths:", err);
        if (active) {
          downloadPctRef.current = 1.0;
        }
      }
    };

    preload();

    return () => {
      active = false;
    };
  }, []);

  // --- 2. Diagnostic Log Automation ---
  useEffect(() => {
    const logPool = [
      "COMPILING WEBGL GRAPHICS ENVIRONMENT...",
      "STABILIZING VOLTAGE DYNAMICS [120V / 60HZ]...",
      "RESOLVING AUDIO LATENCY SCHEMAS...",
      "SYNCHRONIZING DESK LIGHT EMISSION...",
      "DOWNLOADING SECURE CONTENT BUNDLES...",
      "POLISHING OBSIDIAN GLASS SURFACES...",
      "ESTABLISHING SECURE GATEWAY TUNNEL...",
      "ENCRYPTING CACHED PAYLOAD CHANNELS...",
      "GRID STABILITY VERIFIED [99.8%]...",
      "POWER CORE ARMED. INITIATING LINK..."
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      const currentPct = downloadPctRef.current * 100;
      if (currentPct < 100 && currentLogIndex < logPool.length) {
        const timestamp = new Date().toLocaleTimeString().split(" ")[0];
        setTerminalLogs(prev => [
          ...prev, 
          `[${timestamp}] ${logPool[currentLogIndex]}`
        ].slice(-6)); // Keep only latest 6 logs for cleaner layout
        currentLogIndex++;
      }
    }, 280);

    return () => clearInterval(interval);
  }, []);

  // --- 3. Dynamic Stats Fluctuation ---
  useEffect(() => {
    const statsInterval = setInterval(() => {
      setStats({
        temp: (37.2 + Math.random() * 1.5).toFixed(1) + "°C",
        ping: (10 + Math.floor(Math.random() * 8)) + "ms",
        link: downloadPctRef.current >= 0.99 ? "ESTABLISHED" : "CONNECTING",
        fps: (58 + Math.floor(Math.random() * 5)).toString()
      });
    }, 400);
    return () => clearInterval(statsInterval);
  }, []);

  // --- 4. Three.js WebGL Scene & Animation Loop ---
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    // --- Scene Setup (Light clean luxury room space) ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfbfbfe); // elegant soft off-white
    scene.fog = new THREE.FogExp2(0xfbfbfe, 0.08);

    // Initial cinematic camera placement (low side angle for depth)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(-2, 1.2, 5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      precision: "mediump"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // --- Helper: Draw Rounded Rect Shape ---
    const drawRoundedRect = (w: number, h: number, r: number) => {
      const shape = new THREE.Shape();
      const x = -w / 2;
      const y = -h / 2;
      shape.moveTo(x, y + r);
      shape.lineTo(x, y + h - r);
      shape.quadraticCurveTo(x, y + h, x + r, y + h);
      shape.lineTo(x + w - r, y + h);
      shape.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
      shape.lineTo(x + w, y + r);
      shape.quadraticCurveTo(x + w, y, x + w - r, y);
      shape.lineTo(x + r, y);
      shape.quadraticCurveTo(x, y, x, y + r);
      return shape;
    };

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75); // bright fill
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xc084fc, 2.0); // purple accent light
    dirLight1.position.set(-5, 4, 3);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.8); // white key light
    dirLight2.position.set(4, 5, 6);
    dirLight2.castShadow = true;
    // Mobile Performance: Lower shadow map resolution on mobile
    dirLight2.shadow.mapSize.width = isMobile ? 512 : 1024;
    dirLight2.shadow.mapSize.height = isMobile ? 512 : 1024;
    dirLight2.shadow.bias = -0.0005;
    scene.add(dirLight2);

    // Point Light to simulate glowing connection
    const sparkLight = new THREE.PointLight(0x9674eb, 0, 15);
    sparkLight.position.set(1.95, 0.5, 0);
    scene.add(sparkLight);

    // --- 3D Wall Receptacle (US Double Outlet) ---
    const socketGroup = new THREE.Group();
    socketGroup.position.set(2.2, 0, 0);

    // Glossy White Porcelain plate material
    const plateMat = new THREE.MeshPhysicalMaterial({
      color: 0xfcfcfd, // porcelain white
      roughness: 0.1,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.9,
    });
    const plateShape = drawRoundedRect(1.8, 2.4, 0.15);
    const plateGeom = new THREE.ExtrudeGeometry(plateShape, {
      depth: 0.45,
      bevelEnabled: true,
      bevelSegments: 2, // Optimized from 4
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    });
    const plateMesh = new THREE.Mesh(plateGeom, plateMat);
    plateMesh.rotation.y = Math.PI / 2;
    plateMesh.position.set(-0.28, 0, 0);
    plateMesh.receiveShadow = true;
    socketGroup.add(plateMesh);

    // Satin silver outlet inserts
    const baseMat = new THREE.MeshPhysicalMaterial({
      color: 0xf4f4f6,
      roughness: 0.22,
      metalness: 0.4,
      clearcoat: 0.2,
    });
    const receptacleShape = drawRoundedRect(0.75, 0.75, 0.25);
    const receptacleGeom = new THREE.ExtrudeGeometry(receptacleShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 2, // Optimized from 3
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    });

    const topOutletBase = new THREE.Mesh(receptacleGeom, baseMat);
    topOutletBase.rotation.y = Math.PI / 2;
    topOutletBase.position.set(-0.2, 0.5, 0);
    topOutletBase.receiveShadow = true;
    socketGroup.add(topOutletBase);

    const bottomOutletBase = new THREE.Mesh(receptacleGeom, baseMat);
    bottomOutletBase.rotation.y = Math.PI / 2;
    bottomOutletBase.position.set(-0.2, -0.5, 0);
    bottomOutletBase.receiveShadow = true;
    socketGroup.add(bottomOutletBase);

    // Outlets Slot Geometries (Polished Gold contacts)
    const slotHotGeom = new THREE.BoxGeometry(0.05, 0.22, 0.05);
    const prongMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      metalness: 1.0,
      roughness: 0.12,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
    });
    const slotNeutralGeom = new THREE.BoxGeometry(0.05, 0.28, 0.05);
    const groundGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8); // Optimized from 12 segments

    const addSlots = (yOffset: number) => {
      const slotHot = new THREE.Mesh(slotHotGeom, prongMat);
      slotHot.position.set(1.995, yOffset + 0.1, -0.18);
      scene.add(slotHot);

      const slotNeutral = new THREE.Mesh(slotNeutralGeom, prongMat);
      slotNeutral.position.set(1.995, yOffset + 0.1, 0.18);
      scene.add(slotNeutral);

      const ground = new THREE.Mesh(groundGeom, prongMat);
      ground.rotation.z = Math.PI / 2;
      ground.position.set(1.995, yOffset - 0.18, 0);
      scene.add(ground);
    };

    addSlots(0.5);
    addSlots(-0.5);

    scene.add(socketGroup);

    // --- 3D Plug ---
    const plugGroup = new THREE.Group();

    // Polished white ceramic plug body
    const plugBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbfbfd, // porcelain white
      roughness: 0.15,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.8,
    });
    const plugBodyShape = drawRoundedRect(1.1, 0.8, 0.12);
    const plugBodyGeom = new THREE.ExtrudeGeometry(plugBodyShape, {
      depth: 1.1,
      bevelEnabled: true,
      bevelSegments: 2, // Optimized from 4
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    });
    const plugBodyMesh = new THREE.Mesh(plugBodyGeom, plugBodyMat);
    plugBodyMesh.rotation.y = Math.PI / 2;
    plugBodyMesh.position.set(-0.55, 0, 0);
    plugBodyMesh.castShadow = true;
    plugBodyMesh.receiveShadow = true;
    plugGroup.add(plugBodyMesh);

    // Glowing core cylinder inside (kept for code compatibility, but rendering is disabled for solid plug)
    const coreGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.65, 8); // Optimized from 16
    coreGeom.rotateZ(Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x9674eb,
    });

    // Cable base collar (polished brass transition)
    const baseTransitionGeom = new THREE.CylinderGeometry(0.18, 0.23, 0.2, 12); // Optimized from 16
    baseTransitionGeom.rotateZ(Math.PI / 2);
    const baseTransitionMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      roughness: 0.15,
      metalness: 0.95,
    });
    const baseTransition = new THREE.Mesh(baseTransitionGeom, baseTransitionMat);
    baseTransition.position.set(-0.65, 0, 0);
    baseTransition.castShadow = true;
    plugGroup.add(baseTransition);

    // Gold Prongs
    const prongLength = 0.55;
    const prongGeom = new THREE.BoxGeometry(prongLength, 0.18, 0.04);

    const prongTop = new THREE.Mesh(prongGeom, prongMat);
    prongTop.position.set(0.805, 0.1, -0.18);
    prongTop.castShadow = true;
    plugGroup.add(prongTop);

    const prongBottom = new THREE.Mesh(prongGeom, prongMat);
    prongBottom.position.set(0.805, 0.1, 0.18);
    prongBottom.castShadow = true;
    plugGroup.add(prongBottom);

    scene.add(plugGroup);

    // --- Interactive Mouse-Responsive Ambient Dust Field ---
    const dustCount = 80; // Optimized from 100
    const dustGeom = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 15;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
    }
    dustGeom.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x8b5cf6,
      size: 0.06,
      transparent: true,
      opacity: 0.3,
    });
    const dustParticles = new THREE.Points(dustGeom, dustMat);
    scene.add(dustParticles);

    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // --- Torus Connection Shockwave ---
    const torusGeom = new THREE.TorusGeometry(0.1, 0.015, 6, 24); // Optimized from 8, 48
    const torusMat = new THREE.MeshBasicMaterial({
      color: 0x9674eb,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const shockwave = new THREE.Mesh(torusGeom, torusMat);
    shockwave.rotation.y = Math.PI / 2;
    shockwave.position.set(1.95, 0.5, 0);
    scene.add(shockwave);

    // --- Lightning Electric Arcs ---
    const arcLines: THREE.Line[] = [];
    const arcMat = new THREE.LineBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0,
    });
    for (let i = 0; i < 3; i++) {
      const points = [];
      points.push(new THREE.Vector3(1.95, 0.5, 0));
      for (let j = 1; j <= 4; j++) {
        points.push(new THREE.Vector3(
          1.95 - j * 0.25,
          0.5 + (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4
        ));
      }
      const arcGeom = new THREE.BufferGeometry().setFromPoints(points);
      const arcLine = new THREE.Line(arcGeom, arcMat);
      arcLine.visible = false;
      scene.add(arcLine);
      arcLines.push(arcLine);
    }

    // --- Performance Optimization: Pre-Allocate Cable Material (Avoid compiling shaders on every frame) ---
    const tubeMat = new THREE.MeshPhysicalMaterial({
      color: 0xf4f4f7, // clean white cord
      roughness: 0.45,
      metalness: 0.1,
      emissive: new THREE.Color(0x9674eb), // emissive purple glow
      emissiveIntensity: 1.0,
    });
    const pulseColor = new THREE.Color();

    let cableMesh: THREE.Mesh | null = null;
    const updateCable = (plugX: number, pulseIntensity: number, progressVal: number) => {
      const rearPlugX = plugX - 0.55;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-8, -3.5, 0),
        new THREE.Vector3(-4, -4.2, 0.3),
        new THREE.Vector3(rearPlugX - 1.2, -0.6, 0.1),
        new THREE.Vector3(rearPlugX - 0.1, 0.5, 0),
      ]);

      // Optimized geometry segments (48, 8 instead of 64, 12 - reduces faces by ~50%)
      const newGeom = new THREE.TubeGeometry(curve, 48, 0.08, 8, false);

      if (cableMesh) {
        cableMesh.geometry.dispose(); // free GPU buffers immediately
        cableMesh.geometry = newGeom; // swap geometry, reusing static material/mesh
      } else {
        cableMesh = new THREE.Mesh(newGeom, tubeMat);
        cableMesh.castShadow = true;
        cableMesh.receiveShadow = true;
        scene.add(cableMesh);
      }

      // Update material uniforms in-place
      tubeMat.emissiveIntensity = pulseIntensity;
      pulseColor.setHSL(0.74 + progressVal * 0.02, 1.0, 0.55);
      tubeMat.emissive.copy(pulseColor);
    };

    // --- Electric Spark Particles ---
    const sparkCount = 45; // Optimized from 60
    const sparkGeom = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkVels: number[] = [];

    for (let i = 0; i < sparkCount; i++) {
      sparkPos[i * 3] = 1.95;
      sparkPos[i * 3 + 1] = 0.5 + (Math.random() - 0.5) * 0.4;
      sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6.5;
      sparkVels.push(
        -1.5 - Math.random() * 3.5, // Push back
        Math.sin(angle) * speed,
        Math.cos(angle) * speed
      );
    }

    const sparkPosOrig = new Float32Array(sparkPos);
    sparkGeom.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x9674eb, // purple sparks
      size: 0.16,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const sparkParticles = new THREE.Points(sparkGeom, sparkMat);
    scene.add(sparkParticles);

    // --- Animation Loop ---
    let animFrameId: number;
    const startTime = Date.now();
    const minPlugDuration = 2200; // minimum travel duration
    let plugged = false;
    let virtualT = 0.0;
    let lastTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const elapsed = now - startTime;
      const timeT = Math.min(elapsed / minPlugDuration, 1.0);
      const downloadProgress = downloadPctRef.current;
      const progress = Math.min(timeT, downloadProgress);

      const pctVal = Math.floor(progress * 100);

      // --- Performance Optimization: Direct DOM Updates (Bypasses React virtual diffing overhead at 60fps) ---
      if (percentTextRef.current) {
        percentTextRef.current.textContent = pctVal.toString();
      }

      if (cellsContainerRef.current) {
        const cells = cellsContainerRef.current.children;
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i] as HTMLDivElement;
          const active = pctVal >= (i + 1) * 10;
          if (active) {
            if (!cell.classList.contains("bg-gradient-to-t")) {
              cell.className = "w-4 h-2 rounded-[2px] transition-all duration-300 bg-gradient-to-t from-purple-500 to-purple-600 shadow-[0_0_8px_rgba(168,85,247,0.35)]";
              cell.style.backgroundColor = "";
            }
          } else {
            if (!cell.classList.contains("bg-zinc-200")) {
              cell.className = "w-4 h-2 rounded-[2px] transition-all duration-300 bg-zinc-200 border border-zinc-200/30";
              cell.style.backgroundColor = "#e4e4e7";
            }
          }
        }
      }

      // 1. Cinematic camera path interpolation (Portrait mobile/tablet responsive scaling)
      const aspect = camera.aspect;
      const startCamX = aspect < 1 ? -3.0 : -2.2;
      const targetCamX = 0.0;
      const startCamY = aspect < 1 ? 1.8 : 1.4;
      const targetCamY = 0.0;
      const startCamZ = aspect < 1 ? 8.2 : 5.2;
      const targetCamZ = aspect < 1 ? 12.0 : 8.0;

      const easeCam = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      camera.position.x = startCamX + (targetCamX - startCamX) * easeCam;
      camera.position.y = startCamY + (targetCamY - startCamY) * easeCam;
      camera.position.z = startCamZ + (targetCamZ - startCamZ) * easeCam;
      camera.lookAt(new THREE.Vector3(progress * 0.9, 0.2, 0));

      // 2. Animate glowing pulse inside core and fiber cable (slow, smooth breathing - no fast blinking)
      const pulseSpeed = 3 + progress * 2;
      const cablePulse = (1.2 + Math.sin(now * 0.001 * pulseSpeed) * 0.35) * (0.8 + progress * 1.5);
      coreMat.color.setHSL(0.74 + progress * 0.02, 1.0, 0.45 + Math.sin(now * 0.002) * 0.05);

      // 3. Fall and rotate interactive dust particles
      dustParticles.rotation.y = mouseX * 0.12;
      dustParticles.rotation.x = mouseY * 0.12;
      const dustArr = dustGeom.attributes.position.array as Float32Array;
      for (let i = 0; i < dustCount; i++) {
        dustArr[i * 3 + 1] -= 0.004; // fall slowly
        if (dustArr[i * 3 + 1] < -4) {
          dustArr[i * 3 + 1] = 4; // reset at top
        }
      }
      dustGeom.attributes.position.needsUpdate = true;

      const startX = -6.0;
      const targetX = 1.37; // socket contact point
      let currentX;

      if (progress < 1.0) {
        const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        currentX = startX + (targetX - startX) * ease;
        sparkLight.intensity = 0;
        sparkMat.opacity = 0;
        shockwave.visible = false;
      } else {
        currentX = targetX;
        if (!plugged) {
          plugged = true;
          sparkLight.intensity = 24;
          sparkMat.opacity = 1.0;
          shockwave.visible = true;
        }
      }

      plugGroup.position.set(currentX, 0.5, 0);
      updateCable(currentX, cablePulse, progress);

      // Once connection is locked (progress == 100%), play high-end visual thuds & fades
      if (plugged) {
        virtualT += delta;

        // Shockwave expansion
        if (virtualT < 0.65) {
          shockwave.scale.setScalar(1 + virtualT * 42);
          torusMat.opacity = Math.max(0, 1.0 - (virtualT / 0.65));
        } else {
          shockwave.visible = false;
        }

        // Lightning arc flickering
        if (virtualT < 0.38) {
          arcMat.opacity = (1.0 - (virtualT / 0.38)) * (Math.random() * 0.9 + 0.1);
          arcLines.forEach(line => {
            line.visible = Math.random() > 0.45;
            if (line.visible) {
              const pts = [new THREE.Vector3(1.95, 0.5, 0)];
              for (let j = 1; j <= 4; j++) {
                pts.push(new THREE.Vector3(
                  1.95 - j * 0.22,
                  0.5 + (Math.random() - 0.5) * 0.55,
                  (Math.random() - 0.5) * 0.55
                ));
              }
              line.geometry.setFromPoints(pts);
              line.geometry.attributes.position.needsUpdate = true;
            }
          });
        } else {
          arcLines.forEach(line => line.visible = false);
        }

        // Camera impact thud recoil shake (dampened)
        if (virtualT < 0.35) {
          const shakeProgress = virtualT / 0.35;
          const shakeVal = 0.08 * Math.pow(1.0 - shakeProgress, 2.2);
          camera.position.x += (Math.random() - 0.5) * shakeVal;
          camera.position.y += (Math.random() - 0.5) * shakeVal;
        }

        // Sparks trajectory explosion
        if (virtualT < 0.9) {
          const sparkT = virtualT / 0.9;
          sparkLight.intensity = 45 * Math.pow(1.0 - sparkT, 2);
          sparkMat.opacity = 1.0 - sparkT;

          const posAttr = sparkGeom.getAttribute("position") as THREE.BufferAttribute;
          for (let i = 0; i < sparkCount; i++) {
            posAttr.setX(i, sparkPosOrig[i * 3] + sparkVels[i * 3] * sparkT * 2.3);
            posAttr.setY(i, sparkPosOrig[i * 3 + 1] + sparkVels[i * 3 + 1] * sparkT * 2.3 - 1.2 * sparkT * sparkT);
            posAttr.setZ(i, sparkPosOrig[i * 3 + 2] + sparkVels[i * 3 + 2] * sparkT * 2.3);
          }
          posAttr.needsUpdate = true;
        } else {
          sparkLight.intensity = 0;
          sparkMat.opacity = 0;
        }

        // High-end screen fade out
        if (virtualT >= 0.8) {
          const fadeT = Math.min((virtualT - 0.8) / 0.55, 1.0); // 550ms fade
          if (preloaderRef.current) {
            preloaderRef.current.style.opacity = (1.0 - fadeT).toString();
          }
        }
      }

      renderer.render(scene, camera);

      if (virtualT < 1.35) {
        animFrameId = requestAnimationFrame(animate);
      } else {
        onComplete(preloadedUrls.current);
      }
    };

    animFrameId = requestAnimationFrame(animate);

    // --- Window Resize ---
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      plateGeom.dispose();
      plateMat.dispose();
      receptacleGeom.dispose();
      baseMat.dispose();
      slotHotGeom.dispose();
      prongMat.dispose();
      slotNeutralGeom.dispose();
      groundGeom.dispose();
      plugBodyGeom.dispose();
      plugBodyMat.dispose();
      coreGeom.dispose();
      coreMat.dispose();
      baseTransitionGeom.dispose();
      baseTransitionMat.dispose();
      dustGeom.dispose();
      dustMat.dispose();
      torusGeom.dispose();
      torusMat.dispose();
      arcMat.dispose();
      arcLines.forEach(l => l.geometry.dispose());
      sparkGeom.dispose();
      sparkMat.dispose();
      tubeMat.dispose(); // Dispose pre-allocated cable material

      if (cableMesh) {
        scene.remove(cableMesh);
        cableMesh.geometry.dispose();
      }

      renderer.dispose();
    };
  }, [onComplete]);

  return (
    <div
      ref={preloaderRef}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-[#fbfbfe] select-none text-zinc-800 font-mono transition-opacity duration-[550ms] ease-in-out"
      style={{ transition: "none" }}
    >
      {/* 3D WebGL Canvas background */}
      <div ref={containerRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* Futuristic Dashboard Header */}
      <div className="pt-8 px-6 sm:px-12 flex justify-between items-start w-full relative z-10">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-[0.3em] text-purple-600 uppercase">
            System Initialization
          </span>
          <span className="text-[8px] tracking-[0.15em] text-zinc-400 font-semibold">
            CORE ENGINE VERSION 2.0.26
          </span>
        </div>
        
        {/* Shifting Diagnostic Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-right text-[9px] text-zinc-400 leading-normal">
          <div>TEMP: <span className="text-zinc-800 font-bold">{stats.temp}</span></div>
          <div>PING: <span className="text-zinc-800 font-bold">{stats.ping}</span></div>
          <div>LINK: <span className="text-purple-600 font-bold">{stats.link}</span></div>
          <div>FPS: <span className="text-zinc-800 font-bold">{stats.fps}</span></div>
        </div>
      </div>

      {/* Futuristic HUD Sidebar / Boot Log */}
      <div className="absolute left-6 sm:left-12 top-[22%] w-[240px] sm:w-[320px] max-h-[140px] z-10 pointer-events-none flex flex-col gap-1 text-[9px] text-zinc-500 overflow-hidden bg-white/45 backdrop-blur-md p-4 rounded-xl border border-zinc-200/50 shadow-xl shadow-zinc-200/25">
        <div className="font-bold text-purple-600 border-b border-zinc-200/60 pb-1 mb-1.5 tracking-wider">
          DIAGNOSTIC PROCESS MONITOR:
        </div>
        {terminalLogs.map((log, index) => (
          <div key={index} className="truncate tracking-wide font-medium text-zinc-600">
            {log}
          </div>
        ))}
      </div>

      {/* Cybernetic Progress Indicator at the Bottom */}
      <div className="pb-12 px-6 sm:px-12 flex flex-col items-center sm:flex-row sm:justify-between w-full relative z-10 gap-6 sm:gap-0">
        
        {/* Left: Energy Gauge / Segmented Loading Cells */}
        <div className="flex flex-col gap-2.5 items-center sm:items-start order-2 sm:order-1">
          <span className="text-[9px] font-bold tracking-[0.25em] text-zinc-400 uppercase">
            Connection Power Grid
          </span>
          <div ref={cellsContainerRef} className="flex gap-1.5 p-1 bg-zinc-100/90 rounded-lg border border-zinc-200/50 shadow-inner">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="w-4 h-2 rounded-[2px] transition-all duration-300 bg-zinc-200 border border-zinc-200/30"
                style={{ backgroundColor: "#e4e4e7" }}
              />
            ))}
          </div>
        </div>

        {/* Right: Giant Decode Percentage Text */}
        <div className="flex flex-col items-center sm:items-end order-1 sm:order-2">
          <div className="flex items-baseline gap-1.5">
            <span ref={percentTextRef} className="text-4xl sm:text-5xl font-black tracking-tighter text-zinc-950 font-syne drop-shadow-[0_0_15px_rgba(168,85,247,0.08)]">
              0
            </span>
            <span className="text-[14px] font-bold text-purple-600 font-syne">%</span>
          </div>
          <span className="text-[8px] font-bold tracking-[0.3em] text-zinc-400 uppercase mt-0.5">
            INITIALIZING GATEWAY
          </span>
        </div>
      </div>
    </div>
  );
}
