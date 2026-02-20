import React, { useEffect, useRef, useState, useCallback } from "react";
import playerImgSrc from "./assets/images/player-def.png";
import playerJumpImgSrc from "./assets/images/player-jump.png";
import bg1 from "./assets/images/bg-image1.jpeg";
import bg2 from "./assets/images/bg-image2.jpeg";
import bg3 from "./assets/images/bg-image3.jpeg";
import bg4 from "./assets/images/bg-image4.jpeg";
import bg5 from "./assets/images/bg-image5.jpeg";
// 간단한 "인내의 숲" 스타일 위로 올라가는 플랫폼 게임
// 방향키 좌우 이동 + 자동 점프
// 목표: 최대한 위로 올라가기

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
const PLAYER_SIZE = 80;
const PLAYER_HITBOX = 24;    // 충돌 크기
const GRAVITY = 0.6;
const JUMP_POWER = -10;
const MOVE_SPEED = 4;

function randomPlatform(y) {
  return {
    x: Math.random() * (GAME_WIDTH - 80),
    y,
    width: 80,
    height: 10,
  };
}

export default function ClimbGame() {
  const canvasRef = useRef(null);
  const keys = useRef({ left: false, right: false, jump: false });
  const animationRef = useRef(null);
  const playerImg = useRef(new Image());
  const playerJumpImg = useRef(new Image());
  const bgImages = useRef(new Image());
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);

  const gameState = useRef(null);

  const initGame = useCallback(() => {
    const platforms = [];
    const startPlatform = {
      x:  0,
      y: GAME_HEIGHT - 40,
      width: GAME_WIDTH,
      height: 10,
    };
    platforms.push(startPlatform);

    for (let i = 1; i < 1000; i++) {
      platforms.push(randomPlatform(GAME_HEIGHT - 40 - i * 100));
    }

    gameState.current = {
      player: {
        x: startPlatform.x + startPlatform.width / 2 - PLAYER_SIZE / 2,
        y: startPlatform.y - PLAYER_SIZE,
        vy: 0,
        prevY: startPlatform.y - PLAYER_SIZE,
        onGround: false,
        jumpCount: 0,
      },
      platforms,
      cameraY: 0,
      maxHeight: 0,
      startY: startPlatform.y - PLAYER_SIZE,  //게임 시작 시점의 위치 저장
      totalHeight: 0,
    };

    setScore(0);
    setRunning(true);
  }, []); // 의존성 배열 비움

  useEffect(() => {
    // 0초 타이머를 걸어 렌더링 루프를 한 번 건너뜁니다.
    const timer = setTimeout(() => {
      initGame();
    }, 0);

    return () => clearTimeout(timer); // 언마운트 시 타이머 청소
  }, [initGame]);

  useEffect(() => {
    const down = (e) => {
      if (e.key === "ArrowLeft") keys.current.left = true;
      if (e.key === "ArrowRight") keys.current.right = true;
      if (e.code === "Space") keys.current.jump = true;
    };

    const up = (e) => {
      if (e.key === "ArrowLeft") keys.current.left = false;
      if (e.key === "ArrowRight") keys.current.right = false;
      if (e.code === "Space") keys.current.jump = false;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    playerImg.current.src = playerImgSrc;
    playerJumpImg.current.src = playerJumpImgSrc;
  }, []);

  // 새로운 useEffect: 배경 이미지 로드
  useEffect(() => {
    const imageSources = {
      "대류권": bg1,
      "성층권": bg2,
      "중간권": bg3,
      "열권": bg4,
      "외기권 (우주)": bg5,
    };

    let loadedCount = 0;
    const totalImages = Object.keys(imageSources).length;

    for (const name in imageSources) {
      const img = new Image();
      img.src = imageSources[name];
      img.onload = () => {
        loadedCount++;
        bgImages.current[name] = img; // 로드된 이미지를 useRef에 저장
        if (loadedCount === totalImages) {
          setImagesLoaded(true); // 모든 이미지 로드 완료
        }
      };
      img.onerror = () => {
        console.error(`Failed to load image: ${imageSources[name]}`);
        loadedCount++; // 에러 나도 카운트는 증가시켜서 무한 대기 방지
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
    }
  }, [setImagesLoaded]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");

    const loop = () => {
      if (!running) return;

      const state = gameState.current;
      const p = state.player;
      p.onGround = false;

      // 이동
      if (keys.current.left) p.x -= MOVE_SPEED;
      if (keys.current.right) p.x += MOVE_SPEED;

      if (p.x < 0) p.x = 0;
      if (p.x > GAME_WIDTH - PLAYER_SIZE)
        p.x = GAME_WIDTH - PLAYER_SIZE;

      // 중력
      p.prevY = p.y;
      p.vy += GRAVITY;
      p.y += p.vy;

      // 플랫폼 충돌
      state.platforms.forEach((plat) => {
        const falling = p.vy > 0;

        const crossedPlatform =
          p.prevY + PLAYER_HITBOX <= plat.y &&
          p.y + PLAYER_HITBOX >= plat.y;

        const withinX =
          p.x + PLAYER_HITBOX > plat.x &&
          p.x < plat.x + plat.width;

        if (falling && crossedPlatform && withinX) {
          p.y = plat.y - PLAYER_HITBOX;
          p.vy = 0;
          p.onGround = true;
          p.jumpCount = 0; // 착지하면 초기화
        }
      });


      if (keys.current.jump && p.jumpCount < 2) {
        p.vy = JUMP_POWER;
        p.jumpCount++;
        p.onGround = false;
        keys.current.jump = false; // 꾹 누르면 연속 점프 방지
      }

      // 수정: 플레이어가 화면의 특정 범위를 벗어나면 카메라가 위아래로 따라다님
      const topBoundary = GAME_HEIGHT * 0.3; // 화면 상단 30% 선
      const bottomBoundary = GAME_HEIGHT * 0.7; // 화면 하단 70% 선

      if (p.y < topBoundary) {
        const diff = topBoundary - p.y;
        p.y = topBoundary;
        state.cameraY += diff;
        state.platforms.forEach((plat) => (plat.y += diff));
        state.totalHeight += diff;
      } else if (p.y > bottomBoundary && state.totalHeight > 0) {
        // 아래로 떨어질 때 카메라가 같이 내려감 (단, 시작점보다는 안 내려감)
        const diff = bottomBoundary - p.y;
        const limitedDiff = Math.max(diff, -state.totalHeight); // 시작점 이하로 안 내려가게 방어
        
        p.y += limitedDiff;
        state.cameraY += limitedDiff;
        state.platforms.forEach((plat) => (plat.y += limitedDiff));
        state.totalHeight += limitedDiff;
      }

      // 플랫폼 재생성
      state.platforms = state.platforms.filter(
        (plat) => plat.y < GAME_HEIGHT + 1000
      );

      while (state.platforms.length < 12) {
        const highest = Math.min(
          ...state.platforms.map((p) => p.y)
        );
        state.platforms.push(randomPlatform(highest - 60));
      }

      // 낙하하면 게임 오버
      if (p.y > GAME_HEIGHT + 800) {
        setRunning(false);
      }

      //실시간 위치 기반 점수 계산
      const rawScore = state.totalHeight + (state.startY - p.y);
      const formattedScore = (rawScore / 100).toFixed(2); //100으로 나누어 소수점 둘째 자리까지 문자열로 변환
      setScore(rawScore > 0 ? formattedScore : "0.00"); //만약 0보다 작으면 "0.00"으로 고정

      // 그리기
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      // 현재 대기권에 맞는 배경 이미지를 그립니다.
      const currentBgImage = bgImages.current[atmosphereName];
      if (currentBgImage) { // 이미지를 캔버스에 꽉 채워 그립니다.
        ctx.drawImage(currentBgImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);
      } else {  // 이미지가 없으면 기본 배경색으로 대체 (혹시 모를 오류 방지)
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }

      // 플랫폼
      ctx.fillStyle = "#22c55e";
      state.platforms.forEach((plat) => {
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      });

      // 플레이어
      const currentImg = p.onGround
        ? playerImg.current
        : playerJumpImg.current;

      ctx.drawImage(
        currentImg,
        p.x - (PLAYER_SIZE - PLAYER_HITBOX) / 2,
        p.y - (PLAYER_SIZE - PLAYER_HITBOX),
        PLAYER_SIZE,
        PLAYER_SIZE
      );

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationRef.current);
  }, [running, imagesLoaded, atmosphereName]);

  const heightNum = parseFloat(score);
  let atmosphereName = "";

  if (heightNum < 10) {
    atmosphereName = "대류권";
  } else if (heightNum < 50) {
    atmosphereName = "성층권";
  } else if (heightNum < 80) {
    atmosphereName = "중간권";
  } else if (heightNum < 500) {
    atmosphereName = "열권";
  } else {
    atmosphereName = "외기권 (우주)";
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center gap-4 p-4 bg-slate-900 text-white">
      <h1 className="text-2xl font-bold">대기권 알아보기</h1>
      <div className="text-xl font-bold text-yellow-400">
        현재 위치: {atmosphereName}
      </div>
      <div className="text-lg">지표면에서 {score}km</div>

      <div className="relative shadow-2xl rounded-2xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="bg-black"
        />

        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
            <div className="text-xl">게임 오버</div>
            <button onClick={initGame}>다시 시작</button>
          </div>
        )}
      </div>

      <div className="text-sm opacity-70">
        <div>이동 : 방향키</div>
        <div>점프 : Space</div>
        <div>더블점프 : 점프상태에서 Space</div>
      </div>
    </div>
  );
}
