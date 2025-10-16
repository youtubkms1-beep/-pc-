// ==========================================================
// 지연 난이도 설정
// ==========================================================
const DELAY_TIME_MS = 200; // 0.2초 지연 (밀리초)
let lastInputTime = 0; // 마지막 키 입력 시간 저장

// ==========================================================
// 게임 변수 및 캔버스 설정
// ==========================================================
const canvas = document.getElementById('tetris-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level'); 
// ⭐ 추가된 요소 변수
const timeElement = document.getElementById('time');
const linesClearedElement = document.getElementById('lines-cleared');
const highScoreElement = document.getElementById('high-score');
// ⭐
const nextCanvas = document.getElementById('next-piece-canvas');
const nextCtx = nextCanvas.getContext('2d');

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
let timeLoopInterval; // ⭐ 시간 측정용 인터벌
let startTime; // ⭐ 게임 시작 시간
let isGameOver = false;
let isPaused = false; 
let dropInterval = 1000; 

// 블록 모양 정의 (Tetrominoes)
const TETROMINOES = [
    { shape: [[0,1,0],[1,1,1],[0,0,0]], color: 'cyan' },
    { shape: [[1,1],[1,1]], color: 'yellow' },
    { shape: [[0,1,1],[1,1,0],[0,0,0]], color: 'green' },
    { shape: [[1,1,0],[0,1,1],[0,0,0]], color: 'red' },
    { shape: [[1,0,0],[1,1,1],[0,0,0]], color: 'orange'},
    { shape: [[0,0,1],[1,1,1],[0,0,0]], color: 'blue' },
    { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: 'magenta' }
];

// --- 시간 및 랭킹 관리 함수 ---

function loadHighScore() {
    const savedScore = localStorage.getItem('tetrisHighScore');
    const highScore = savedScore ? parseInt(savedScore) : 0;
    highScoreElement.textContent = highScore;
    return highScore;
}

function updateHighScore() {
    let currentHighScore = loadHighScore();
    if (score > currentHighScore) {
        localStorage.setItem('tetrisHighScore', score);
        highScoreElement.textContent = score;
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
        
    timeElement.textContent = displayTime;
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
        scoreElement.textContent = score;
        levelElement.textContent = level;
        linesClearedElement.textContent = lines; // ⭐ 라인 수 업데이트
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
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("일시정지 (P)", canvas.width / 2, canvas.height / 2 - 10);
    }
    
    drawNextPiece();
}

function drawNextPiece() { 
    nextCtx.fillStyle = '#222';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const shape = nextPiece.shape;
        const color = nextPiece.color;
        const startX = (nextCanvas.width / 2 / BLOCK_SIZE) - (shape[0].length / 2);
        const startY = (nextCanvas.height / 2 / BLOCK_SIZE) - (shape.length / 2);
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) { drawBlock(col + startX, row + startY, color, nextCtx); }
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
            startGame(); 
            return;
        case 'p': 
            e.preventDefault();
            if (!isGameOver) { 
                isPaused = !isPaused; 
                if (isPaused) {
                    clearInterval(timeLoopInterval); // ⭐ 일시정지 시 시간 멈춤
                } else {
                    startTime = Date.now() - (Math.floor((Date.now() - startTime) / 1000) * 1000); // 시간 보정
                    timeLoopInterval = setInterval(updateGameTime, 1000); // ⭐ 재개 시 시간 다시 흐름
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
        scoreElement.textContent = score;
        
        mergePiece();
        checkLines();
        
        if (nextPiece) {
            currentPiece = nextPiece;
            nextPiece = spawnPiece();
        } else {
            currentPiece = spawnPiece(); 
            nextPiece = spawnPiece();
        }
        
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
                scoreElement.textContent = score;
            }
            handled = true; break;
        case 'arrowup': case 'w': case 'x': 
            newShape = rotatePiece(currentPiece.shape); handled = true; break;
    }

    // 6. 유효한 이동이면 블록 업데이트
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

// 게임 오버 로직 (잔여 공간 점수 계산 포함)
function gameOver() {
    if (isGameOver) return; 
    isGameOver = true;
    clearInterval(gameLoopInterval);
    clearInterval(timeLoopInterval); // ⭐ 시간 측정 중단
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
    score += bonusScore;
    scoreElement.textContent = score;
    
    const newHighScore = updateHighScore(); // ⭐ 최고 점수 업데이트 및 확인
    
    alert(`게임 오버! \n${newHighScore ? '🎉 새로운 최고 점수 달성! 🎉\n' : ''}최종 수상한 점수: ${score}점\n총 파괴 라인: ${lines}줄\n(빈 공간 보너스: ${bonusScore}점)\n레벨: ${level}`);
}


// ==========================================================
// 메인 루프 및 게임 시작
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
    
    // ⭐ 시간 초기화 및 시작
    startTime = Date.now();
    timeLoopInterval = setInterval(updateGameTime, 1000);

    // 요소 값 초기화
    scoreElement.textContent = score;
    levelElement.textContent = level; 
    linesClearedElement.textContent = lines;
    timeElement.textContent = '00:00';
    loadHighScore(); // 최고 점수 로드
    lastInputTime = Date.now(); 
    
    currentPiece = spawnPiece();
    nextPiece = spawnPiece();
    
    document.removeEventListener('keydown', handleKeyPress);
    document.removeEventListener('keydown', handleKeyPress); 
    document.addEventListener('keydown', handleKeyPress);
    
    gameLoopInterval = setInterval(gameLoop, dropInterval); 
    draw();
};

// 페이지 로드 시 최고 점수 표시
loadHighScore();
draw();