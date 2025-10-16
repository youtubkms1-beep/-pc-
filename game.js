// ==========================================================
// 지연 난이도 설정
// ==========================================================
const DELAY_TIME_MS = 200; 
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
    { shape: [[0,1,0],[1,1,1],[0,0,0]], color: 'magenta' },
    { shape: [[1,1],[1,1]], color: 'yellow' },
    { shape: [[0,1,1],[1,1,0],[0,0,0]], color: 'green' },
    { shape: [[1,1,0],[0,1,1],[0,0,0]], color: 'red' },
    { shape: [[1,0,0],[1,1,1],[0,0,0]], color: 'orange'},
    { shape: [[0,0,1],[1,1,1],[0,0,0]], color: 'blue' },
    { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: 'cyan' }
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
    for (let y = 0; y < N; y++) { for (let x = 0; x < N; x++) { newShape[x][N - 1 - y] = shape[y][x]; } }
    return newShape;
}
function isValidMove(shape, x, y) { 
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const newX = x + col;
                const newY = y + row;
                if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && grid[newY][newX])) { return false; } 
            }
        }
    }
    return true;
}

function mergePiece() { 
    if (!currentPiece) return; 
    
    const mergeColor = 'white'; 
    
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const gridY = currentPiece.y + row;
                const gridX = currentPiece.x + col;
                if (gridY >= 0) { 
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
            grid.splice(y, 1);
            grid.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++;
        }
    }
    
    if (linesCleared > 0) {
        const baseScore = 1000 * linesCleared;
        const lineScore = baseScore + (linesCleared * level * 50); 
        score += lineScore;
        lines += linesCleared;
        
        if (Math.floor(lines / 10) + 1 > level) {
            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(100, 1000 - (level - 1) * 100); 
            
            clearInterval(gameLoopInterval);
            gameLoopInterval = setInterval(gameLoop, dropInterval);
        }
        if (scoreElement) scoreElement.textContent = score;
        if (levelElement) levelElement.textContent = level;
        if (linesClearedElement) linesClearedElement.textContent = lines; 
    }
}

function drawBlock(x, y, color, context) {
    if (color) {
        context.fillStyle = color;
        context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        context.strokeStyle = 'rgba(0, 0, 0, 0.2)'; 
        context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
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
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGridLines(ctx); 

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x]) { drawBlock(x, y, grid[y][x], ctx); }
        }
    }
    
    if (currentPiece) { 
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col]) {
                    drawBlock(currentPiece.x + col, currentPiece.y + row, currentPiece.color, ctx);
                }
            }
        }
    }
    
    if (isPaused && !isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 3, canvas.width, canvas.height / 6);
        ctx.fillStyle = 'white';
        ctx.font = '24px Noto Sans KR, Arial';
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
        const startX = (nextCanvas.width / 2) / BLOCK_SIZE - (shape[0].length / 2);
        const startY = (nextCanvas.height / 2) / BLOCK_SIZE - (shape.length / 2);
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) { 
                    drawBlock(col + startX, row + startY, color, nextCtx); 
                }
            }
        }
    }
}


// ----------------------------------------------------------------------------------
// 지연 입력 처리 함수
// ----------------------------------------------------------------------------------
function handleKeyPress(e) {
    
    // 1. P와 N 키 처리
    switch (e.key.toLowerCase()) {
        case 'n': 
            e.preventDefault(); 
            if (isGameOver) { 
                hideGameOverPopup();
                window.startGame(); 
            }
            return;
        case 'p': 
            e.preventDefault();
            if (!isGameOver) { 
                isPaused = !isPaused; 
                if (isPaused) {
                    clearInterval(timeLoopInterval); 
                } else {
                    startTime = Date.now() - (Math.floor((Date.now() - startTime) / 1000) * 1000); 
                    timeLoopInterval = setInterval(updateGameTime, 1000); 
                }
                draw(); 
            }
            return;
    }
    
    // 2. 게임 오버 또는 일시정지 상태에서는 다른 키 무시
    if (isGameOver || isPaused) {
        e.preventDefault();
        return;
    }

    // 3. 스페이스바(하드 드롭) 처리
    if (e.key.toLowerCase() === ' ') {
        e.preventDefault();
        
        if (!currentPiece) return; 
        
        let hardDropPoints = 0;
        while (isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
            currentPiece.y++;
            hardDropPoints++;
        }
        
        score += hardDropPoints * 2;
        if (scoreElement) scoreElement.textContent = score;
        
        mergePiece();
        checkLines();
        
        currentPiece = nextPiece;
        nextPiece = spawnPiece();
        
        if (!isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y)) {
            gameOver();
        }

        draw(); 
        return; 
    }

    // 4. 나머지 이동 키에 대해서만 지연 시간 확인
    const currentTime = Date.now();
    if (currentTime - lastInputTime < DELAY_TIME_MS) {
        return; 
    }

    if (!currentPiece) return; 

    let handled = false;
    let newX = currentPiece.x;
    let newY = currentPiece.y;
    let newShape = currentPiece.shape;

    switch (e.key.toLowerCase()) {
        case 'arrowleft': case 'a': newX--; handled = true; break;
        case 'arrowright': case 'd': newX++; handled = true; break;
        case 'arrowdown': case 's': 
            newY++; 
            if (isValidMove(currentPiece.shape, currentPiece.x, newY)) {
                score += 1; 
                if (scoreElement) scoreElement.textContent = score;
            }
            handled = true; break;
        case 'arrowup': case 'w': case 'x': 
            newShape = rotatePiece(currentPiece.shape); handled = true; break;
    }

    // 5. 유효한 이동이면 블록 업데이트
    if (handled) { 
        e.preventDefault();
        if (isValidMove(newShape, newX, newY)) {
            currentPiece.shape = newShape;
            currentPiece.x = newX;
            currentPiece.y = newY;
        }
        lastInputTime = currentTime; 
        draw(); 
    }
}

