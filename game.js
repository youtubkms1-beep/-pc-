// ==========================================================
// 게임 상수 및 설정
// ==========================================================
const MAX_LEVEL = 50; 
const DROP_INTERVAL_MIN = 100; 
const DROP_INTERVAL_MAX = 1000;
const INPUT_DELAY_MS = 200; 

let lastInputTime = 0; 
let selectedStartLevel = 1; 

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

// --- 캔버스 크기 조정 (세로 20칸, BLOCK_SIZE 30으로 확대) ---
const COLS = 10;
const ROWS = 20; 
const BLOCK_SIZE = 30; // 블록 크기를 30px로 사용 (캔버스 300x600)

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;
// ---------------------------------

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
let easterEggShown = false;
let displayEasterEggMessage = false; // 이스터 에그 메시지 출력 플래그

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

// --- 레벨 및 난이도 조정 함수 (레벨에 따른 속도 증가 로직) ---
function calculateDropInterval(currentLevel) {
    if (currentLevel >= MAX_LEVEL) return DROP_INTERVAL_MIN;

    const levelRange = MAX_LEVEL - 1;
    const speedRange = DROP_INTERVAL_MAX - DROP_INTERVAL_MIN;
    
    // 현재 레벨에 따른 속도 감소량 (레벨이 오를수록 속도는 증가)
    const reduction = (currentLevel - 1) * (speedRange / levelRange);
    
    return Math.max(DROP_INTERVAL_MIN, DROP_INTERVAL_MAX - reduction);
}

function updateLevel() {
    const newLevel = Math.min(MAX_LEVEL, Math.floor(lines / 10) + 1);
    
    if (newLevel > level) {
        level = newLevel;
        // 새로운 드롭 간격 계산 (속도 증가)
        dropInterval = calculateDropInterval(level); 
        
        // 게임 루프 타이머 재설정 (새로운 난이도 적용)
        clearInterval(gameLoopInterval);
        gameLoopInterval = setInterval(gameLoop, dropInterval);
    }

    if (levelElement) levelElement.textContent = level;
}

