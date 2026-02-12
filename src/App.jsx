import React, { useEffect, useRef, useState } from "react";
import playerImgSrc from "./assets/images/player-def.png";
import playerJumpImgSrc from "./assets/images/player-jump.png";
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
    width: 40,
    height: 10,
  };
}

export default function ClimbGame() {
  const canvasRef = useRef(null);
  const keys = useRef({ left: false, right: false, jump: false });
  const animationRef = useRef(null);
  const playerImg = useRef(new Image());
  const playerJumpImg = useRef(new Image());

  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);

  const gameState = useRef(null);

  const initGame = () => {
    const platforms = [];

    const startPlatform = {
      x: GAME_WIDTH / 2 - 40,
      y: GAME_HEIGHT - 40,
      width: 80,
      height: 10,
    };

    platforms.push(startPlatform);

    for (let i = 1; i < 1000; i++) {
      platforms.push(randomPlatform(GAME_HEIGHT - 40 - i * 100));
    }

    gameState.current = {
      player: {
      x: startPlatform.x + startPlatform.width / 2 - PLAYER_SIZE / 2,
      y: startPlatform.y - PLAYER_SIZE, // 발판 위에 정확히 올림
      vy: 0,
      prevY: startPlatform.y - PLAYER_SIZE,
      onGround: false,
      jumpCount: 0,
      },
      platforms,
      cameraY: 0,
      maxHeight: 0,
    };

    setScore(0);
    setRunning(true);
  };

  useEffect(() => {
    initGame();
  }, []);

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

      // 카메라 이동 (위로 올라가면 화면 따라감)
      if (p.y < GAME_HEIGHT / 2) {
        const diff = GAME_HEIGHT / 2 - p.y;
        p.y = GAME_HEIGHT / 2;
        state.cameraY += diff;

        state.platforms.forEach((plat) => {
          plat.y += diff;
        });

        state.maxHeight += diff;
        setScore(Math.floor(state.maxHeight));
      }

      // 플랫폼 재생성
      state.platforms = state.platforms.filter(
        (plat) => plat.y < GAME_HEIGHT + 20
      );

      while (state.platforms.length < 12) {
        const highest = Math.min(
          ...state.platforms.map((p) => p.y)
        );
        state.platforms.push(randomPlatform(highest - 60));
      }

      // 낙하하면 게임 오버
      if (p.y > GAME_HEIGHT) {
        setRunning(false);
      }

      // 그리기
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

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
  }, [running]);

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center gap-4 p-4 bg-slate-900 text-white">
      <h1 className="text-2xl font-bold">클라이밍 점프 게임</h1>

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

      <div className="text-lg">높이 점수: {score}</div>

      <div className="text-sm opacity-70">
        ← → 방향키로 이동
      </div>
    </div>
  );
}
