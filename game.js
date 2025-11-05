// 五子棋游戏类
class GomokuGame {
    constructor() {
        this.boardSize = 15;
        this.cellSize = 40;
        this.board = [];
        this.currentPlayer = 1; // 1 = 黑棋(玩家), 2 = 白棋(电脑)
        this.gameOver = false;
        this.moveHistory = [];
        this.difficulty = 'medium';

        // 性能优化：置换表缓存
        this.transpositionTable = new Map();
        this.maxCacheSize = 200000; // 扩大缓存容量

        // AI增强：延长搜索时间限制
        this.searchStartTime = 0;
        this.maxSearchTime = 30000; // 最多30秒，不限制AI思考

        // 初始化画布
        this.canvas = document.getElementById('board');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.cellSize * (this.boardSize + 1);
        this.canvas.height = this.cellSize * (this.boardSize + 1);

        // 初始化棋盘
        this.initBoard();
        this.drawBoard();

        // 绑定事件
        this.bindEvents();
    }

    initBoard() {
        this.board = [];
        for (let i = 0; i < this.boardSize; i++) {
            this.board[i] = [];
            for (let j = 0; j < this.boardSize; j++) {
                this.board[i][j] = 0;
            }
        }
        this.currentPlayer = 1;
        this.gameOver = false;
        this.moveHistory = [];
        this.transpositionTable.clear(); // 清空缓存
        this.updateStatus('黑棋先手，请下棋');
    }

