// ==========================================================
// 게임 상수 및 설정
// ==========================================================
const MAX_LEVEL = 50; // ⭐ 최대 레벨 50 설정
const DROP_INTERVAL_MIN = 100; // ⭐ 50레벨에서 100ms 간격 (극악 난이도)
const DROP_INTERVAL_MAX = 1000;
const INPUT_DELAY_MS = 200; // 블록 좌우 이동 입력 지연 시간

let lastInputTime = 0; 

// ==========================================================
// 게임 변수 및 캔버스 설정
// ==========================================================
const canvas = document.getElementById('tetris-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level'); 
const timeElement = document.getElementById('time');
const linesClearedElement = document.getElementById('lines-cleared');
const highScoreElement = document.getElementById('high-score');
const nextCanvas = document.getElementById('next-piece-canvas');
const nextCtx = nextCanvas.getContext('2d');
const selectorScreen = document.getElementById('selector-screen'); 
const mainGameContent = document.getElementById('main-game-content'); 

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
let grid = createGrid();
let score = 0;
let level = 1;
let lines = 0;
let currentPiece = null;
let nextPiece = null;
let gameLoopInterval;
let timeLoopInterval; 
let startTime; 
let isGameOver = false;
let isPaused = false; 
let dropInterval = 1000; 
let isMobileMode = false;

// 블록 모양 정의 (Tetrominoes)
const TETROMINOES = [
    { shape: [[0,1,0],[1,1,1],[0,0,0]], color: 'magenta' }, // T
    { shape: [[1,1],[1,1]], color: 'yellow' }, // O
    { shape: [[0,1,1],[1,1,0],[0,0,0]], color: 'green' }, // S
    { shape: [[1,1,0],[0,1,1],[0,0,0]], color: 'red' }, // Z
    { shape: [[1,0,0],[1,1,1],[0,0,0]], color: 'orange'}, // J
    { shape: [[0,0,1],[1,1,1],[0,0,0]], color: 'blue' }, // L
    { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: 'cyan' } // I
];

// --- 시간 및 랭킹 관리 함수 ---
function loadHighScore() {
    const savedScore = localStorage.getItem('tetrisHighScore');
    const highScore = savedScore ? parseInt(savedScore) : 0;
    if (highScoreElement) highScoreElement.textContent = highScore;
    return highScore;
}
function updateHighScore(finalScore) {
    let currentHighScore = loadHighScore();
    if (finalScore > currentHighScore) {
        localStorage.setItem('tetrisHighScore', finalScore);
        if (highScoreElement) highScoreElement.textContent = finalScore;
        return true;
    }
    return false;
}
function updateGameTime() {
    if (isPaused || isGameOver) return;
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const displayTime = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    if (timeElement) timeElement.textContent = displayTime;
}

// --- 레벨 및 난이도 조정 함수 ---
function calculateDropInterval(currentLevel) {
    // 레벨 1부터 MAX_LEVEL까지 선형적으로 속도가 빨라지도록 계산
    if (currentLevel >= MAX_LEVEL) return DROP_INTERVAL_MIN;

    const levelRange = MAX_LEVEL - 1;
    const speedRange = DROP_INTERVAL_MAX - DROP_INTERVAL_MIN;
    
    // 현재 레벨에 따른 속도 감소량
    const reduction = (currentLevel - 1) * (speedRange / levelRange);
    
    return Math.max(DROP_INTERVAL_MIN, DROP_INTERVAL_MAX - reduction);
}

function updateLevel() {
    const newLevel = Math.min(MAX_LEVEL, Math.floor(lines / 10) + 1);
    
    if (newLevel > level) {
        level = newLevel;
        // 새로운 드롭 간격 계산
        dropInterval = calculateDropInterval(level); 
        
        // 게임 루프 타이머 재설정 (새로운 난이도 적용)
        clearInterval(gameLoopInterval);
        gameLoopInterval = setInterval(gameLoop, dropInterval);
    }

    if (levelElement) levelElement.textContent = level;
}