// --- 이스터 에그 표시 함수 ---
function showEasterEgg() {
    if (easterEggShown) return;
    easterEggShown = true;
    displayEasterEggMessage = true;
    
    // 3초 후 메시지 제거
    setTimeout(() => {
        displayEasterEggMessage = false;
        draw(); // 화면 갱신
    }, 3000); 
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
    
    // 블록이 고정될 때 흰색으로 변경
    const mergeColor = 'white'; 
    
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const gridY = currentPiece.y + row;
                const gridX = currentPiece.x + col;
                if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) { 
                    grid[gridY][gridX] = mergeColor; // 흰색으로 병합
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
            y++; 
        }
    }
    if (linesCleared > 0) {
        // 레벨에 비례하여 점수 증가
        const baseScore = linesCleared === 1 ? 100 : 
                          linesCleared === 2 ? 300 :
                          linesCleared === 3 ? 500 : 800;
                          
        const levelMultiplier = 1 + (level * 0.1); 
        const lineScore = Math.floor(baseScore * levelMultiplier); 
        
        score += lineScore;
        lines += linesCleared;
        
        updateLevel(); // 레벨 업데이트 호출
        
        // ⭐ 이스터 에그 체크
        if (!easterEggShown && score >= 80000) {
            showEasterEgg();
        }
        
        if (scoreElement) scoreElement.textContent = score;
        if (linesClearedElement) linesClearedElement.textContent = lines; 
    }
}
function drawBlock(x, y, color, context) { 
    if (color) {
        context.fillStyle = color;
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
    // 세로선
    for (let x = 1; x < COLS; x++) {
        context.beginPath();
        context.moveTo(x * BLOCK_SIZE, 0);
        context.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        context.stroke();
    }
    // 가로선
    for (let y = 1; y < ROWS; y++) {
        context.beginPath();
        context.moveTo(0, y * BLOCK_SIZE);
        context.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
        context.stroke();
    }
}
function draw() { 
    if (!ctx) return;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGridLines(ctx); 
    
    // 쌓인 블록 그리기 (흰색 고정 블록 포함)
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
    
    // ⭐ 이스터 에그 메시지 표시
    if (displayEasterEggMessage) {
        ctx.save();
        ctx.fillStyle = '#ff00ff';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.font = 'bold 50px Jua, Noto Sans KR, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const message = "이걸 깨내!";
        ctx.strokeText(message, canvas.width / 2, canvas.height / 2);
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
        ctx.restore();
    }
    
    drawNextPiece();
}
function drawNextPiece() { 
    if (!nextCtx) return;
    nextCtx.fillStyle = '#222';
    // 캔버스 크기(120x120)는 그대로 두고 BLOCK_SIZE(30)를 사용하여 그립니다.
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPiece) {
        const shape = nextPiece.shape;
        const color = nextPiece.color;
        
        const pieceWidth = shape[0].length;
        const pieceHeight = shape.length;
        // 다음 블록 캔버스에 맞게 중앙 정렬
        const centerOffset = (120 / BLOCK_SIZE / 2); 
        const centerX = centerOffset - (pieceWidth / 2);
        const centerY = centerOffset - (pieceHeight / 2);
        
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
    
    const currentTime = Date.now();
    // 하강(down)을 제외한 이동에만 딜레이 적용
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

// ⭐ 하드 드롭 기능 구현
function hardDropPiece() {
    if (isGameOver || isPaused || !currentPiece) return;
    
    let dropCount = 0;
    // 블록이 이동할 수 없을 때까지 Y좌표 증가
    while (isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        dropCount++;
    }
    
    // 하드 드롭 점수 보너스 (칸당 2점)
    score += dropCount * 2; 
    if (scoreElement) scoreElement.textContent = score;

    // 즉시 병합 및 다음 블록 생성
    mergePiece();
    checkLines();
    currentPiece = nextPiece;
    nextPiece = spawnPiece();
    
    // 다음 블록이 놓일 수 없으면 게임 오버
    if (!isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y)) { 
        gameOver(); 
    }
    draw();
    
    // 하드 드롭 후 다음 루프까지 대기 시간 없이 즉시 실행
    clearInterval(gameLoopInterval);
    gameLoopInterval = setInterval(gameLoop, dropInterval);
}


// ==========================================================
// 키보드 입력 처리 (PC)
// ==========================================================
function handleKeyPress(e) {
    // 1. N(재시작) 키 처리 
    if (e.key.toLowerCase() === 'n') {
        e.preventDefault(); 
        if (isGameOver || !isGameOver) { 
            window.hideGameOverPopup(); 
            window.startGame(); 
        } 
        return;
    }
    
    // 2. P(일시정지) 키 처리
    if (e.key.toLowerCase() === 'p') { 
        e.preventDefault();
        if (!isGameOver) { 
            isPaused = !isPaused; 
            if (isPaused) { 
                clearInterval(gameLoopInterval);
                clearInterval(timeLoopInterval); 
            } else {
                // 시간 복원
                startTime = Date.now() - (Math.floor((Date.now() - startTime) / 1000) * 1000); 
                timeLoopInterval = setInterval(updateGameTime, 1000); 
                gameLoopInterval = setInterval(gameLoop, dropInterval);
            }
            draw(); 
        }
        return;
    }

    // 3. 게임 오버 또는 일시정지 상태에서는 다른 키 무시
    if (isGameOver || isPaused) { e.preventDefault(); return; }

    // 4. 스페이스바(하드 드롭) 처리
    if (e.key.toLowerCase() === ' ') {
        e.preventDefault();
        hardDropPiece(); 
        return; 
    }

    // 5. 나머지 이동 키 처리
    let direction;
    switch (e.key.toLowerCase()) {
        case 'arrowleft': case 'a': direction = 'left'; break;
        case 'arrowright': case 'd': direction = 'right'; break;
        case 'arrowdown': case 's': direction = 'down'; break;
        case 'arrowup': case 'w': case 'x': case 'control': direction = 'rotate'; break;
        default: return; 
    }

    if (movePiece(direction)) { 
        e.preventDefault();
    }
}

// ==========================================================
// HTML에서 접근 가능하도록 window 객체에 할당 (메인 진입점/컨트롤)
// ==========================================================

// 모바일 컨트롤 생성 함수
window.createMobileControls = function() {
    const container = document.getElementById('mobile-controls-container');
    if (!container) return; 
    container.innerHTML = '<div id="mobile-controls-grid"></div>'; 
    const controlsGrid = document.getElementById('mobile-controls-grid');
    if (!controlsGrid) return;

    const buttons = [
        // ⭐ 회전 화살표(&#x21BB;)로 변경
        ['&#x21BB;', 'rotate', 'rotate-btn'], 
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

        const handleAction = (e) => {
            e.preventDefault(); 
            e.stopPropagation(); 
            if (isGameOver || isPaused) return; 
            
            if (action === 'drop') {
                hardDropPiece(); 
            } else {
                movePiece(action); 
            }
        };

        // passive: false를 사용하여 touchstart/touchend에서 preventDefault를 허용
        btn.addEventListener('touchstart', handleAction, { passive: false }); 
        btn.addEventListener('mousedown', handleAction);
        
        const handleRelease = (e) => { e.preventDefault(); e.stopPropagation(); };
        btn.addEventListener('touchend', handleRelease, { passive: false }); 
        btn.addEventListener('mouseup', handleRelease);
        
        controlsGrid.appendChild(btn);
    });
};

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

