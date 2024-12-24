"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const AvatarViewer = () => {
  const canvasRef = useRef(null);
  const modelRefs = useRef({ female: null, man: null, clothes: [] }); // 各モデルを保持
  const skeletonRefs = useRef({ female: null, man: null }); // 各モデルのスケルトン情報を保持
  const [lightIntensity, setLightIntensity] = useState(0.7);
  const [error, setError] = useState(null);
  const [isSkeletonVisible, setSkeletonVisible] = useState(false);
  const [currentModel, setCurrentModel] = useState("man"); // 現在表示しているモデル

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // シーン
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // サイズ
    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // カメラ
    const camera = new THREE.PerspectiveCamera(
      75,
      sizes.width / sizes.height,
      0.1,
      1000
    );
    camera.position.z = 3;

    // レンダラー
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(window.devicePixelRatio);

    // ライト
    const ambientLight = new THREE.AmbientLight(0xffffff, lightIntensity);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(1, 1, 2);
    scene.add(pointLight);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;

    // モデルを読み込む関数
    // モデルを読み込む関数
    const loadModel = (modelName, isClothes = false) => {
      const loader = new GLTFLoader();
      loader.load(
        `/models/${modelName}.glb`,
        (gltf) => {
          const model = gltf.scene;

          // スケールと位置の調整
          const boundingBox = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          boundingBox.getSize(size);
          boundingBox.getCenter(center);

          // スケールの調整
          const scaleFactor = 2 / Math.max(size.x, size.y, size.z);
          model.scale.set(scaleFactor, scaleFactor, scaleFactor);

          // 衣服の位置調整（トップスとパンツ）
          if (isClothes) {
            if (modelName === "clothes/big_tee") {
              model.scale.set(
                scaleFactor * 0.6,
                scaleFactor * 0.6,
                scaleFactor * 0.6
              );
              model.position.set(0, 0.5, 0); // 上に少し調整
            } else if (modelName === "clothes/wide_pants") {
              model.scale.set(
                scaleFactor * 0.6,
                scaleFactor * 0.6,
                scaleFactor * 0.6
              );
              model.position.set(0, -0.5, 0); // 下に少し調整
            }
          }

          // モデルをシーン中央に配置
          // 今回は中心位置を計算して位置を設定
          model.position.set(
            -center.x * scaleFactor,
            -center.y * scaleFactor,
            -center.z * scaleFactor
          );

          // モデルを保持
          if (isClothes) {
            modelRefs.current.clothes.push(model);
          } else {
            modelRefs.current[modelName] = model;
          }

          // モデルをシーンに追加
          if (modelName === currentModel || isClothes) {
            scene.add(model);

            // スケルトンがあれば追加
            if (!isClothes && skeletonRefs.current[modelName]) {
              scene.add(skeletonRefs.current[modelName]);
            }
          }

          // 衣服の位置を調整するための位置変更が正しく反映されるように設定
          if (modelName === "clothes/big_tee") {
            model.position.set(0, -0.9, 0); // 位置の調整
          } else if (modelName === "clothes/wide_pants") {
            model.position.set(0, -0.9, 0); // 位置の調整
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

    // 各モデルを読み込み
    loadModel("female");
    loadModel("man");

    // 洋服を読み込む
    loadModel("clothes/big_tee", true);
    loadModel("clothes/wide_pants", true);

    // アニメーション
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    // ブラウザのリサイズ処理
    const onResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(window.devicePixelRatio);
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      controls.dispose();
    };
  }, [lightIntensity, isSkeletonVisible, currentModel]);

  // ボーン可視化のトグル
  const toggleSkeletonVisibility = () => {
    setSkeletonVisible((prev) => !prev);
    Object.values(skeletonRefs.current).forEach((skeleton) => {
      if (skeleton) {
        skeleton.visible = !isSkeletonVisible;
      }
    });
  };

  // モデル切り替えボタンの処理
  const toggleModel = () => {
    const scene = modelRefs.current[currentModel].parent; // 現在のモデルの親
    if (!scene) return;

    // 現在のモデルをシーンから削除
    scene.remove(modelRefs.current[currentModel]);
    scene.remove(skeletonRefs.current[currentModel]);

    // 次のモデルを表示
    const nextModel = currentModel === "female" ? "man" : "female";
    scene.add(modelRefs.current[nextModel]);
    scene.add(skeletonRefs.current[nextModel]);

    setCurrentModel(nextModel);
  };

  return (
    <div style={{ position: "relative" }}>
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
          background: isSkeletonVisible ? "#f44336" : "#4caf50",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
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
          background: "#2196f3",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
        onClick={toggleModel}
      >
        {currentModel === "female" ? "Switch to Man" : "Switch to Female"}
      </button>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
};

export default AvatarViewer;