// --- 게임 핵심 로직 함수 ---
function createGrid() { return Array.from({ length: ROWS }, () => Array(COLS).fill(0)); }
function spawnPiece() { 
    const randIndex = Math.floor(Math.random() * TETROMINOES.length);
    const { shape, color } = TETROMINOES[randIndex];
    return { 
        shape: shape, 
        color: color, 
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), 
        y: 0 
    };
}
function rotatePiece(shape) { 
    const N = shape.length;
    const newShape = Array.from({ length: N }, () => Array(N).fill(0));
    // 90도 시계 방향 회전 (x, y) -> (N-1-y, x)
    for (let y = 0; y < N; y++) { 
        for (let x = 0; x < N; x++) { 
            newShape[x][N - 1 - y] = shape[y][x]; 
        } 
    }
    return newShape;
}
function isValidMove(shape, x, y) { 
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const newX = x + col;
                const newY = y + row;
                // 경계 체크 및 기존 블록 충돌 체크
                if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && grid[newY][newX])) { 
                    return false; 
                } 
            }
        }
    }
    return true;
}
function mergePiece() { 
    if (!currentPiece) return; 
    const mergeColor = currentPiece.color; // 현재 블록의 색상으로 병합
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const gridY = currentPiece.y + row;
                const gridX = currentPiece.x + col;
                // 그리드 범위 내에서만 병합
                if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) { 
                    grid[gridY][gridX] = mergeColor; 
                }
            }
        }
    }
}
function checkLines() { 
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (grid[y].every(cell => cell !== 0)) {
            // 라인 제거 및 그리드 상단에 새 빈 라인 추가
            grid.splice(y, 1);
            grid.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++; // 라인이 제거되었으므로 인덱스를 다시 검사
        }
    }
    if (linesCleared > 0) {
        // ⭐ 점수 계산 로직: 레벨에 비례하여 점수 증가
        const baseScore = linesCleared === 1 ? 100 : 
                          linesCleared === 2 ? 300 :
                          linesCleared === 3 ? 500 : 800; // 테트리스(4줄) 800점
                          
        const levelMultiplier = 1 + (level * 0.1); 
        const lineScore = Math.floor(baseScore * levelMultiplier); 
        
        score += lineScore;
        lines += linesCleared;
        
        updateLevel(); // 레벨 업데이트 호출
        
        if (scoreElement) scoreElement.textContent = score;
        if (linesClearedElement) linesClearedElement.textContent = lines; 
    }
}
function drawBlock(x, y, color, context) { 
    if (color) {
        context.fillStyle = color;
        // 외곽선 효과를 위해 1픽셀 작은 크기로 그림
        context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        context.strokeStyle = 'rgba(0, 0, 0, 0.4)'; 
        context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        
        // 하이라이트 효과 추가 (약간의 입체감)
        context.fillStyle = 'rgba(255, 255, 255, 0.3)';
        context.fillRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, 3);
    }
}
function drawGridLines(context) { 
    context.strokeStyle = '#333'; 
    context.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
        context.beginPath();
        context.moveTo(x * BLOCK_SIZE, 0);
        context.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        context.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
        context.beginPath();
        context.moveTo(0, y * BLOCK_SIZE);
        context.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
        context.stroke();
    }
}
function draw() { 
    if (!ctx) return;
    // 캔버스 초기화
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGridLines(ctx); 
    
    // 쌓인 블록 그리기
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x]) { drawBlock(x, y, grid[y][x], ctx); }
        }
    }
    
    // 현재 떨어지는 블록 그리기
    if (currentPiece) { 
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col]) {
                    drawBlock(currentPiece.x + col, currentPiece.y + row, currentPiece.color, ctx);
                }
            }
        }
    }
    
    // 일시정지 메시지
    if (isPaused && !isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 3, canvas.width, canvas.height / 6);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 30px Noto Sans KR, Arial';
        ctx.textAlign = 'center';
        ctx.fillText("일시정지 (P)", canvas.width / 2, canvas.height / 2 + 10);
    }
    drawNextPiece();
}
function drawNextPiece() { 
    if (!nextCtx) return;
    nextCtx.fillStyle = '#222';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPiece) {
        const shape = nextPiece.shape;
        const color = nextPiece.color;
        
        // 다음 블록을 캔버스 중앙에 배치하기 위한 계산
        const pieceWidth = shape[0].length;
        const pieceHeight = shape.length;
        const centerX = (nextCanvas.width / BLOCK_SIZE / 2) - (pieceWidth / 2);
        const centerY = (nextCanvas.height / BLOCK_SIZE / 2) - (pieceHeight / 2);
        
        for (let row = 0; row < pieceHeight; row++) {
            for (let col = 0; col < pieceWidth; col++) {
                if (shape[row][col]) { 
                    drawBlock(col + centerX, row + centerY, color, nextCtx); 
                }
            }
        }
    }
}
function gameOver() { 
    if (isGameOver) return; 
    isGameOver = true;
    clearInterval(gameLoopInterval);
    clearInterval(timeLoopInterval); 
    document.removeEventListener('keydown', handleKeyPress); 
    
    // 최종 점수 계산 (빈 공간 0.5점 보너스)
    let emptyCells = 0;
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x] === 0) { emptyCells++; }
        }
    }
    const bonusScore = Math.floor(emptyCells * 0.5); 
    const finalScore = score + bonusScore; 
    score = finalScore;
    if (scoreElement) scoreElement.textContent = score; 
    window.showGameOverPopup(finalScore, bonusScore);
}

