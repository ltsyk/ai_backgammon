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

        const col = Math.round((x - this.cellSize / 2) / this.cellSize);
        const row = Math.round((y - this.cellSize / 2) / this.cellSize);

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
        return this.getBestMove(2);
    }

    // 困难AI：更深度的搜索
    getHardMove() {
        return this.getBestMove(3);
    }

    getBestMove(depth) {
        let bestScore = -Infinity;
        let bestMove = null;

        // 获取候选位置（在已有棋子周围）
        const candidates = this.getCandidateMoves();

        for (const move of candidates) {
            this.board[move.row][move.col] = 2;

            // 检查是否能直接获胜
            if (this.checkWin(move.row, move.col)) {
                this.board[move.row][move.col] = 0;
                return move;
            }

            const score = this.evaluatePosition(move.row, move.col, 2);
            this.board[move.row][move.col] = 0;

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        // 检查是否需要防守
        for (const move of candidates) {
            this.board[move.row][move.col] = 1;
            if (this.checkWin(move.row, move.col)) {
                this.board[move.row][move.col] = 0;
                return move;
            }
            this.board[move.row][move.col] = 0;
        }

        return bestMove || this.getEasyMove();
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

    evaluatePosition(row, col, player) {
        let score = 0;
        const directions = [
            [0, 1],   // 横
            [1, 0],   // 竖
            [1, 1],   // 斜
            [1, -1]   // 反斜
        ];

        for (const [dx, dy] of directions) {
            const count = this.countLine(row, col, dx, dy, player);
            score += this.getLineScore(count);
        }

        return score;
    }

    countLine(row, col, dx, dy, player) {
        let count = 1;
        let empty = 0;

        // 正方向
        for (let i = 1; i < 5; i++) {
            const newRow = row + dx * i;
            const newCol = col + dy * i;
            if (!this.isInBounds(newRow, newCol)) break;
            if (this.board[newRow][newCol] === player) {
                count++;
            } else if (this.board[newRow][newCol] === 0) {
                empty++;
                break;
            } else {
                break;
            }
        }

        // 反方向
        for (let i = 1; i < 5; i++) {
            const newRow = row - dx * i;
            const newCol = col - dy * i;
            if (!this.isInBounds(newRow, newCol)) break;
            if (this.board[newRow][newCol] === player) {
                count++;
            } else if (this.board[newRow][newCol] === 0) {
                empty++;
                break;
            } else {
                break;
            }
        }

        return { count, empty };
    }

    getLineScore(lineInfo) {
        const { count, empty } = lineInfo;

        if (count >= 5) return 100000;
        if (count === 4 && empty > 0) return 10000;
        if (count === 3 && empty > 0) return 1000;
        if (count === 2 && empty > 0) return 100;
        if (count === 1 && empty > 0) return 10;

        return 0;
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
