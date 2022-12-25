var canvas = document.getElementById("game-canvas");
var canvas2 = document.getElementById("game-overlay");
var board = document.getElementById("main-board");
var g = canvas.getContext("2d");
var o = canvas2.getContext("2d");

var color_1 = window.getComputedStyle(canvas, null).getPropertyValue('color');
var color_2 = window.getComputedStyle(canvas, null).getPropertyValue('background-color');

var n = 10;
canvas.width = Math.floor(board.offsetWidth/n)*n;
canvas.height = Math.floor(board.offsetWidth/n)*n;
canvas2.width = Math.floor(board.offsetWidth/n)*n;
canvas2.height = Math.floor(board.offsetWidth/n)*n;
var size = Math.floor(canvas.width/n);

var mx = null, my = null, sx = null, sy = null;

var pieces = document.getElementById("piece-container");
var rect = pieces.getBoundingClientRect();

var board = [['.','R','H','B','Q','K','B','H','R','.'],
		 	 ['.','P','P','P','P','P','P','P','P','.'],
		 	 ['.','.','.','.','.','.','.','.','.','.'],
			 ['.','.','.','.','.','.','.','.','.','.'],
			 ['.','.','.','.','.','.','.','.','.','.'],
			 ['.','.','.','.','.','.','.','.','.','.'],
			 ['.','.','.','.','.','.','.','.','.','.'],
			 ['.','.','.','.','.','.','.','.','.','.'],
			 ['.','p','p','p','p','p','p','p','p','.'],
			 ['.','r','h','b','q','k','b','h','r','.']];

var turn = 0;

const offset = {
	'k': 0,
	'q': 1,
	'b': 2,
	'h': 3,
	'r': 4,
	'p': 5
};

function redraw() {
	g.font = "1em Arial";
	g.fillStyle = "white";
	g.fillRect(0, 0, canvas.width, canvas.height);
	o.clearRect(0, 0, canvas.width, canvas.height);
	
	for (var i = 0; i < n; i++) {
		for (var j = 0; j < n; j++) {
			g.fillStyle = (i+j)%2 ? color_1 : color_2;
			g.fillRect(size*i, size*j, size, size);
		}
		var pad = 7;
		g.textBaseline = "top";
		g.fillStyle = (i+n)%2 ? color_1 : color_2;
		g.fillText(i, pad, size*(n-1-i)+pad); 
		g.textBaseline = "bottom";
		g.fillText(String.fromCharCode(97+i), size*(i)+size-pad*2-3, size*n-pad); 
	}

	if (sx !== null && sy !== null && board !== null) {
		g.fillStyle = "rgba(255, 255, 0, 0.4)";
		g.fillRect(sx*size, sy*size, size, size);

		o.fillStyle = "rgba(0, 0, 0, 0.4)"
		o.strokeStyle = "rgba(0, 0, 0, 0.4)"
		o.lineWidth = "6";
		possible_moves(sx, sy, true).forEach(function circ(e) {
			o.beginPath();
			if (board[e.dest.y][e.dest.x] === '.') {
				o.arc((e.dest.x+0.5)*size, (e.dest.y+0.5)*size, 10, 0, 2*Math.PI);
				o.fill();
			} else {
				o.arc((e.dest.x+0.5)*size, (e.dest.y+0.5)*size, 30, 0, 2*Math.PI);
				o.stroke();
			}
		});
	}

	if (mx !== null && my !== null) {
		g.strokeStyle = "rgba(255, 255, 255, 0.4)";
		g.lineWidth = "6";
		g.beginPath();
		g.rect(mx*size+3, my*size+3, size-6, size-6);
		g.stroke();
	}
}

function p2d(x, y) {
	this.x = x;
	this.y = y;
}

function move(dest, take, leave) {
	this.dest = dest;
	this.take = take;
	this.leave = leave;
}

function move(x, y) {
	this.dest = new p2d(x, y);
	this.take = [new p2d(sx, sy)];
	this.leave = [new p2d(x, y)];
	if (board[y][x] !== '.') {
		this.take.splice(0, 0, new p2d(x, y));
		this.leave.splice(0, 0, null);
	}
}

function update_pieces() {
	pieces.innerHTML = '';

	for (var i = 0; i < n; i++) {
		for (var j = 0; j < n; j++) {
			if (board[i][j] !== '.') {
				var div = document.createElement("div");
				div.className = "piece";
				var type = offset[board[i][j].toLowerCase()]
				var side = 0+(board[i][j].charCodeAt(0) < 97);
				div.style = "background-position: right min("+7*(type+1)+"vw, "+8.6*(type+1)+"vh) top min("+7*side+"vw, "+8.6*side+"vh);";
				div.style.top = "" + size*(i) + "px";
				div.style.left = "" + size*(j) + "px";
				pieces.appendChild(div);
				drag(div);
			}
		}
	}
}

redraw();
update_pieces();

function boardf(x, y) {
	if (x < 0 || x >= n || y < 0 || y >= n) return 'X';
	return board[y][x];
}

function pside(x, y) {
	return 0+(boardf(x, y).charCodeAt(0) < 97);
}

function ptype(x, y) {
	return boardf(x, y).toLowerCase();
}