// 게임 오버 로직
function gameOver() {
    if (isGameOver) return; 
    isGameOver = true;
    clearInterval(gameLoopInterval);
    clearInterval(timeLoopInterval); 
    document.removeEventListener('keydown', handleKeyPress); 
    
    let emptyCells = 0;
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x] === 0) {
                emptyCells++;
            }
        }
    }
    
    const bonusScore = Math.floor(emptyCells * 0.5); 
    const finalScore = score + bonusScore; 
    
    score = finalScore;
    if (scoreElement) scoreElement.textContent = score; 

    showGameOverPopup(finalScore, bonusScore); 
}


// ==========================================================
// ⭐ 추가된 모바일/팝업/시작 제어 함수
// ==========================================================

// 1. 모바일 컨트롤 생성 및 이벤트 연결
function createMobileControls() {
    const container = document.getElementById('mobile-controls-container');
    if (!container) return; 
    
    container.innerHTML = '<div id="mobile-controls-grid"></div>'; 
    
    const controlsGrid = document.getElementById('mobile-controls-grid');
    if (!controlsGrid) return;

    // 버튼 데이터: [텍스트, 키 코드, 버튼 ID]
    const buttons = [
        ['⬆️ 회전', 'w', 'rotate-btn'], 
        ['⬅️', 'a', 'left-btn'], 
        ['⬇️', 's', 'down-btn'], 
        ['➡️', 'd', 'right-btn'],
        ['DROP', ' ', 'drop-btn']
    ];
    
    // 키 이벤트 디스패처
    const dispatchKeyEvent = (type, keyName) => {
        window.dispatchEvent(new KeyboardEvent(type, {
            'key': keyName, 
            'code': (keyName === ' ') ? 'Space' : keyName.toUpperCase(),
            'bubbles': true 
        }));
    };

    buttons.forEach(([text, keyName, idName]) => {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.className = 'mobile-control-btn';
        btn.id = idName;

        // touchstart (키 다운 역할)
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault(); 
            dispatchKeyEvent('keydown', keyName);
        }, { passive: false });
        
        // touchend (키 업 역할)
        btn.addEventListener('touchend', (e) => {
            e.preventDefault(); 
            dispatchKeyEvent('keyup', keyName);
        }, { passive: false });
        
        controlsGrid.appendChild(btn);
    });
}

// 2. 팝업 표시/숨김 함수
function showGameOverPopup(finalScore, bonusScore) {
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
    // 1. 환경 설정 및 화면 전환
    isMobileMode = (mode === 'mobile');
    
    // ⭐ HTML 요소 존재 확인 후 화면 전환
    const selectorScreen = document.getElementById('selector-screen');
    const mainGameContent = document.getElementById('main-game-content');
    
    if (selectorScreen) selectorScreen.style.display = 'none';
    if (mainGameContent) mainGameContent.style.display = 'flex'; 

    // 2. 모바일 컨트롤 추가/제거
    const mobileControlsContainer = document.getElementById('mobile-controls-container');
    if (mobileControlsContainer) { 
        if (isMobileMode) {
            createMobileControls();
            mobileControlsContainer.style.display = 'block'; 
        } else {
            mobileControlsContainer.style.display = 'none';
        }
    }

    // 3. 실제 게임 시작
    window.startGame();
}

// 4. 게임 초기화 및 루프 시작
window.startGame = function() {
    // 기존 인터벌 정리
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    if (timeLoopInterval) clearInterval(timeLoopInterval);

    isGameOver = false;
    isPaused = false;
    grid = createGrid();
    score = 0;
    level = 1; 
    lines = 0;
    dropInterval = 1000; 
    
    // 시간 초기화 및 시작
    startTime = Date.now();
    timeLoopInterval = setInterval(updateGameTime, 1000);

    // 요소 값 초기화
    if (scoreElement) scoreElement.textContent = score;
    if (levelElement) levelElement.textContent = level; 
    if (linesClearedElement) linesClearedElement.textContent = lines;
    if (timeElement) timeElement.textContent = '00:00';
    
    loadHighScore(); 
    lastInputTime = Date.now(); 
    
    currentPiece = spawnPiece();
    nextPiece = spawnPiece();
    
    // 키 리스너 정리 및 추가 (PC/모바일 공용)
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

// ⭐ 페이지 로드 시 초기 화면만 보이도록 설정 (DOMContentLoaded를 대체하여 강제 실행)
(function() {
    const selectorScreen = document.getElementById('selector-screen');
    const mainGameContent = document.getElementById('main-game-content');
    
    if (selectorScreen && mainGameContent) {
        mainGameContent.style.display = 'none'; 
        selectorScreen.style.display = 'flex';  
        loadHighScore();
        draw(); 
    } else {
        // HTML 요소 로드 지연 시 대비 (Live Server가 아닌 환경)
        window.addEventListener('load', () => {
            if (selectorScreen && mainGameContent) {
                mainGameContent.style.display = 'none'; 
                selectorScreen.style.display = 'flex';  
                loadHighScore();
                draw(); 
            }
        });
    }
})();
