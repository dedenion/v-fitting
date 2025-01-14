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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // シーン
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x000000); // 背景を黒に変更

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

    // ライティングセットアップ
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // 環境光を弱めに
    scene.add(ambientLight);

    // メインの回転するライト
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

    // フィルライト（反対側からの弱い光）
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-2, 0, -2);
    scene.add(fillLight);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;

    // モデルを読み込む関数
    const loadModel = (modelName, isClothes = false) => {
      const loader = new GLTFLoader();
      loader.load(
        `/models/${modelName}.glb`,
        (gltf) => {
          const model = gltf.scene;

          // シャドウの設定
          model.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
              // PBRマテリアルの設定
              if (node.material) {
                node.material.envMapIntensity = 1;
                node.material.needsUpdate = true;
              }
            }
          });

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
          } else {
            // モデルをシーン中央に配置（人体モデルの場合）
            model.position.set(
              -center.x * scaleFactor,
              -center.y * scaleFactor,
              -center.z * scaleFactor
            );

            // スケルトンヘルパーの作成
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
          }

          // モデルを保持
          if (isClothes) {
            modelRefs.current.clothes.push(model);
          } else {
            modelRefs.current[modelName] = model;
          }

          // モデルをシーンに追加
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

    // 各モデルを読み込み
    loadModel("female");
    loadModel("man");
    loadModel("clothes/big_tee", true);
    loadModel("clothes/wide_pants", true);

    // ライトのアニメーション用の角度
    let angle = 0;

    // アニメーション
    const animate = () => {
      // ライトを回転
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

    // ブラウザのリサイズ処理
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

  // ボーン可視化のトグル
  const toggleSkeletonVisibility = () => {
    setSkeletonVisible((prev) => {
      const newVisibility = !prev;
      const skeleton = skeletonHelperRefs.current[currentModel];
      if (skeleton) {
        skeleton.visible = newVisibility;
      }
      return newVisibility;
    });
  };

  // モデル切り替えボタンの処理
  const toggleModel = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 現在のモデルとスケルトンをシーンから削除
    scene.remove(modelRefs.current[currentModel]);
    if (skeletonHelperRefs.current[currentModel]) {
      scene.remove(skeletonHelperRefs.current[currentModel]);
    }

    // 次のモデルを表示
    const nextModel = currentModel === "female" ? "man" : "female";
    scene.add(modelRefs.current[nextModel]);

    // スケルトンの追加（可視性を現在の状態に合わせる）
    if (skeletonHelperRefs.current[nextModel]) {
      scene.add(skeletonHelperRefs.current[nextModel]);
      skeletonHelperRefs.current[nextModel].visible = isSkeletonVisible;
    }

    setCurrentModel(nextModel);

    // カメラの位置とコントロールをリセット
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
            ? "rgba(255, 255, 255, 0.8)" // 白に近い透明色
            : "rgba(0, 0, 0, 0.8)", // 黒に近い透明色
          color: isSkeletonVisible ? "#000" : "#FFF", // テキストカラーを背景と反対に
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)", // 見やすくするための影
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
              ? "rgba(255, 99, 71, 0.6)" // 薄い赤（女性モデル）
              : "rgba(70, 130, 180, 0.6)", // 薄い青（男性モデル）
          color: "#FFF",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)", // 影を追加
        }}
        onClick={toggleModel}
      >
        {currentModel === "female" ? "Female" : "Man"}
      </button>

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
      ></canvas>
    </div>
  );
};

export default AvatarViewer;