// ==========================================================
// 이동/회전/하드 드롭 핵심 로직 (터치/키보드 공용)
// ==========================================================

function movePiece(direction) {
    if (isGameOver || isPaused || !currentPiece) return false;
    
    // ⭐ 입력 지연 시간 체크: 빠른 이동 방지 및 난이도 조절
    const currentTime = Date.now();
    if (direction !== 'down' && currentTime - lastInputTime < INPUT_DELAY_MS) { 
        return false; 
    }
    lastInputTime = currentTime; 

    let newX = currentPiece.x;
    let newY = currentPiece.y;
    let newShape = currentPiece.shape;
    let handled = false;

    switch (direction) {
        case 'left': newX--; handled = true; break;
        case 'right': newX++; handled = true; break;
        case 'down': 
            newY++; 
            // 소프트 드롭 시 점수 보너스
            if (isValidMove(currentPiece.shape, currentPiece.x, newY)) {
                score += 1; 
                if (scoreElement) scoreElement.textContent = score;
            }
            handled = true; break;
        case 'rotate':
            newShape = rotatePiece(currentPiece.shape);
            handled = true;
            break;
    }

    if (handled) {
        if (isValidMove(newShape, newX, newY)) {
            currentPiece.shape = newShape;
            currentPiece.x = newX;
            currentPiece.y = newY;
            draw();
            return true;
        }
    }
    return false;
}

function hardDropPiece() {
    if (isGameOver || isPaused || !currentPiece) return;
    
    let hardDropPoints = 0;
    while (isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        hardDropPoints++;
    }
    // 하드 드롭 시 점수 보너스 (1칸당 2점)
    score += hardDropPoints * 2;
    if (scoreElement) scoreElement.textContent = score;
    
    // 블록 병합 및 다음 블록 준비
    mergePiece();
    checkLines();
    currentPiece = nextPiece;
    nextPiece = spawnPiece();
    
    // 다음 블록이 스폰되자마자 충돌하면 게임 오버
    if (!isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y)) { gameOver(); }
    draw(); 
}