    bindEvents() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        document.getElementById('restart').addEventListener('click', () => this.restart());
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
        });
    }

    handleClick(e) {
        if (this.gameOver || this.currentPlayer === 2) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 修复：正确计算点击位置到棋盘坐标的映射
        // 棋盘第一个交叉点在 (cellSize, cellSize)
        const col = Math.round(x / this.cellSize) - 1;
        const row = Math.round(y / this.cellSize) - 1;

        if (this.isValidMove(row, col)) {
            this.makeMove(row, col);
        }
    }

    isValidMove(row, col) {
        return row >= 0 && row < this.boardSize &&
               col >= 0 && col < this.boardSize &&
               this.board[row][col] === 0;
    }

    makeMove(row, col) {
        this.board[row][col] = this.currentPlayer;
        this.moveHistory.push({ row, col, player: this.currentPlayer });

        // 重新绘制整个棋盘以更新标记显示
        this.redrawBoard();

        if (this.checkWin(row, col)) {
            this.gameOver = true;
            const winner = this.currentPlayer === 1 ? '黑棋（玩家）' : '白棋（电脑）';
            this.updateStatus(`${winner}获胜！`, true);
            return;
        }

        if (this.isBoardFull()) {
            this.gameOver = true;
            this.updateStatus('平局！');
            return;
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;

        if (this.currentPlayer === 2) {
            this.updateStatus('电脑思考中...');
            setTimeout(() => this.aiMove(), 300);
        } else {
            this.updateStatus('轮到玩家，请下棋');
        }
    }

    aiMove() {
        let move;

        if (this.difficulty === 'easy') {
            move = this.getEasyMove();
        } else if (this.difficulty === 'medium') {
            move = this.getMediumMove();
        } else {
            move = this.getHardMove();
        }

        if (move) {
            this.makeMove(move.row, move.col);
        }
    }

    // 简单AI：随机选择
    getEasyMove() {
        const emptyCells = [];
        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                if (this.board[i][j] === 0) {
                    emptyCells.push({ row: i, col: j });
                }
            }
        }
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    // 中等AI：使用Minimax算法（增强深度）
    getMediumMove() {
        const moveCount = this.moveHistory.length;
        // 中等AI增强：深度4-5层
        const depth = moveCount < 8 ? 4 : moveCount < 16 ? 5 : 5;
        return this.minimaxSearch(depth);
    }

    // 困难AI：顶级Minimax + Alpha-Beta剪枝（超强深度）
    getHardMove() {
        const moveCount = this.moveHistory.length;
        // 顶级AI：早期6层，中期7层，后期8层
        const depth = moveCount < 6 ? 6 : moveCount < 12 ? 7 : 8;
        return this.minimaxSearch(depth);
    }

    // Minimax搜索主函数（增强版）
    minimaxSearch(maxDepth) {
        this.searchStartTime = Date.now();
        const candidates = this.getCandidateMoves();

        // 即时获胜检查
        for (const move of candidates) {
            this.board[move.row][move.col] = 2;
            if (this.checkWin(move.row, move.col)) {
                this.board[move.row][move.col] = 0;
                return move;
            }
            this.board[move.row][move.col] = 0;
        }

        // 即时防守检查
        for (const move of candidates) {
            this.board[move.row][move.col] = 1;
            if (this.checkWin(move.row, move.col)) {
                this.board[move.row][move.col] = 0;
                return move;
            }
            this.board[move.row][move.col] = 0;
        }

        // 顶级VCF搜索：无条件执行，深度更高
        if (this.moveHistory.length >= 6) {
            const vcfMove = this.searchVCF(2, 6); // 深度6层VCF
            if (vcfMove) return vcfMove;

            const defenseVCF = this.searchVCF(1, 6); // 防守也用6层
            if (defenseVCF) return defenseVCF;
        }

        // 检查活三威胁
        for (const move of candidates) {
            this.board[move.row][move.col] = 2;
            const threats = this.getThreatLevel(move.row, move.col, 2);
            this.board[move.row][move.col] = 0;

            // 如果能形成双活三，立即采用
            if (threats.liveThree >= 2) {
                return move;
            }
        }

        // 防守对手双活三
        for (const move of candidates) {
            this.board[move.row][move.col] = 1;
            const threats = this.getThreatLevel(move.row, move.col, 1);
            this.board[move.row][move.col] = 0;

            if (threats.liveThree >= 2) {
                return move;
            }
        }

        // 移动排序：按威胁值排序，优化Alpha-Beta剪枝效率
        const sortedMoves = this.sortMovesByThreat(candidates);

        // 顶级AI：搜索所有候选移动，不设上限
        const topMoves = sortedMoves;

        let bestMove = topMoves[0];
        let bestScore = -Infinity;
        let alpha = -Infinity;
        const beta = Infinity;

        for (const move of topMoves) {
            // 检查时间限制
            if (Date.now() - this.searchStartTime > this.maxSearchTime) {
                break;
            }

            this.board[move.row][move.col] = 2;
            const score = this.minimax(maxDepth - 1, false, alpha, beta);
            this.board[move.row][move.col] = 0;

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
            alpha = Math.max(alpha, score);
        }

        return bestMove;
    }

    // 生成棋盘哈希键（用于置换表）
    getBoardHash() {
        let hash = '';
        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                hash += this.board[i][j];
            }
        }
        return hash;
    }

    // Minimax算法实现（带Alpha-Beta剪枝和置换表优化）
    minimax(depth, isMaximizing, alpha, beta) {
        // 时间限制检查
        if (Date.now() - this.searchStartTime > this.maxSearchTime) {
            return 0;
        }

        // 检查置换表
        const boardHash = this.getBoardHash();
        const cacheKey = `${boardHash}_${depth}_${isMaximizing}`;
        if (this.transpositionTable.has(cacheKey)) {
            return this.transpositionTable.get(cacheKey);
        }

        // 检查游戏结束状态
        const gameState = this.evaluateGameState();
        if (gameState !== null) return gameState;

        if (depth === 0) {
            const score = this.evaluateBoardState();
            return score;
        }

        const candidates = this.getCandidateMoves();

        // 顶级AI：使用所有候选移动，不限制
        const limitedCandidates = candidates;

        if (isMaximizing) {
            let maxScore = -Infinity;
            for (const move of limitedCandidates) {
                this.board[move.row][move.col] = 2;
                const score = this.minimax(depth - 1, false, alpha, beta);
                this.board[move.row][move.col] = 0;

                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break; // Beta剪枝
            }

            // 存入置换表
            if (this.transpositionTable.size < this.maxCacheSize) {
                this.transpositionTable.set(cacheKey, maxScore);
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            for (const move of limitedCandidates) {
                this.board[move.row][move.col] = 1;
                const score = this.minimax(depth - 1, true, alpha, beta);
                this.board[move.row][move.col] = 0;

                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break; // Alpha剪枝
            }

            // 存入置换表
            if (this.transpositionTable.size < this.maxCacheSize) {
                this.transpositionTable.set(cacheKey, minScore);
            }
            return minScore;
        }
    }

    // VCF搜索：Victory by Continuous Four（连续冲四获胜）
    searchVCF(player, maxDepth) {
        if (maxDepth <= 0) return null;

        const candidates = this.getCandidateMoves();

        for (const move of candidates) {
            this.board[move.row][move.col] = player;

            // 检查是否形成冲四或活四
            const threats = this.getThreatLevel(move.row, move.col, player);

            if (threats.winningMove) {
                this.board[move.row][move.col] = 0;
                return move;
            }

            if (threats.liveFour || threats.rushFour) {
                // 模拟对手防守
                const defenses = this.getDefenseMoves(move.row, move.col, player);
                let allDefensesFail = true;

                for (const defense of defenses) {
                    if (this.board[defense.row][defense.col] !== 0) continue;

                    this.board[defense.row][defense.col] = 3 - player; // 对手
                    const nextVCF = this.searchVCF(player, maxDepth - 1);
                    this.board[defense.row][defense.col] = 0;

                    if (!nextVCF) {
                        allDefensesFail = false;
                        break;
                    }
                }

                this.board[move.row][move.col] = 0;
                if (allDefensesFail && defenses.length > 0) {
                    return move;
                }
            } else {
                this.board[move.row][move.col] = 0;
            }
        }

        return null;
    }

    // 获取防守位置
    getDefenseMoves(row, col, attackPlayer) {
        const defenses = [];
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

        for (const [dx, dy] of directions) {
            // 正方向
            for (let i = 1; i <= 4; i++) {
                const r = row + dx * i;
                const c = col + dy * i;
                if (this.isInBounds(r, c) && this.board[r][c] === 0) {
                    defenses.push({ row: r, col: c });
                }
                if (!this.isInBounds(r, c) || this.board[r][c] !== attackPlayer) break;
            }

            // 反方向
            for (let i = 1; i <= 4; i++) {
                const r = row - dx * i;
                const c = col - dy * i;
                if (this.isInBounds(r, c) && this.board[r][c] === 0) {
                    defenses.push({ row: r, col: c });
                }
                if (!this.isInBounds(r, c) || this.board[r][c] !== attackPlayer) break;
            }
        }

        return defenses;
    }

    // 按威胁值排序移动
    sortMovesByThreat(moves) {
        return moves.map(move => {
            this.board[move.row][move.col] = 2;
            const aiScore = this.evaluatePositionScore(move.row, move.col, 2);
            this.board[move.row][move.col] = 1;
            const humanScore = this.evaluatePositionScore(move.row, move.col, 1);
            this.board[move.row][move.col] = 0;

            return {
                ...move,
                score: aiScore + humanScore * 1.1
            };
        }).sort((a, b) => b.score - a.score);
    }

    // 评估游戏状态（胜/负/平）
    evaluateGameState() {
        // 检查AI是否获胜
        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                if (this.board[i][j] === 2) {
                    if (this.checkWin(i, j)) return 100000;
                }
                if (this.board[i][j] === 1) {
                    if (this.checkWin(i, j)) return -100000;
                }
            }
        }
        return null;
    }

    // 评估整个棋盘状态
    evaluateBoardState() {
        let score = 0;

        // 评估所有棋子的价值
        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                if (this.board[i][j] === 2) {
                    score += this.evaluatePositionScore(i, j, 2);
                } else if (this.board[i][j] === 1) {
                    score -= this.evaluatePositionScore(i, j, 1) * 1.1;
                }
            }
        }

        return score;
    }

    // 评估单个位置的得分
    evaluatePositionScore(row, col, player) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        let totalScore = 0;

        for (const [dx, dy] of directions) {
            const pattern = this.getLinePattern(row, col, dx, dy, player);
            totalScore += this.getPatternScore(pattern, true);
        }

        return totalScore;
    }

    // 获取威胁等级
    getThreatLevel(row, col, player) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        let liveFour = false;
        let rushFour = false;
        let liveThree = 0;
        let winningMove = false;

        for (const [dx, dy] of directions) {
            const pattern = this.getLinePattern(row, col, dx, dy, player);

            if (pattern.count >= 5) winningMove = true;
            if (pattern.count === 4 && pattern.openEnds === 2) liveFour = true;
            if (pattern.count === 4 && pattern.openEnds === 1) rushFour = true;
            if (pattern.count === 3 && pattern.openEnds === 2) liveThree++;
        }

        return { winningMove, liveFour, rushFour, liveThree };
    }

    // 获取某个方向的棋型模式
    getLinePattern(row, col, dx, dy, player) {
        let count = 1;  // 包含当前位置
        let openEnds = 0;  // 开放端点数
        let spaces = 0;  // 空位数量

        // 正方向检查
        let blocked = false;
        let hasSpace = false;
        for (let i = 1; i <= 5; i++) {
            const newRow = row + dx * i;
            const newCol = col + dy * i;

            if (!this.isInBounds(newRow, newCol)) {
                blocked = true;
                break;
            }

            if (this.board[newRow][newCol] === player) {
                count++;
            } else if (this.board[newRow][newCol] === 0) {
                if (!hasSpace) {
                    hasSpace = true;
                    spaces++;
                } else {
                    break;
                }
            } else {
                blocked = true;
                break;
            }
        }
        if (!blocked) openEnds++;

        // 反方向检查
        blocked = false;
        hasSpace = false;
        for (let i = 1; i <= 5; i++) {
            const newRow = row - dx * i;
            const newCol = col - dy * i;

            if (!this.isInBounds(newRow, newCol)) {
                blocked = true;
                break;
            }

            if (this.board[newRow][newCol] === player) {
                count++;
            } else if (this.board[newRow][newCol] === 0) {
                if (!hasSpace) {
                    hasSpace = true;
                    spaces++;
                } else {
                    break;
                }
            } else {
                blocked = true;
                break;
            }
        }
        if (!blocked) openEnds++;

        return { count, openEnds, spaces };
    }

    // 根据棋型模式评分
    getPatternScore(pattern, isHard) {
        const { count, openEnds, spaces } = pattern;

        // 五连
        if (count >= 5) return 1000000;

        // 活四（两端开放的四连）
        if (count === 4 && openEnds === 2) return 100000;

        // 冲四（一端开放的四连）
        if (count === 4 && openEnds === 1) return 10000;

        // 活三（两端开放的三连）
        if (count === 3 && openEnds === 2) return 5000;

        // 眠三（一端开放的三连）
        if (count === 3 && openEnds === 1) return 500;

        // 活二（两端开放的二连）
        if (count === 2 && openEnds === 2) return 300;

        // 眠二（一端开放的二连）
        if (count === 2 && openEnds === 1) return 50;

        // 活一
        if (count === 1 && openEnds === 2) return 20;

        // 困难模式下，考虑跳跃式连接
        if (isHard && spaces > 0) {
            if (count === 3 && openEnds > 0) return 400;
            if (count === 2 && openEnds === 2) return 150;
        }

        return 10;
    }

    getCandidateMoves() {
        const candidates = new Set();
        // 顶级AI：固定使用2格范围，确保全面覆盖
        const range = 2;

        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                if (this.board[i][j] !== 0) {
                    // 在已有棋子周围寻找空位
                    for (let di = -range; di <= range; di++) {
                        for (let dj = -range; dj <= range; dj++) {
                            const ni = i + di;
                            const nj = j + dj;
                            if (this.isValidMove(ni, nj)) {
                                candidates.add(`${ni},${nj}`);
                            }
                        }
                    }
                }
            }
        }

        // 如果是第一步，下在中心
        if (candidates.size === 0) {
            const center = Math.floor(this.boardSize / 2);
            return [{ row: center, col: center }];
        }

        return Array.from(candidates).map(pos => {
            const [row, col] = pos.split(',').map(Number);
            return { row, col };
        });
    }

    isInBounds(row, col) {
        return row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize;
    }

    checkWin(row, col) {
        const directions = [
            [0, 1],   // 横
            [1, 0],   // 竖
            [1, 1],   // 斜
            [1, -1]   // 反斜
        ];

        const player = this.board[row][col];

        for (const [dx, dy] of directions) {
            let count = 1;

            // 正方向
            for (let i = 1; i < 5; i++) {
                const newRow = row + dx * i;
                const newCol = col + dy * i;
                if (this.isInBounds(newRow, newCol) && this.board[newRow][newCol] === player) {
                    count++;
                } else {
                    break;
                }
            }

            // 反方向
            for (let i = 1; i < 5; i++) {
                const newRow = row - dx * i;
                const newCol = col - dy * i;
                if (this.isInBounds(newRow, newCol) && this.board[newRow][newCol] === player) {
                    count++;
                } else {
                    break;
                }
            }

            if (count >= 5) {
                return true;
            }
        }

        return false;
    }

    isBoardFull() {
        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                if (this.board[i][j] === 0) {
                    return false;
                }
            }
        }
        return true;
    }

    drawBoard() {
        const ctx = this.ctx;
        const cellSize = this.cellSize;
        const boardSize = this.boardSize;

        // 清空画布
        ctx.fillStyle = '#d4a574';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;

        for (let i = 0; i < boardSize; i++) {
            // 横线
            ctx.beginPath();
            ctx.moveTo(cellSize, cellSize * (i + 1));
            ctx.lineTo(cellSize * boardSize, cellSize * (i + 1));
            ctx.stroke();

            // 竖线
            ctx.beginPath();
            ctx.moveTo(cellSize * (i + 1), cellSize);
            ctx.lineTo(cellSize * (i + 1), cellSize * boardSize);
            ctx.stroke();
        }

        // 绘制星位（天元和四个角）
        const starPoints = [
            [3, 3], [3, 11], [11, 3], [11, 11], [7, 7]
        ];

        ctx.fillStyle = '#000';
        for (const [row, col] of starPoints) {
            ctx.beginPath();
            ctx.arc(cellSize * (col + 1), cellSize * (row + 1), 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawPiece(row, col, player) {
        const ctx = this.ctx;
        const x = this.cellSize * (col + 1);
        const y = this.cellSize * (row + 1);
        const radius = this.cellSize * 0.4;

        // 检查是否是该颜色的最新落子
        let isLastMoveOfColor = false;
        for (let i = this.moveHistory.length - 1; i >= 0; i--) {
            const move = this.moveHistory[i];
            if (move.player === player) {
                isLastMoveOfColor = (move.row === row && move.col === col);
                break;
            }
        }

        // 绘制棋子阴影
        ctx.beginPath();
        ctx.arc(x + 2, y + 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // 绘制棋子
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);

        if (player === 1) {
            // 黑棋
            const gradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, radius);
            gradient.addColorStop(0, '#666');
            gradient.addColorStop(1, '#000');
            ctx.fillStyle = gradient;
        } else {
            // 白棋
            const gradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, radius);
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ddd');
            ctx.fillStyle = gradient;
        }

        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 标记该颜色的最新落子 - 黑棋用白色标记，白棋用黑色标记
        if (isLastMoveOfColor) {
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = player === 1 ? '#fff' : '#000';
            ctx.fill();
        }
    }

    redrawBoard() {
        // 重新绘制棋盘底板
        this.drawBoard();

        // 重新绘制所有棋子
        for (const move of this.moveHistory) {
            this.drawPiece(move.row, move.col, move.player);
        }
    }

    updateStatus(message, isWin = false) {
        const statusEl = document.getElementById('status');
        statusEl.textContent = message;
        if (isWin) {
            statusEl.classList.add('win');
        } else {
            statusEl.classList.remove('win');
        }
    }

    restart() {
        this.initBoard();
        this.drawBoard();
    }

    undo() {
        if (this.moveHistory.length < 2 || this.gameOver) return;

        // 悔棋两步（玩家和电脑）
        for (let i = 0; i < 2; i++) {
            if (this.moveHistory.length === 0) break;
            const lastMove = this.moveHistory.pop();
            this.board[lastMove.row][lastMove.col] = 0;
        }

        this.currentPlayer = 1;
        this.gameOver = false;

        // 重新绘制整个棋盘
        this.redrawBoard();

        this.updateStatus('已悔棋，请继续');
    }
}

// 初始化游戏
window.addEventListener('load', () => {
    new GomokuGame();
});
