import React, { useEffect, useRef, useState, useCallback } from "react";
import './App.css';
import playerImgSrc from "./assets/images/player-def.png";
import playerJumpImgSrc from "./assets/images/player-jump.png";
import bg0 from "./assets/images/bg-image0.jpg";
import bg1Tile from "./assets/images/bg-image1.jpeg";
import bg1Start from "./assets/images/bg-image1-2.png";
import bg2Tile from "./assets/images/bg-image2.jpeg";
import bg2Start from "./assets/images/bg-image2-2.png";
import bg3Tile from "./assets/images/bg-image3.jpeg";
import bg3Start from "./assets/images/bg-image3-2.png";
import bg4Tile from "./assets/images/bg-image4.jpeg";
import bg4Start from "./assets/images/bg-image4-2.png";
import bg5Tile from "./assets/images/bg-image5.jpeg";
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

// 80km 이전: 100픽셀 = 1km
// 80km 이후: 25픽셀 = 1km (4배 빠르게)
function getKmFromPixels(pixels) {
  if (pixels <= 8000) return pixels / 100;
  return 80 + (pixels - 8000) / 25; 
}

function getPixelsFromKm(km) {
  if (km <= 80) return km * 100;
  return 8000 + (km - 80) * 25;
}

function randomPlatform(y, prevX) {
  const distance = (GAME_HEIGHT - 40) - y;
  const estimatedHeight = getKmFromPixels(distance);
  const isHardMode = estimatedHeight >= 80;
  const platWidth = isHardMode ? 60 : 80;
  const maxX = GAME_WIDTH - platWidth;

  let newX;
  
  // 첫 발판이거나 prevX가 없으면 그냥 랜덤 생성
  if (prevX === undefined) {
    newX = Math.random() * maxX;
  } else {
    // 이전 발판과 최소 40 이상 차이나도록 좌표 뽑기
    let attempts = 0;
    do {
      newX = Math.random() * maxX;
      attempts++;
    } while (Math.abs(newX - prevX) < 40 && attempts < 20); 
    // attempts < 20은 무한루프 방지용 안전장치입니다.
  }

  return {
    x: newX,
    y: y,
    width: platWidth,
    height: 10,
    dx: isHardMode ? (Math.random() > 0.5 ? 2 : -2) : 0, 
  };
}

