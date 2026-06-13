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
    let logoReceived = 0;
    const logoLength = 54842;

    const updateProgress = () => {
      downloadPctRef.current = Math.min(logoReceived / logoLength, 0.99);
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
        // Preload logo (critical visual)
        const logoBlobUrl = await downloadAsset(
          "/logo.webp",
          "image/webp",
          (bytes) => {
            logoReceived = bytes;
            updateProgress();
          }
        );

        if (active) {
          downloadPctRef.current = 1.0;
          preloadedUrls.current = {
            videoUrl: "/Products_drifting_in_frame_202606111905.mp4", // Stream video progressively (faster site entry!)
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
      "GENERATING CINEMATIC 3D PLUG OBJECTS...",
      "STABILIZING VOLTAGE DYNAMICS [120V / 60HZ]...",
      "RESOLVING AUDIO LATENCY SCHEMAS...",
      "DOWNLOADING SECURE CONTENT BUNDLES...",
      "POLISHING OBSIDIAN GLASS SURFACES...",
      "ESTABLISHING SECURE GATEWAY TUNNEL...",
      "ENCRYPTING CACHED PAYLOAD CHANNELS...",
      "ALIGNING 3-PIN PLUG PRONGS...",
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

    // --- Scene Setup (Light clean luxury space) ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfbfbfe); // elegant soft off-white
    scene.fog = new THREE.FogExp2(0xfbfbfe, 0.08);

    // Camera placed directly looking down the Z-axis, slightly angled down
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 5.0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      precision: "mediump"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5)); // Optimized pixel ratio for better fill-rate performance
    renderer.shadowMap.enabled = !isMobile; // Disable shadow maps on mobile to save processing power
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95); // bright clean fill
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xc084fc, 2.0); // purple accent light
    dirLight1.position.set(-4, 4, 2);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.8); // white key light
    dirLight2.position.set(4, 5, 5);
    dirLight2.castShadow = true;
    dirLight2.shadow.mapSize.width = isMobile ? 512 : 1024;
    dirLight2.shadow.mapSize.height = isMobile ? 512 : 1024;
    dirLight2.shadow.bias = -0.0005;
    scene.add(dirLight2);

    // Point Light to simulate glowing connection
    const sparkLight = new THREE.PointLight(0x9674eb, 0, 15);
    sparkLight.position.set(0, 0.0, 2.45);
    scene.add(sparkLight);

    // --- 3D 3-Pin Plug ---
    const plugGroup = new THREE.Group();

    // 1. Polished white ceramic plug body (extruded rounded rectangle)
    const plugBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xfcfcfd, // porcelain white
      roughness: 0.15,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.8,
    });
    const plugBodyShape = drawRoundedRect(1.1, 0.9, 0.15);
    const plugBodyGeom = new THREE.ExtrudeGeometry(plugBodyShape, {
      depth: 0.8,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    });
    const plugBodyMesh = new THREE.Mesh(plugBodyGeom, plugBodyMat);
    plugBodyMesh.position.set(0, 0, -0.4); // center along Z
    plugBodyMesh.castShadow = true;
    plugBodyMesh.receiveShadow = true;
    plugGroup.add(plugBodyMesh);

    // 2. Satin black rubber cable base collar
    const collarMat = new THREE.MeshPhysicalMaterial({
      color: 0x18181b, // matte black
      roughness: 0.5,
      metalness: 0.1,
    });
    const collarGeom = new THREE.CylinderGeometry(0.12, 0.16, 0.25, 12);
    collarGeom.rotateX(Math.PI / 2); // align with Z-axis
    const collarMesh = new THREE.Mesh(collarGeom, collarMat);
    collarMesh.position.set(0, 0, -0.525);
    collarMesh.castShadow = true;
    plugGroup.add(collarMesh);

    // 3. Three Gold Prongs (US style: 2 flat rectangular prongs, 1 round ground prong)
    const prongMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37, // premium brass/gold
      metalness: 1.0,
      roughness: 0.15,
      clearcoat: 0.5,
      clearcoatRoughness: 0.1,
    });

    // Rectangular Hot/Neutral prongs
    const prongGeom = new THREE.BoxGeometry(0.1, 0.28, 0.5);
    
    const prongLeft = new THREE.Mesh(prongGeom, prongMat);
    prongLeft.position.set(-0.25, 0.12, 0.65); // offset left, top
    prongLeft.castShadow = true;
    plugGroup.add(prongLeft);

    const prongRight = new THREE.Mesh(prongGeom, prongMat);
    prongRight.position.set(0.25, 0.12, 0.65); // offset right, top
    prongRight.castShadow = true;
    plugGroup.add(prongRight);

    // Rectangular ground prong (visually matched size)
    const groundProngGeom = new THREE.BoxGeometry(0.1, 0.22, 0.4);
    const prongGround = new THREE.Mesh(groundProngGeom, prongMat);
    prongGround.position.set(0, -0.22, 0.6); // offset center, bottom, Z aligned
    prongGround.castShadow = true;
    plugGroup.add(prongGround);

    scene.add(plugGroup);

    // --- Interactive Mouse-Responsive Ambient Dust Field ---
    const dustCount = 80;
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

    // --- Torus Connection Shockwave (Flat in screen X-Y plane) ---
    const torusGeom = new THREE.TorusGeometry(0.1, 0.015, 6, 24);
    const torusMat = new THREE.MeshBasicMaterial({
      color: 0x9674eb,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const shockwave = new THREE.Mesh(torusGeom, torusMat);
    shockwave.position.set(0, 0.0, 2.45);
    shockwave.rotation.set(0, 0, 0); // Flat parallel to the screen/camera
    scene.add(shockwave);

    // --- Lightning Electric Arcs striking out to the viewport margins ---
    const arcLines: THREE.Line[] = [];
    const arcMat = new THREE.LineBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0,
    });
    for (let i = 0; i < 3; i++) {
      const points = [];
      points.push(new THREE.Vector3(0, 0, 0));
      points.push(new THREE.Vector3(0, 0, 0));
      points.push(new THREE.Vector3(0, 0, 0));
      points.push(new THREE.Vector3(0, 0, 0));
      const arcGeom = new THREE.BufferGeometry().setFromPoints(points);
      const arcLine = new THREE.Line(arcGeom, arcMat);
      arcLine.visible = false;
      scene.add(arcLine);
      arcLines.push(arcLine);
    }

    // --- Spline Cable (White cord trailing behind the plug) ---
    const tubeMat = new THREE.MeshPhysicalMaterial({
      color: 0xf4f4f7, // clean white cord
      roughness: 0.45,
      metalness: 0.1,
      emissive: new THREE.Color(0x9674eb),
      emissiveIntensity: 1.0,
    });
    const pulseColor = new THREE.Color();

    let cableMesh: THREE.Mesh | null = null;
    const updateCable = (plugX: number, plugY: number, plugZ: number, pulseIntensity: number, progressVal: number) => {
      // Dynamic curve trailing from deep off-screen bottom to the back collar of the plug
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -6, -9),
        new THREE.Vector3(-1.0, -4.5, -4),
        new THREE.Vector3(-0.4, plugY - 1.2, plugZ - 2.5),
        new THREE.Vector3(plugX, plugY, plugZ - 0.7),
      ]);

      // Optimized segments: (20 segments, 5 radial) to reduce GPU memory churn
      const newGeom = new THREE.TubeGeometry(curve, 20, 0.06, 5, false);

      if (cableMesh) {
        cableMesh.geometry.dispose();
        cableMesh.geometry = newGeom;
      } else {
        cableMesh = new THREE.Mesh(newGeom, tubeMat);
        cableMesh.castShadow = true;
        cableMesh.receiveShadow = true;
        scene.add(cableMesh);
      }

      tubeMat.emissiveIntensity = pulseIntensity;
      pulseColor.setHSL(0.74 + progressVal * 0.02, 1.0, 0.55);
      tubeMat.emissive.copy(pulseColor);
    };

    // --- Electric Spark Particles flying forward at the camera ---
    const sparkCount = 45;
    const sparkGeom = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkVels: number[] = [];

    for (let i = 0; i < sparkCount; i++) {
      // Sparks start at connection coordinates
      sparkPos[i * 3] = 0;
      sparkPos[i * 3 + 1] = 0.0;
      sparkPos[i * 3 + 2] = 2.45;

      const angle = Math.random() * Math.PI * 2;
      const rSpeed = 1.0 + Math.random() * 2.5;
      sparkVels.push(
        Math.cos(angle) * rSpeed, // X speed
        Math.sin(angle) * rSpeed, // Y speed
        4.0 + Math.random() * 6.0  // Z speed (flying directly towards camera!)
      );
    }

    const sparkPosOrig = new Float32Array(sparkPos);
    sparkGeom.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x9674eb,
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
    const minPlugDuration = 2200;
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

      // Direct DOM updates to bypass React render cycle lag at 60fps
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

      // Camera positions (centered view looking down)
      const aspect = camera.aspect;
      const startCamY = aspect < 1 ? 0.8 : 0.4;
      const targetCamY = 0.0;
      const startCamZ = aspect < 1 ? 7.0 : 6.0;
      const targetCamZ = aspect < 1 ? 6.2 : 5.2;

      const easeCam = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      camera.position.x = 0;
      camera.position.y = startCamY + (targetCamY - startCamY) * easeCam;
      camera.position.z = startCamZ + (targetCamZ - startCamZ) * easeCam;
      camera.lookAt(new THREE.Vector3(0, 0.0, progress * 1.5));

      // Cable glowing emissive pulse
      const pulseSpeed = 3 + progress * 2;
      const cablePulse = (1.2 + Math.sin(now * 0.001 * pulseSpeed) * 0.35) * (0.8 + progress * 1.5);

      // Rotate ambient dust field based on mouse
      dustParticles.rotation.y = mouseX * 0.08;
      dustParticles.rotation.x = mouseY * 0.08;
      const dustArr = dustGeom.attributes.position.array as Float32Array;
      for (let i = 0; i < dustCount; i++) {
        dustArr[i * 3 + 1] -= 0.004;
        if (dustArr[i * 3 + 1] < -4) {
          dustArr[i * 3 + 1] = 4;
        }
      }
      dustGeom.attributes.position.needsUpdate = true;

      // Flight coordinates of plug
      const startX = 0.0;
      const targetX = 0.0;
      const startY = -3.5;
      const targetY = 0.0;
      const startZ = -6.0;
      const targetZ = 1.8; // contact depth further back to prevent getting too close

      let currentX = startX;
      let currentY = startY;
      let currentZ = startZ;

      // Rotational alignment as it approaches the screen
      let rotX = 0.6;
      let rotY = 0.4;
      let rotZ = -0.5;

      if (progress < 1.0) {
        const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        currentX = startX + (targetX - startX) * ease;
        currentY = startY + (targetY - startY) * ease;
        currentZ = startZ + (targetZ - startZ) * ease;

        rotX = 0.6 * (1.0 - ease);
        rotY = 0.4 * (1.0 - ease);
        rotZ = -0.5 * (1.0 - ease);

        sparkLight.intensity = 0;
        sparkMat.opacity = 0;
        shockwave.visible = false;
      } else {
        currentX = targetX;
        currentY = targetY;
        currentZ = targetZ;

        rotX = 0;
        rotY = 0;
        rotZ = 0;

        if (!plugged) {
          plugged = true;
          sparkLight.intensity = 24;
          sparkMat.opacity = 1.0;
          shockwave.visible = true;
        }
      }

      plugGroup.position.set(currentX, currentY, currentZ);
      plugGroup.rotation.set(rotX, rotY, rotZ);
      updateCable(currentX, currentY, currentZ, cablePulse, progress);

      // Once connection is locked (progress == 100%), play docking FX
      if (plugged) {
        virtualT += delta;

        // Ambient lighting flash impact
        if (virtualT < 0.22) {
          ambientLight.intensity = 0.95 + (4.5 * (1.0 - (virtualT / 0.22)));
        } else {
          ambientLight.intensity = 0.95;
        }

        // Shockwave expansion in screen plane
        if (virtualT < 0.65) {
          shockwave.scale.setScalar(1 + virtualT * 48);
          torusMat.opacity = Math.max(0, 1.0 - (virtualT / 0.65));
        } else {
          shockwave.visible = false;
        }

        // Lightning arc discharges striking onto the viewport
        if (virtualT < 0.38) {
          arcMat.opacity = (1.0 - (virtualT / 0.38)) * (Math.random() * 0.95 + 0.05);
          
          // Calculate prong world coordinates dynamically relative to the plug group's position
          const currentPlugPos = plugGroup.position;
          const prongLeftWorld = new THREE.Vector3(currentPlugPos.x - 0.25, currentPlugPos.y + 0.12, currentPlugPos.z + 0.65);
          const prongRightWorld = new THREE.Vector3(currentPlugPos.x + 0.25, currentPlugPos.y + 0.12, currentPlugPos.z + 0.65);
          const prongGroundWorld = new THREE.Vector3(currentPlugPos.x, currentPlugPos.y - 0.22, currentPlugPos.z + 0.65);
          const prongWorlds = [prongLeftWorld, prongRightWorld, prongGroundWorld];

          arcLines.forEach((line, idx) => {
            line.visible = Math.random() > 0.4;
            if (line.visible) {
              const startPt = prongWorlds[idx];
              const endPt = new THREE.Vector3(
                (Math.random() - 0.5) * 5.0,
                (Math.random() - 0.5) * 3.5,
                3.5 // viewport plane closer to the camera/screen
              );
              
              const pts = [startPt];
              // Jagged lightning path offsets
              for (let j = 1; j <= 2; j++) {
                const t = j / 3;
                pts.push(new THREE.Vector3(
                  startPt.x + (endPt.x - startPt.x) * t + (Math.random() - 0.5) * 0.45,
                  startPt.y + (endPt.y - startPt.y) * t + (Math.random() - 0.5) * 0.45,
                  startPt.z + (endPt.z - startPt.z) * t + (Math.random() - 0.5) * 0.2
                ));
              }
              pts.push(endPt);
              
              line.geometry.setFromPoints(pts);
              line.geometry.attributes.position.needsUpdate = true;
            }
          });
        } else {
          arcLines.forEach(line => line.visible = false);
        }

        // Camera impact thud shake recoil
        if (virtualT < 0.35) {
          const shakeProgress = virtualT / 0.35;
          const shakeVal = 0.09 * Math.pow(1.0 - shakeProgress, 2.2);
          camera.position.x += (Math.random() - 0.5) * shakeVal;
          camera.position.y += (Math.random() - 0.5) * shakeVal;
        }

        // Sparks flying past the camera
        if (virtualT < 0.95) {
          const sparkT = virtualT / 0.95;
          sparkLight.intensity = 45 * Math.pow(1.0 - sparkT, 2);
          sparkMat.opacity = 1.0 - sparkT;

          const posAttr = sparkGeom.getAttribute("position") as THREE.BufferAttribute;
          for (let i = 0; i < sparkCount; i++) {
            posAttr.setX(i, sparkPosOrig[i * 3] + sparkVels[i * 3] * sparkT);
            posAttr.setY(i, sparkPosOrig[i * 3 + 1] + sparkVels[i * 3 + 1] * sparkT - 1.5 * sparkT * sparkT);
            posAttr.setZ(i, sparkPosOrig[i * 3 + 2] + sparkVels[i * 3 + 2] * sparkT);
          }
          posAttr.needsUpdate = true;
        } else {
          sparkLight.intensity = 0;
          sparkMat.opacity = 0;
        }

        // Clean screen fade out
        if (virtualT >= 0.8) {
          const fadeT = Math.min((virtualT - 0.8) / 0.55, 1.0);
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

      plugBodyGeom.dispose();
      plugBodyMat.dispose();
      collarGeom.dispose();
      collarMat.dispose();
      prongGeom.dispose();
      prongMat.dispose();
      groundProngGeom.dispose();
      dustGeom.dispose();
      dustMat.dispose();
      torusGeom.dispose();
      torusMat.dispose();
      arcMat.dispose();
      arcLines.forEach(l => l.geometry.dispose());
      sparkGeom.dispose();
      sparkMat.dispose();
      tubeMat.dispose();

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
