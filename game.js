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
        this.drawPiece(row, col, this.currentPlayer);

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

    // 中等AI：基于评估函数
    getMediumMove() {
        return this.getAdvancedMove(false);
    }

    // 困难AI：更深度的搜索
    getHardMove() {
        return this.getAdvancedMove(true);
    }

    // 高级AI算法
    getAdvancedMove(isHard) {
        const candidates = this.getCandidateMoves();

        // 1. 检查AI是否能直接获胜（五连）
        for (const move of candidates) {
            this.board[move.row][move.col] = 2;
            if (this.checkWin(move.row, move.col)) {
                this.board[move.row][move.col] = 0;
                return move;
            }
            this.board[move.row][move.col] = 0;
        }

        // 2. 检查是否需要防守（阻止玩家获胜）
        for (const move of candidates) {
            this.board[move.row][move.col] = 1;
            if (this.checkWin(move.row, move.col)) {
                this.board[move.row][move.col] = 0;
                return move;
            }
            this.board[move.row][move.col] = 0;
        }

        // 3. 检查AI是否能形成活四（必胜）
        for (const move of candidates) {
            if (this.canFormLiveFour(move.row, move.col, 2)) {
                return move;
            }
        }

        // 4. 检查是否需要防守玩家的活四
        for (const move of candidates) {
            if (this.canFormLiveFour(move.row, move.col, 1)) {
                return move;
            }
        }

        // 5. 检查AI是否能形成双活三或活三+冲四
        if (isHard) {
            for (const move of candidates) {
                if (this.canFormDoubleThree(move.row, move.col, 2)) {
                    return move;
                }
            }

            // 6. 防守玩家的双活三
            for (const move of candidates) {
                if (this.canFormDoubleThree(move.row, move.col, 1)) {
                    return move;
                }
            }
        }

        // 7. 使用评估函数选择最佳位置
        let bestScore = -Infinity;
        let bestMove = null;

        for (const move of candidates) {
            const score = this.evaluateMoveComprehensive(move.row, move.col, isHard);

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove || this.getEasyMove();
    }

    // 检查能否形成活四
    canFormLiveFour(row, col, player) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

        for (const [dx, dy] of directions) {
            const pattern = this.getLinePattern(row, col, dx, dy, player);
            // 活四：两端都没有被堵住的四连
            if (pattern.count === 4 && pattern.openEnds === 2) {
                return true;
            }
        }
        return false;
    }

    // 检查能否形成双活三
    canFormDoubleThree(row, col, player) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        let liveThreeCount = 0;

        for (const [dx, dy] of directions) {
            const pattern = this.getLinePattern(row, col, dx, dy, player);
            // 活三：两端都没有被堵住的三连
            if (pattern.count === 3 && pattern.openEnds === 2) {
                liveThreeCount++;
            }
        }

        return liveThreeCount >= 2;
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

    // 综合评估一个位置
    evaluateMoveComprehensive(row, col, isHard) {
        let aiScore = this.evaluatePlayerAtPosition(row, col, 2, isHard);
        let humanScore = this.evaluatePlayerAtPosition(row, col, 1, isHard);

        // 防守比进攻更重要一些
        return aiScore + humanScore * 1.2;
    }

    // 评估某个玩家在某个位置的得分
    evaluatePlayerAtPosition(row, col, player, isHard) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        let totalScore = 0;

        for (const [dx, dy] of directions) {
            const pattern = this.getLinePattern(row, col, dx, dy, player);
            totalScore += this.getPatternScore(pattern, isHard);
        }

        // 位置奖励：中心位置更有价值
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        const distanceFromCenter = Math.abs(row - centerRow) + Math.abs(col - centerCol);
        totalScore += (this.boardSize - distanceFromCenter) * 2;

        return totalScore;
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

        // 标记最后一步
        if (this.moveHistory.length > 0) {
            const lastMove = this.moveHistory[this.moveHistory.length - 1];
            if (lastMove.row === row && lastMove.col === col) {
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fillStyle = player === 1 ? '#fff' : '#000';
                ctx.fill();
            }
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
        this.drawBoard();

        // 重新绘制所有棋子
        for (const move of this.moveHistory) {
            this.drawPiece(move.row, move.col, move.player);
        }

        this.updateStatus('已悔棋，请继续');
    }
}

// 初始化游戏
window.addEventListener('load', () => {
    new GomokuGame();
});
