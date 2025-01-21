"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const AvatarViewer = () => {
  const canvasRef = useRef(null);
  const modelRefs = useRef({ female: null, man: null, clothes: [] });
  const skeletonHelperRefs = useRef({ female: null, man: null });
  const controlsRef = useRef(null);
  const lightRef = useRef(null);
  const [error, setError] = useState(null);
  const [isSkeletonVisible, setSkeletonVisible] = useState(false);
  const [currentModel, setCurrentModel] = useState("man");
  const sceneRef = useRef(null);

  // 身長と衣服サイズの管理
  const [height, setHeight] = useState({
    man: 170,
    female: 160,
  });

  const [clothingSizes, setClothingSizes] = useState({
    tops: 60, // デフォルト着丈 60cm
    bottoms: 100, // デフォルト着丈 100cm
  });

  // 衣服のスケール状態を管理
  const [clothingScales, setClothingScales] = useState({
    big_tee: 0.67,
    wide_pants: 0.63,
  });

  // 体の部位ごとの成長比率を定義
  const bodyGrowthRatios = {
    spine: 0.25, // 脊椎基本比率
    spine1: 0.3, // 胸部比率
    spine2: 0.25, // 上部胸部比率
    neck: 0.1, // 首の比率
    head: 0.05, // 頭部比率（あまり変化させない）
    upperArm: 0.4, // 上腕比率
    lowerArm: 0.4, // 前腕比率
    hand: 0.1, // 手の比率
    upperLeg: 0.45, // 大腿比率
    lowerLeg: 0.45, // 下腿比率
    foot: 0.1, // 足の比率
  };

  // 身長変更を処理する関数
  const handleHeightChange = (newHeight) => {
    const model = modelRefs.current[currentModel];
    if (!model) return;

    // 身長の制限（±30cm）
    const defaultHeight = currentModel === "man" ? 170 : 160;
    newHeight = Math.max(
      defaultHeight - 30,
      Math.min(defaultHeight + 30, newHeight)
    );

    // 現在の身長との比率を計算
    const scale = newHeight / defaultHeight;

    // ボーンのスケーリングを適用
    model.traverse((node) => {
      if (node.isBone) {
        let appliedScale = scale;

        // 部位ごとの成長比率を適用
        Object.entries(bodyGrowthRatios).forEach(([part, ratio]) => {
          if (node.name.toLowerCase().includes(part.toLowerCase())) {
            // 基本スケールに部位ごとの比率を掛ける
            appliedScale = 1 + (scale - 1) * ratio;

            // Y軸（長さ）に対してより大きな変化を適用
            node.scale.y = appliedScale;

            // X軸とZ軸（幅と奥行き）は若干控えめに
            const widthScale = 1 + (appliedScale - 1) * 0.7;
            node.scale.x = widthScale;
            node.scale.z = widthScale;
          }
        });
      }
    });

    // 状態を更新
    setHeight((prev) => ({
      ...prev,
      [currentModel]: newHeight,
    }));
  };

  // スケルトン表示切り替え関数を追加
  const toggleSkeletonVisibility = () => {
    setSkeletonVisible((prev) => {
      const newVisibility = !prev;
      // 現在のモデルのスケルトンヘルパーの表示を切り替え
      const skeleton = skeletonHelperRefs.current[currentModel];
      if (skeleton) {
        skeleton.visible = newVisibility;
      }
      return newVisibility;
    });
  };

  // 衣服のサイズ変更を処理する関数
  const handleClothingSizeChange = (type, newSize) => {
    const clothes = modelRefs.current.clothes;
    if (!clothes.length) return;

    // サイズの制限
    const limits = {
      tops: { min: 50, max: 80 },
      bottoms: { min: 80, max: 120 },
    };

    newSize = Math.max(limits[type].min, Math.min(limits[type].max, newSize));

    // 衣服の種類に応じたスケール計算
    clothes.forEach((cloth) => {
      const isTop = cloth.name.includes("big_tee");
      if ((isTop && type === "tops") || (!isTop && type === "bottoms")) {
        const defaultSize = type === "tops" ? 60 : 100;
        const sizeRatio = newSize / defaultSize;

        // Y軸（長さ）のスケールを調整
        const baseScale = isTop
          ? clothingScales.big_tee
          : clothingScales.wide_pants;
        cloth.scale.y = baseScale * sizeRatio;

        // 着丈に応じて位置も調整
        if (isTop) {
          cloth.position.y = -1.02 - (newSize - defaultSize) * 0.01;
        } else {
          cloth.position.y = -0.98 - (newSize - defaultSize) * 0.01;
        }
      }
    });

    // 状態を更新
    setClothingSizes((prev) => ({
      ...prev,
      [type]: newSize,
    }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x000000);

    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const camera = new THREE.PerspectiveCamera(
      75,
      sizes.width / sizes.height,
      0.1,
      1000
    );
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(2, 2, 2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 10;
    directionalLight.shadow.camera.left = -2;
    directionalLight.shadow.camera.right = 2;
    directionalLight.shadow.camera.top = 2;
    directionalLight.shadow.camera.bottom = -2;
    scene.add(directionalLight);
    lightRef.current = directionalLight;

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-2, 0, -2);
    scene.add(fillLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;

    const loadModel = (modelName, isClothes = false) => {
      const loader = new GLTFLoader();
      loader.load(
        `/models/${modelName}.glb`,
        (gltf) => {
          const model = gltf.scene;
          model.name = modelName; // モデル名を保存

          model.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
              if (node.material) {
                node.material.envMapIntensity = 1;
                node.material.needsUpdate = true;
              }
            }
          });

          const boundingBox = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          boundingBox.getSize(size);
          boundingBox.getCenter(center);

          const scaleFactor = 2 / Math.max(size.x, size.y, size.z);
          model.scale.set(scaleFactor, scaleFactor, scaleFactor);

          if (isClothes) {
            if (modelName === "clothes/big_tee") {
              model.scale.set(
                scaleFactor * 0.67,
                scaleFactor * 0.67,
                scaleFactor * 0.67
              );
              model.position.set(0, -1.02, -0.025);
            } else if (modelName === "clothes/wide_pants") {
              model.scale.set(
                scaleFactor * 0.63,
                scaleFactor * 0.63,
                scaleFactor * 0.63
              );
              model.position.set(0, -0.98, 0.118);
            }
            modelRefs.current.clothes.push(model);
          } else {
            model.position.set(
              -center.x * scaleFactor,
              -center.y * scaleFactor,
              -center.z * scaleFactor
            );

            model.traverse((node) => {
              if (node.isMesh && node.skeleton) {
                const helper = new THREE.SkeletonHelper(
                  node.skeleton.bones[0].parent
                );
                helper.material.linewidth = 3;
                helper.visible = isSkeletonVisible;
                skeletonHelperRefs.current[modelName] = helper;
              }
            });

            modelRefs.current[modelName] = model;
          }

          if (modelName === currentModel || isClothes) {
            scene.add(model);
            if (!isClothes && skeletonHelperRefs.current[modelName]) {
              scene.add(skeletonHelperRefs.current[modelName]);
            }
          }
        },
        undefined,
        (error) => {
          console.error(`Error loading the 3D model (${modelName})`, error);
          setError(
            `Failed to load the 3D model (${modelName}). Please try again later.`
          );
        }
      );
    };

    loadModel("female");
    loadModel("man");
    loadModel("clothes/big_tee", true);
    loadModel("clothes/wide_pants", true);

    let angle = 0;

    const animate = () => {
      angle += 0.005;
      const radius = 3;
      if (lightRef.current) {
        lightRef.current.position.x = Math.cos(angle) * radius;
        lightRef.current.position.z = Math.sin(angle) * radius;
        lightRef.current.lookAt(0, 0, 0);
      }

      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // モデル切り替えボタンの処理
  const toggleModel = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    scene.remove(modelRefs.current[currentModel]);
    if (skeletonHelperRefs.current[currentModel]) {
      scene.remove(skeletonHelperRefs.current[currentModel]);
    }

    const nextModel = currentModel === "female" ? "man" : "female";
    scene.add(modelRefs.current[nextModel]);

    if (skeletonHelperRefs.current[nextModel]) {
      scene.add(skeletonHelperRefs.current[nextModel]);
      skeletonHelperRefs.current[nextModel].visible = isSkeletonVisible;
    }

    setCurrentModel(nextModel);

    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {error && (
        <div style={{ color: "red", position: "absolute", top: 10, left: 10 }}>
          {error}
        </div>
      )}

      <button
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
          padding: "10px",
          background: isSkeletonVisible
            ? "rgba(255, 255, 255, 0.8)"
            : "rgba(0, 0, 0, 0.8)",
          color: isSkeletonVisible ? "#000" : "#FFF",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
        }}
        onClick={toggleSkeletonVisibility}
      >
        {isSkeletonVisible ? "Hide Skeleton" : "Show Skeleton"}
      </button>

      <button
        style={{
          position: "absolute",
          top: 10,
          left: 130,
          zIndex: 10,
          padding: "10px",
          background:
            currentModel === "female"
              ? "rgba(255, 99, 71, 0.6)"
              : "rgba(70, 130, 180, 0.6)",
          color: "#FFF",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
        }}
        onClick={toggleModel}
      >
        {currentModel === "female" ? "Female" : "Man"}
      </button>

      {/* 身長調整スライダー */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 10,
          zIndex: 10,
          padding: "15px",
          background: "rgba(255, 255, 255, 0.9)",
          borderRadius: "5px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
          width: "250px",
        }}
      >
        <label style={{ display: "block", marginBottom: "5px", color: "#000" }}>
          Height: {height[currentModel]}cm
        </label>
        <input
          type="range"
          min={currentModel === "man" ? 140 : 130}
          max={currentModel === "man" ? 200 : 190}
          value={height[currentModel]}
          onChange={(e) => handleHeightChange(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>

      {/* 衣服サイズ調整パネル */}
      <div
        style={{
          position: "absolute",
          top: 150,
          left: 10,
          zIndex: 10,
          padding: "15px",
          background: "rgba(255, 255, 255, 0.9)",
          borderRadius: "5px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
          width: "250px",
        }}
      >
        <div style={{ marginBottom: "15px" }}>
          <label
            style={{ display: "block", marginBottom: "5px", color: "#000" }}
          >
            Tops Length: {clothingSizes.tops}cm
          </label>
          <input
            type="range"
            min={50}
            max={80}
            value={clothingSizes.tops}
            onChange={(e) =>
              handleClothingSizeChange("tops", Number(e.target.value))
            }
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label
            style={{ display: "block", marginBottom: "5px", color: "#000" }}
          >
            Bottoms Length: {clothingSizes.bottoms}cm
          </label>
          <input
            type="range"
            min={80}
            max={120}
            value={clothingSizes.bottoms}
            onChange={(e) =>
              handleClothingSizeChange("bottoms", Number(e.target.value))
            }
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
};

export default AvatarViewer;
