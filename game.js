/* Google Fonts: Jua (귀여운 글씨체)와 Noto Sans KR 추가 */
@import url('https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;700&display=swap');

body {
    /* 폰트를 Jua로 설정, 없으면 Noto Sans KR 사용 */
    font-family: 'Jua', 'Noto Sans KR', Arial, sans-serif;
    background-color: #333;
    color: #eee;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    overflow: auto; 
}
/* ---------------------------------- */
/* 1. 환경 선택 화면 스타일 (현대적 디자인) */
/* ---------------------------------- */
#selector-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    /* 배경 그라디언트 적용 */
    background: linear-gradient(135deg, #1f1c2c 0%, #4a415a 100%); 
    color: white;
    display: none; 
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}
#selector-screen h1, #selector-screen h2 {
    font-family: 'Jua', sans-serif;
    color: #ffd700;
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
}
.level-select-group {
    margin: 20px 0;
    font-size: 20px;
    color: #a0f0ff;
    font-weight: bold;
    display: flex;
    flex-direction: column;
    align-items: center;
}
#start-level {
    font-size: 20px;
    padding: 10px;
    width: 80px;
    text-align: center;
    border-radius: 10px; 
    border: 2px solid #555;
    margin-top: 15px;
    background-color: #2a2a2a;
    color: white;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}
.select-button {
    padding: 15px 35px;
    margin: 15px;
    font-size: 24px;
    cursor: pointer;
    background-color: #00bcd4; 
    color: white;
    border: none;
    border-radius: 50px; 
    transition: background-color 0.2s, transform 0.1s, box-shadow 0.2s;
    font-weight: bold;
    box-shadow: 0 6px 10px rgba(0, 0, 0, 0.4);
    font-family: 'Jua', sans-serif;
}
.select-button:hover {
    background-color: #00a8bb;
    transform: translateY(-2px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.5);
}

/* ---------------------------------- */
/* 2. 메인 게임 레이아웃 */
/* ---------------------------------- */
.game-container {
    display: none; 
    flex-direction: column; 
    align-items: center;
    gap: 15px; 
    padding: 20px;
    /* ⭐ 배경 수정: 어두운 자주색/보라색 계열로 변경하여 시작 화면과 통일감 */
    background: linear-gradient(145deg, #1f1c2c, #353344); 
    border: 5px solid #6a5acd; /* 보라색 테두리 */
    border-radius: 15px;
    position: relative; 
    max-width: 95vw; 
    min-height: calc(100vh - 40px); 
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5); /* 그림자 추가 */
}

h1#game-title {
    color: #ffd700;
    text-shadow: 1px 1px 5px #000; /* 제목 그림자 추가 */
    margin-bottom: 5px;
    font-size: 28px;
    text-align: center;
    width: 100%;
}

/* 캔버스 크기는 JS에서 300x600으로 설정됨 */
#tetris-canvas {
    border: 5px solid #222;
    /* ⭐ 캔버스 배경 수정: 어두운 패턴 느낌으로 변경 */
    background-color: #0d0c11; 
    max-width: 100%;
    height: auto;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.9); /* 내부 그림자 추가 */
}

/* 다음 블록 캔버스 크기 조정 (JS의 BLOCK_SIZE=30에 맞춤) */
#next-piece-canvas {
    width: 120px; /* 4 블록 크기 */
    height: 120px;
}

.info {
    display: flex;
    flex-direction: column;
    text-align: left;
    min-width: 180px;
    margin-top: 10px; 
    font-family: 'Noto Sans KR', sans-serif;
}
.info span { font-weight: bold; color: #00ff99; }
.key-highlight { color: #ff6666; font-weight: 700; }

/* ---------------------------------- */
/* 3. 미디어 쿼리 (PC vs 모바일 레이아웃) */
/* ---------------------------------- */
@media (min-width: 900px) { /* PC 레이아웃 (캔버스 크기가 300x600이므로 800->900으로 조정) */
    .game-container { 
        flex-direction: row; 
        max-width: none; 
        min-height: auto; 
    }
    #mobile-controls-container { display: none !important; }
}

@media (max-width: 900px) {
    .game-container {
        /* 모바일 컨트롤 영역 축소에 맞춤 */
        padding-bottom: 150px; 
        width: 100%; 
        max-width: none; 
        box-sizing: border-box;
        gap: 5px; 
    }
    
    #game-title { display: none; } 

    /* 캔버스 최대 높이 설정 (모바일에서 너무 커지지 않도록) */
    #tetris-canvas {
        max-height: 70vh; /* 화면 높이에 맞게 조절 */
        width: auto; 
    }
    
    /* 컨트롤러 컨테이너 높이 축소 */
    #mobile-controls-container {
        position: fixed; 
        bottom: 0;       
        left: 0;
        width: 100%;
        height: 130px; 
        padding: 10px;
        box-sizing: border-box;
        background-color: rgba(34, 34, 34, 0.95); 
        z-index: 1000; 
        box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.5);
        display: none; 
    }

    .controls { display: none; }
    .info { align-items: center; width: 100%; }
    .stats-row { max-width: 300px; } /* 캔버스 너비에 맞춤 */
    #next-piece-canvas { margin-bottom: 5px; }

    /* 모바일 폰트 및 마진 축소 */
    .info p { margin: 3px 0; font-size: 14px; }
    .info span { font-size: 16px; } 
}


/* ---------------------------------- */
/* 4. 모바일 컨트롤 디자인 (버튼 둥글게) */
/* ---------------------------------- */
#mobile-controls-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr; 
    grid-template-rows: 1fr 1fr; 
    gap: 5px 10px; 
    width: 95%;
    max-width: 500px; 
    height: 100%;
    margin: 0 auto;
    align-items: center; 
    justify-items: center; 
}
.mobile-control-btn {
    /* 기존 스타일 유지하면서 border-radius만 50%로 설정 */
    border-radius: 50%; 
    width: 65px; 
    height: 65px; 
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.6); 
    color: white;
    font-size: 1.1em;
    font-family: 'Jua', sans-serif;
    border: none;
    cursor: pointer;
    transition: background-color 0.1s;
}
/* ⭐ 회전 버튼에 회전 화살표 폰트 크기 조정 */
#rotate-btn { 
    background-color: #4CAF50; 
    font-size: 28px; /* 회전 기호가 잘 보이도록 크게 */
    line-height: 1;
}
#left-btn { background-color: #ff6666; }
#down-btn { background-color: #ff6666; }
#right-btn { background-color: #ff6666; }
#drop-btn { background-color: #007bff; font-size: 0.9em; }

/* ---------------------------------- */
/* 5. 게임 오버 팝업 스타일 */
/* ---------------------------------- */
.hidden-popup {
    display: none !important;
}
#game-over-popup {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}
.popup-content {
    background-color: #222;
    padding: 30px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    font-family: 'Jua', sans-serif;
}
.popup-content h2 {
    color: #ffcc00;
    margin-top: 0;
    font-size: 2em;
}
.popup-content button {
    padding: 10px 20px;
    margin-top: 20px;
    font-size: 1.1em;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 50px; 
    cursor: pointer;
    transition: background-color 0.2s;
    font-family: 'Jua', sans-serif;
}
.popup-content button:hover {
    background-color: #45a049;
}