// ==========================================================
// 키보드 입력 처리 (PC)
// ==========================================================
function handleKeyPress(e) {
    // 1. P(일시정지)와 N(새 게임) 키 처리
    switch (e.key.toLowerCase()) {
        case 'n': 
            e.preventDefault(); 
            if (isGameOver) { window.hideGameOverPopup(); window.startGame(); }
            return;
        case 'p': 
            e.preventDefault();
            if (!isGameOver) { 
                isPaused = !isPaused; 
                if (isPaused) { 
                    clearInterval(gameLoopInterval);
                    clearInterval(timeLoopInterval); 
                } else {
                    // 시간 타이머 재시작 (정지된 시간만큼 제외)
                    startTime = Date.now() - (Math.floor((Date.now() - startTime) / 1000) * 1000); 
                    timeLoopInterval = setInterval(updateGameTime, 1000); 
                    // 게임 루프 재시작 (현재 레벨 속도 유지)
                    gameLoopInterval = setInterval(gameLoop, dropInterval);
                }
                draw(); 
            }
            return;
    }

    // 2. 게임 오버 또는 일시정지 상태에서는 다른 키 무시
    if (isGameOver || isPaused) { e.preventDefault(); return; }

    // 3. 스페이스바(하드 드롭) 처리
    if (e.key.toLowerCase() === ' ') {
        e.preventDefault();
        hardDropPiece(); 
        return; 
    }

    // 4. 나머지 이동 키 처리
    let direction;
    switch (e.key.toLowerCase()) {
        case 'arrowleft': case 'a': direction = 'left'; break;
        case 'arrowright': case 'd': direction = 'right'; break;
        case 'arrowdown': case 's': direction = 'down'; break;
        case 'arrowup': case 'w': case 'x': direction = 'rotate'; break;
        default: return; // 처리할 키가 아니면 종료
    }

    if (movePiece(direction)) { 
        e.preventDefault();
    }
}

// ==========================================================
// HTML에서 접근 가능하도록 window 객체에 할당 (모바일 컨트롤)
// ==========================================================

// 1. 모바일 컨트롤 생성 및 이벤트 연결
function createMobileControls() {
    const container = document.getElementById('mobile-controls-container');
    if (!container) return; 
    container.innerHTML = '<div id="mobile-controls-grid"></div>'; 
    const controlsGrid = document.getElementById('mobile-controls-grid');
    if (!controlsGrid) return;

    // 버튼 데이터: [텍스트, 이동 방향, ID]
    const buttons = [
        ['⬆️', 'rotate', 'rotate-btn'], 
        ['⬅️', 'left', 'left-btn'], 
        ['⬇️', 'down', 'down-btn'], 
        ['➡️', 'right', 'right-btn'],
        ['하드<br>드롭', 'drop', 'drop-btn']
    ];
    
    buttons.forEach(([text, action, idName]) => {
        const btn = document.createElement('button');
        btn.innerHTML = text;
        btn.className = 'mobile-control-btn';
        btn.id = idName;

        // 핵심: 터치 시 해당 동작 함수를 직접 호출
        const handleAction = (e) => {
            e.preventDefault(); 
            e.stopPropagation(); 
            if (isGameOver || isPaused) return; // 게임 중이 아닐 때 터치 무시
            
            if (action === 'drop') {
                hardDropPiece(); 
            } else {
                // movePiece는 내부에서 INPUT_DELAY_MS를 체크함
                movePiece(action); 
            }
        };

        // 터치 시작 이벤트 (passive: false는 스크롤 방지, 필수)
        btn.addEventListener('touchstart', handleAction, { passive: false }); 
        
        // 마우스 클릭 이벤트 (PC 환경 디버깅용)
        btn.addEventListener('mousedown', handleAction);
        
        // touchend, mouseup 이벤트 (버튼을 뗄 때 아무 작업 없음)
        const handleRelease = (e) => { e.preventDefault(); e.stopPropagation(); };
        btn.addEventListener('touchend', handleRelease, { passive: false }); 
        btn.addEventListener('mouseup', handleRelease);
        
        controlsGrid.appendChild(btn);
    });
}