window.loadGame = function(mode) {
    isMobileMode = (mode === 'mobile');
    const selectorScreen = document.getElementById('selector-screen');
    const mainGameContent = document.getElementById('main-game-content');
    
    const levelInput = document.getElementById('start-level');
    let selectedLevel = parseInt(levelInput.value) || 1;
    selectedStartLevel = Math.max(1, Math.min(MAX_LEVEL, selectedLevel));
    
    if (selectorScreen) selectorScreen.style.display = 'none';
    if (mainGameContent) mainGameContent.style.display = 'flex'; 

    const mobileControlsContainer = document.getElementById('mobile-controls-container');
    if (mobileControlsContainer) { 
        if (isMobileMode) {
            window.createMobileControls();
            mobileControlsContainer.style.display = 'block'; 
        } else {
            mobileControlsContainer.style.display = 'none';
        }
    }
    window.startGame();
}

window.startGame = function() {
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    if (timeLoopInterval) clearInterval(timeLoopInterval);
    isGameOver = false;
    isPaused = false;
    grid = createGrid();
    score = 0;
    lines = 0;
    
    // 이스터 에그 상태 초기화
    easterEggShown = false;
    displayEasterEggMessage = false;
    
    level = selectedStartLevel; 
    dropInterval = calculateDropInterval(level); 
    
    startTime = Date.now();
    timeLoopInterval = setInterval(updateGameTime, 1000);
    
    if (scoreElement) scoreElement.textContent = score;
    if (levelElement) levelElement.textContent = level; 
    if (linesClearedElement) linesClearedElement.textContent = lines;
    if (timeElement) timeElement.textContent = '00:00';
    loadHighScore(); 
    
    lastInputTime = Date.now(); 
    currentPiece = spawnPiece();
    nextPiece = spawnPiece();
    
    document.removeEventListener('keydown', handleKeyPress);
    document.addEventListener('keydown', handleKeyPress);
    
    gameLoopInterval = setInterval(gameLoop, dropInterval); 
    draw();
};

// ==========================================================
// 메인 루프
// ==========================================================
function gameLoop() {
    if (isGameOver || isPaused) return; 
    if (!currentPiece) return; 
    
    if (isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
    } else {
        mergePiece();
        checkLines();
        currentPiece = nextPiece;
        nextPiece = spawnPiece();
        
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
            // 캔버스 크기를 JS에서 설정한 대로 다시 강제 적용
            canvas.width = COLS * BLOCK_SIZE;
            canvas.height = ROWS * BLOCK_SIZE;
            draw(); 
        }
    }
    window.addEventListener('load', initializeOnLoad, { once: true });
})();