export default function ClimbGame() {
  const canvasRef = useRef(null);
  const keys = useRef({ left: false, right: false, jump: false });
  const animationRef = useRef(null);
  const playerImg = useRef(new Image());
  const playerJumpImg = useRef(new Image());
  const bgImages = useRef({});
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

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

  const gameState = useRef(null);

  const initGame = useCallback(() => {
    const platforms = [];
    const startPlatform = {
      x:  0,
      y: GAME_HEIGHT - 40,
      width: GAME_WIDTH,
      height: 12,
      dx: 0,
    };
    platforms.push(startPlatform);

    let lastX = GAME_WIDTH / 2; // 처음 기준점은 화면 중앙

    for (let i = 1; i < 1000; i++) {
      // 이전 발판의 위치(lastX)를 넘겨서 새 발판을 만듦
      const newPlat = randomPlatform(GAME_HEIGHT - 40 - i * 100, lastX);
      platforms.push(newPlat);
      
      // 방금 만든 발판의 위치를 다음 발판을 위해 저장
      lastX = newPlat.x; 
    }

    gameState.current = {
      player: {
        x: GAME_WIDTH / 2 - 40,
        y: startPlatform.y - PLAYER_SIZE,
        vy: 0,
        prevY: startPlatform.y - PLAYER_SIZE,
        onGround: false,
        jumpCount: 0,
      },
      platforms,
      cameraY: 0,
      maxHeight: 0,
      totalHeight: 0,
      startY: startPlatform.y - PLAYER_SIZE,  //게임 시작 시점의 위치 저장
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
      "지표면": bg0,
      "대류권_시작": bg1Start,
      "대류권_반복": bg1Tile,
      "성층권_시작": bg2Start,
      "성층권_반복": bg2Tile,
      "중간권_시작": bg3Start,
      "중간권_반복": bg3Tile,
      "열권_시작": bg4Start,
      "열권_반복": bg4Tile,
      "외기권_반복": bg5Tile,
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
    const saved = localStorage.getItem("climbHighScore");
    if (saved) setHighScore(parseFloat(saved));
  }, []);

  useEffect(() => {
    const currentScoreNum = parseFloat(score);
    if (currentScoreNum > highScore) {
      setHighScore(currentScoreNum);
      localStorage.setItem("climbHighScore", currentScoreNum.toString());
    }
  }, [score, highScore]); // 점수가 오를 때마다 최고 기록과 비교

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
      if (p.x > GAME_WIDTH - 55) {
        p.x = GAME_WIDTH - 55;
      }

      state.platforms.forEach((plat) => {
        if (plat.dx !== 0) {
          plat.x += plat.dx;
          // 화면 양끝 벽에 부딪히면 튕기기
          if (plat.x <= 0 || plat.x + plat.width >= GAME_WIDTH) {
            plat.dx *= -1;
          }
        }
      });

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
          p.x += (plat.dx || 0);  //발판의 속도만큼 플레이어 x좌표도 이동시킴
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
        (plat) => plat.y < GAME_HEIGHT + 100
      );

      while (state.platforms.length < 15) {
        // 현재 존재하는 발판 중 가장 높은(y가 가장 작은) 발판을 찾음
        const highestPlat = state.platforms.reduce((highest, plat) => 
          plat.y < highest.y ? plat : highest
        );
        
        // 그 발판의 y좌표에서 100만큼 위로, 그리고 x좌표를 참고하여 새 발판 생성
        const newPlat = randomPlatform(highestPlat.y - 100, highestPlat.x);
        state.platforms.push(newPlat);
      }

      // 낙하하면 게임 오버
      if (p.y > GAME_HEIGHT + 800) {
        setRunning(false);
      }

      //실시간 위치 기반 점수 계산
      const rawScore = state.totalHeight + (state.startY - p.y);
      const actualKm = getKmFromPixels(rawScore); // 새 변환 함수 사용
      const formattedScore = actualKm.toFixed(2);
      setScore(rawScore > 0 ? formattedScore : "0.00");

      // 그리기
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      // --- [추가] 지표면(빌딩숲) 배경 그리기 ---
      const cityImg = bgImages.current["지표면"];
      if (cityImg) {
        // 이미지 비율에 맞춘 렌더링 높이 계산
        const cityRenderHeight = cityImg.height * (GAME_WIDTH / cityImg.width);
        // 캐릭터가 서 있는 바닥(state.startY) 위치에 이미지를 배치
        // + 40은 바닥 플랫폼의 높이를 고려한 보정값입니다.
        const cityCanvasY = state.startY - cityRenderHeight + state.cameraY + 80;

        if (cityCanvasY < GAME_HEIGHT && cityCanvasY + cityRenderHeight > 0) {
          ctx.drawImage(cityImg, 0, cityCanvasY, GAME_WIDTH, cityRenderHeight);
        }
      }
      const bgList = [  
        { startImg: bgImages.current["대류권_시작"], tileImg: bgImages.current["대류권_반복"], start: 1.3, end: 10 },
        { startImg: bgImages.current["성층권_시작"], tileImg: bgImages.current["성층권_반복"], start: 10, end: 50 },
        { startImg: bgImages.current["중간권_시작"], tileImg: bgImages.current["중간권_반복"], start: 50, end: 80 },
        { startImg: bgImages.current["열권_시작"], tileImg: bgImages.current["열권_반복"], start: 80, end: 500 },
        { startImg: null, tileImg: bgImages.current["외기권_반복"], start: 500, end: 1000 },
      ];

      bgList.forEach((layer) => {
        // 현재 구간의 Y좌표 (화면 기준)
        const startY = state.startY - getPixelsFromKm(layer.start) + state.cameraY;
        const endY = state.startY - getPixelsFromKm(layer.end) + state.cameraY;
        
        let tileStartY = startY; // 반복(타일) 이미지가 그려지기 시작할 기준점

        // 1. [구간 시작점] 화면 크기(GAME_HEIGHT)만큼 딱 한 번 시작 이미지 그리기
        if (layer.startImg && layer.startImg.complete) {
          // 이미지가 그려질 맨 위쪽 Y좌표 계산
          const startImgY = startY - GAME_HEIGHT; 
          
          // 화면에 보일 때만 렌더링 (최적화)
          if (startImgY < GAME_HEIGHT && startImgY + GAME_HEIGHT > 0) {
            ctx.drawImage(layer.startImg, 0, startImgY, GAME_WIDTH, GAME_HEIGHT);
          }
          
          // 시작 이미지가 화면 높이만큼 차지했으므로, 반복 이미지는 그 위에서부터 시작
          tileStartY = startY - GAME_HEIGHT; 
        }

        // 2. [나머지 구간] 기존 이미지를 반복(타일링)해서 그리기
        if (layer.tileImg && layer.tileImg.complete) {
          const tileRenderHeight = layer.tileImg.height * (GAME_WIDTH / layer.tileImg.width);

          for (let currentY = tileStartY - tileRenderHeight; currentY >= endY - tileRenderHeight; currentY -= tileRenderHeight) {
            if (currentY < GAME_HEIGHT && currentY + tileRenderHeight > 0) {
              ctx.drawImage(layer.tileImg, 0, currentY, GAME_WIDTH, tileRenderHeight);
            }
          }
        }
      });

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

  return (
    <div className="game-container">
      {/* 1. 제목 */}
      <h1 className="game-title">대기권 알아보기</h1>

      {/* 2. 가로 배치 컨테이너 */}
      <div className="game-layout">
        
        {/* [왼쪽] 게임 화면 (Canvas) */}
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            style={{ display: 'block' }}
          />
        </div>

        {/* [오른쪽] 정보창 */}
        <div 
          className="info-panel" 
          style={{ width: `${GAME_WIDTH}px`, height: `${GAME_HEIGHT}px` }} 
        >
          {/* 현재 위치 */}
          <div className="current-location">
            현재 위치: {atmosphereName}
          </div>

          {/* 지표면 고도 */}
          <div className="altitude-text">
            지표면에서 {score}km
          </div>
          
          {/* 최고 고도 */}
          <div className="highscore-text">
            최고 기록: {highScore} km
          </div>

          {/* 대기권 설명 */}
          <div className="desc-box">
            <div className="desc-box-title">{atmosphereName} 정보</div>
            {atmosphereName === "대류권" && "기상 현상이 발생하는 층으로, 위로 갈수록 기온이 낮아집니다."}
            {atmosphereName === "성층권" && "안정한 층이며 오존층이 있어 자외선을 차단해줍니다."}
            {atmosphereName === "중간권" && "기온이 매우 낮으며 유성이 타기 시작하는 층입니다."}
            {atmosphereName === "열권" && "공기가 매우 희박하며 오로라가 관측되는 층입니다."}
            {atmosphereName === "외기권 (우주)" && "지구 대기권의 가장 바깥쪽 경계 지역입니다."}
          </div>

          {/* 게임 종료 안내 및 버튼 */}
          <div className="status-area">
            {!running ? (
              <div>
                <div className="game-over-text">흥 나락갔쥬?</div>
                <button 
                  className="restart-btn"
                  onClick={initGame}
                >
                  다시 시작
                </button>
              </div>
            ) : (
              <div className="playing-text">열심히 탐사 중...</div>
            )}
          </div>

          {/* 조작 설명 */}
          <div className="controls-guide">
            <div>• 이동 : 방향키</div>
            <div>• 점프 : Space</div>
            <div>• 더블점프 : 점프상태에서 Space</div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