// 2. 팝업 표시/숨김 함수
window.showGameOverPopup = function(finalScore, bonusScore) {
    const popup = document.getElementById('game-over-popup');
    if (!popup) return;
    let isNewRecord = updateHighScore(finalScore);
    let currentHighScore = loadHighScore();
    const title = document.getElementById('popup-title');
    const scoreInfo = document.getElementById('popup-score-info');
    const highScoreInfo = document.getElementById('popup-high-score-info');
    if (title) title.textContent = isNewRecord ? "🎉 최고 점수 갱신! 🎉" : "게임 오버!";
    if (scoreInfo) scoreInfo.innerHTML = `최종 점수: ${finalScore}점 <small>(+ 보너스 ${bonusScore}점)</small>`;
    if (highScoreInfo) highScoreInfo.textContent = `최고 점수: ${currentHighScore}점`;
    popup.classList.remove('hidden-popup');
}
window.hideGameOverPopup = function() {
    const popup = document.getElementById('game-over-popup');
    if (popup) popup.classList.add('hidden-popup');
}


// 3. 메인 진입점 함수 (환경 설정 후 게임 시작)
window.loadGame = function(mode) {
    isMobileMode = (mode === 'mobile');
    const selectorScreen = document.getElementById('selector-screen');
    const mainGameContent = document.getElementById('main-game-content');
    
    if (selectorScreen) selectorScreen.style.display = 'none';
    if (mainGameContent) mainGameContent.style.display = 'flex'; 

    const mobileControlsContainer = document.getElementById('mobile-controls-container');
    if (mobileControlsContainer) { 
        if (isMobileMode) {
            createMobileControls();
            mobileControlsContainer.style.display = 'block'; 
        } else {
            mobileControlsContainer.style.display = 'none';
        }
    }
    window.startGame();
}

// 4. 게임 초기화 및 루프 시작
window.startGame = function() {
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    if (timeLoopInterval) clearInterval(timeLoopInterval);
    isGameOver = false;
    isPaused = false;
    grid = createGrid();
    score = 0;
    level = 1; 
    lines = 0;
    dropInterval = DROP_INTERVAL_MAX; // 초기 드롭 간격 설정 (1000ms)
    startTime = Date.now();
    timeLoopInterval = setInterval(updateGameTime, 1000);
    
    // UI 업데이트
    if (scoreElement) scoreElement.textContent = score;
    if (levelElement) levelElement.textContent = level; 
    if (linesClearedElement) linesClearedElement.textContent = lines;
    if (timeElement) timeElement.textContent = '00:00';
    loadHighScore(); 
    
    lastInputTime = Date.now(); 
    currentPiece = spawnPiece();
    nextPiece = spawnPiece();
    
    // 키보드 이벤트 리스너 설정 (PC 환경)
    document.removeEventListener('keydown', handleKeyPress);
    document.addEventListener('keydown', handleKeyPress);
    
    // 게임 루프 시작
    gameLoopInterval = setInterval(gameLoop, dropInterval); 
    draw();
};

// ==========================================================
// 메인 루프
// ==========================================================
function gameLoop() {
    if (isGameOver || isPaused) return; 
    if (!currentPiece) return; 
    
    // 블록 한 칸 내리기 시도
    if (isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
    } else {
        // 더 이상 내려갈 수 없으면 병합하고 다음 블록 스폰
        mergePiece();
        checkLines();
        currentPiece = nextPiece;
        nextPiece = spawnPiece();
        
        // 다음 블록 스폰 후 즉시 충돌 확인
        if (!isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y)) { 
            gameOver(); 
        }
    }
    draw();
}

// 페이지 로드 시 초기 화면만 보이도록 설정
(function() {
    function initializeOnLoad() {
        const selectorScreen = document.getElementById('selector-screen');
        const mainGameContent = document.getElementById('main-game-content');
        
        if (selectorScreen && mainGameContent) {
            mainGameContent.style.display = 'none'; 
            selectorScreen.style.display = 'flex'; 
            loadHighScore();
            draw(); // 초기 화면에서 Next Canvas를 그리기 위해 호출
        }
    }
    window.addEventListener('load', initializeOnLoad, { once: true });
})();