function pmove(x, y, side) {
	return (boardf(x, y) !== 'X' && (boardf(x, y) === '.' || pside(x, y) !== side));
}

function possible_moves(x, y, check) {
	if (x < 0 || x >= n || y < 0 || y >= n) return [];

	var type = ptype(x, y);
	var side = pside(x, y);

	if (side !== turn) return [];

	var moves = [];

	if (type === 'p') {
		var dir = side == 1 ? 1 : -1;
		var start = side == 1 ? 1 : 8;
		if (boardf(x, y+1*dir) === '.') {
			if (boardf(x, y+2*dir) === '.' && y == start) moves.push(new move(x, y+2*dir));
			moves.push(new move(x, y+1*dir));
		}
		if (x < n-1 && boardf(x+1, y+1*dir) !== '.' && pside(x+1, y+1*dir) !== side) {
			moves.push(new move(x+1, y+1*dir));
		}
		if (x > 1 && boardf(x-1, y+1*dir) !== '.' && pside(x-1, y+1*dir) !== side) {
			moves.push(new move(x-1, y+1*dir));
		}
	}
	if (type === 'r' || type === 'q') {
		for (var dir = 0; dir < 4; dir++) {
			var m1 = (dir&1)*(dir&2 ? -1 : 1), m2 = (1-dir&1)*(dir&2 ? -1 : 1);
			for (var dx = 1; ; dx++) {
				if (pmove(x+dx*m1, y+dx*m2, side)) moves.push(new move(x+dx*m1, y+dx*m2));
				if (boardf(x+dx*m1, y+dx*m2, side) !== '.') break;
			}
		}
	}
	if (type === 'b' || type === 'q') {
		for (var dir = 0; dir < 4; dir++) {
			var m1 = dir&1 ? 1 : -1, m2 = dir&2 ? 1 : -1;
			for (var dx = 1; ; dx++) {
				if (pmove(x+dx*m1, y+dx*m2, side)) moves.push(new move(x+dx*m1, y+dx*m2));
				if (boardf(x+dx*m1, y+dx*m2, side) !== '.') break;
			}
		}
	}
	if (type === 'h') {
		for (var i = -2; i <= 2; i++) {
			if (i == 0) continue;
			if (pmove(x+i, y+3-Math.abs(i), side)) moves.push(new move(x+i, y+3-Math.abs(i)));
			if (pmove(x+i, y+Math.abs(i)-3, side)) moves.push(new move(x+i, y+Math.abs(i)-3));
		}
	}
	if (type === 'k') {
		for (var i = -1; i <= 1; i++) {
			for (var j = -1; j <= 1; j++) {
				if (!(i==0 && j==0) && pmove(x+i, y+j, side)) moves.push(new move(x+i, y+j));
			}
		}
	}
	if (check) moves = moves.filter(function check(m) {
		var board2 = JSON.parse(JSON.stringify(board));
		move_piece(m);
		for (var i = 0; i < n; i++) {
			for (var j = 0; j < n; j++) {
				if (boardf(i, j) !== '.' && pside(i, j) !== side) {
					if (possible_moves(i, j, false).some((m2) => board[m2.dest.y][m2.dest.x] === (side ? 'K' : 'k'))) {
						board = JSON.parse(JSON.stringify(board2));
						console.log("INVALID");
						return false;
					}
				}
			}
		}
		board = JSON.parse(JSON.stringify(board2));
		return true;
	});
	return moves;
}

function move_spiece() {
	var valid = possible_moves(sx, sy, true).filter(function match(e) {
		if (e.dest.x == mx && e.dest.y == my) return true;
	});
	if (valid.length === 0) return false;
	move_piece(valid[0]);
	turn = 1-turn;
	return true;
}

function move_piece(m) {
	for (var i = 0; i < m.take.length; i++) {
		if (m.leave[i] !== null) board[m.leave[i].y][m.leave[i].x] = board[m.take[i].y][m.take[i].x];
		board[m.take[i].y][m.take[i].x] = '.';
	}
}

function drag(el) {
	el.onmousedown = drag_start;
	var ps = false;

	function drag_start(e) {
		e = e || window.event;
		el.style.zIndex = 3;
		document.onmouseup = drag_done;
		document.onmousemove = drag_move;
		mx = Math.floor((e.clientX - rect.left)/size);
		my = Math.floor((e.clientY - rect.top)/size);
		ps = sx !== null;
		sx = mx;
		sy = my;
		drag_move(e);
		redraw();
	}

	function drag_move(e) {
		e = e || window.event;
		var pmx = mx, pmy = my;
		mx = Math.floor((e.clientX - rect.left)/size);
		my = Math.floor((e.clientY - rect.top)/size);
		el.style.top = (e.clientY - rect.top - size/1.6) + "px";
		el.style.left = (e.clientX - rect.left - size/2) + "px";
		if (pmx !== mx || pmy !== my) redraw();
	}

	function drag_done(e) {
		document.onmouseup = null;
    	document.onmousemove = null;
		el.style.zIndex = 1;
		if ((mx === sx && my === sy && ps) || move_spiece()) {
			sx = null;
			sy = null;
		}
		mx = null;
		my = null;
		redraw();
		update_pieces();
	}
}