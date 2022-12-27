// some lines i am too scared to delete but forgot what they did
// ---------
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
// ---------

var board = [['.','R','z','B','Q','K','B','N','R','.'],
		 	 ['.','P','P','P','P','P','P','P','P','.'],
		 	 ['.','.','.','.','.','.','.','.','.','.'],
			 ['.','.','.','.','.','.','.','.','.','.'],
			 ['.','.','.','.','.','.','.','.','.','.'],
			 ['.','.','.','.','.','.','.','.','.','.'],
			 ['.','.','.','.','.','.','.','.','.','.'],
			 ['.','.','.','.','.','.','.','.','.','.'],
			 ['.','p','p','p','p','p','p','p','p','.'],
			 ['.','r','z','b','q','k','b','n','r','.']];

var turn = 0;

function boardf(x, y) {
	if (x < 0 || x >= n || y < 0 || y >= n) return 'X';
	return board[y][x];
}

function pside(x, y) {
	return boardf(x, y) === 'z' ? 2 : 0+(boardf(x, y).charCodeAt(0) < 97);
}

function ptype(x, y) {
	return boardf(x, y).toLowerCase();
}

function pmove(x, y, side) {
	return (boardf(x, y) !== 'X' && (boardf(x, y) === '.' || pside(x, y) !== side));
}

// offset into sprite atlas
const offset = {
	'k': 0,
	'q': 1,
	'b': 2,
	'h': 3,
	'r': 4,
	'p': 5,
	'z': 3,
	'n': 6
};

// draw the canvases
function redraw() {
	g.font = "1em Arial";
	g.fillStyle = "white";
	g.fillRect(0, 0, canvas.width, canvas.height);
	o.clearRect(0, 0, canvas.width, canvas.height);
	
	// grid and numbers
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

	// selected piece and possible moves
	if (sx !== null && sy !== null && board !== null) {
		g.fillStyle = "rgba(255, 255, 0, 0.4)";
		g.fillRect(sx*size, sy*size, size, size);

		o.fillStyle = "rgba(0, 0, 0, 0.4)"
		o.strokeStyle = "rgba(0, 0, 0, 0.4)"
		o.lineWidth = "6";
		possible_moves(sx, sy, true, turn).forEach(function circ(e) {
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

	// current square hover
	if (mx !== null && my !== null) {
		g.strokeStyle = "rgba(255, 255, 255, 0.4)";
		g.lineWidth = "6";
		g.beginPath();
		g.rect(mx*size+3, my*size+3, size-6, size-6);
		g.stroke();
	}
}

// position 2d
function p2d(x, y) {
	this.x = x;
	this.y = y;
}

// a customizable move that might involve multiple pieces
function moveo(dest, take, leave) {
	this.dest = dest;
	this.take = take;
	this.leave = leave;
}

// a simple move from one position to another
function move(x, y) {
	this.dest = new p2d(x, y);
	this.take = [new p2d(sx, sy)];
	this.leave = [new p2d(x, y)];
	if (board[y][x] !== '.') {
		this.take.splice(0, 0, new p2d(x, y));
		this.leave.splice(0, 0, null);
	}
}

// recreate all piece divs
// there is some fucky loop shit that happens on mouse release with drag handler but i dont care enough to fix it, it works for now
function update_pieces() {
	pieces.innerHTML = '';

	for (var i = 0; i < n; i++) {
		for (var j = 0; j < n; j++) {
			if (board[i][j] !== '.') {
				var div = document.createElement("div");
				div.className = "piece";
				var type = offset[ptype(j, i)];
				var side = pside(j, i);
				div.style = "background-position: right min("+7*(type+1)+"vw, "+8.6*(type+1)+"vh) bottom min("+7*(side+1)+"vw, "+8.6*(side+1)+"vh);";
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

// list of moves of piece at x,y if it is the turn of player turnc
function possible_moves(x, y, check, turnc) {
	if (x < 0 || x >= n || y < 0 || y >= n) return [];

	var type = ptype(x, y);
	var side = pside(x, y);

	// only this side pieces or zebra can move
	if (check && !(side === turnc || side === 2)) return [];

	var moves = [];

	// pawn movement
	if (type === 'p') {
		var dir = turnc == 1 ? 1 : -1;
		var start = turnc == 1 ? 1 : 8;
		// move
		if (boardf(x, y+1*dir) === '.') {
			if (boardf(x, y+2*dir) === '.' && y == start) moves.push(new move(x, y+2*dir));
			moves.push(new move(x, y+1*dir));
		}
		// takes
		if (x < n-1 && boardf(x+1, y+1*dir) !== '.' && pside(x+1, y+1*dir) !== turnc) {
			moves.push(new move(x+1, y+1*dir));
		}
		if (x > 1 && boardf(x-1, y+1*dir) !== '.' && pside(x-1, y+1*dir) !== turnc) {
			moves.push(new move(x-1, y+1*dir));
		}
	}
	// straight movement
	if (type === 'r' || type === 'q' || type === 'n') {
		for (var dir = 0; dir < 4; dir++) {
			var m1 = (dir&1)*(dir&2 ? -1 : 1), m2 = (1-dir&1)*(dir&2 ? -1 : 1);
			for (var dx = 1; ; dx++) {
				if (pmove(x+dx*m1, y+dx*m2, turnc)) moves.push(new move(x+dx*m1, y+dx*m2));
				if (boardf(x+dx*m1, y+dx*m2, turnc) !== '.') break;
			}
		}
	}
	// skew movement
	if (type === 'b' || type === 'q') {
		for (var dir = 0; dir < 4; dir++) {
			var m1 = dir&1 ? 1 : -1, m2 = dir&2 ? 1 : -1;
			for (var dx = 1; ; dx++) {
				if (pmove(x+dx*m1, y+dx*m2, turnc)) moves.push(new move(x+dx*m1, y+dx*m2));
				if (boardf(x+dx*m1, y+dx*m2, turnc) !== '.') break;
			}
		}
	}
	// il vaticano
	if (type === 'b') {
		for (var dir = 0; dir < 4; dir++) {
			var m1 = (dir&1)*(dir&2 ? -1 : 1), m2 = (1-dir&1)*(dir&2 ? -1 : 1);
			var dx = 1;
			var p2arr = [], narr = [];
			while (boardf(x+dx*m1, y+dx*m2) === (turnc ? 'p' : 'P')) {
				p2arr.push(new p2d(x+dx*m1, y+dx*m2));
				narr.push(null);
				dx++
			};
			if (boardf(x+dx*m1, y+dx*m2) === (turnc ? 'B' : 'b')) 
				moves.push(new moveo(new p2d(x+dx*m1, y+dx*m2), p2arr, narr));
		}
	}
	// horsey and zebra and knook
	if (type === 'h' || type === 'z' || type === 'n') {
		for (var i = -2; i <= 2; i++) {
			if (i == 0) continue;
			if (pmove(x+i, y+3-Math.abs(i), turnc)) moves.push(new move(x+i, y+3-Math.abs(i)));
			if (pmove(x+i, y+Math.abs(i)-3, turnc)) moves.push(new move(x+i, y+Math.abs(i)-3));
		}
	}
	// king moves
	if (type === 'k') {
		// normal
		for (var i = -1; i <= 1; i++) {
			for (var j = -1; j <= 1; j++) {
				if (!(i==0 && j==0) && pmove(x+i, y+j, turnc)) moves.push(new move(x+i, y+j));
			}
		}
		// castling
		for (var dir = 0; dir < 4; dir++) {
			var m1 = (dir&1)*(dir&2 ? -1 : 1), m2 = (1-dir&1)*(dir&2 ? -1 : 1);
			var dx = 1;
			while (boardf(x+dx*m1, y+dx*m2) === '.') dx++;
			if (dx >= 2 && boardf(x+dx*m1, y+dx*m2) === (turnc ? 'R' : 'r')) moves.push(new moveo(
				new p2d(x+2*m1, y+2*m2),
				[new p2d(x+dx*m1, y+dx*m2), new p2d(x, y)],
				[new p2d(x+1*m1, y+1*m2), new p2d(x+2*m1, y+2*m2)]
			));
		}
	}
	// remove moves that allow the opponent to take king in their turn
	if (check) moves = moves.filter(function check(m) {
		var board2 = JSON.parse(JSON.stringify(board));
		move_piece(m);
		for (var i = 0; i < n; i++) {
			for (var j = 0; j < n; j++) {
				if (boardf(i, j) !== '.' && (pside(i, j) !== turnc)) {
					if (possible_moves(i, j, false, 1-turnc).some((m2) => board[m2.dest.y][m2.dest.x] === (turnc ? 'K' : 'k'))) {
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

// move the selected piece and swap turns; return if a valid move was made
function move_spiece() {
	var valid = possible_moves(sx, sy, true, turn).filter(function match(e) {
		if (e.dest.x == mx && e.dest.y == my) return true;
	});
	if (valid.length === 0) return false;
	move_piece(valid[0]);
	turn = 1-turn;
	return true;
}

// apply a certain move
function move_piece(m) {
	for (var i = 0; i < m.take.length; i++) {
		if (m.leave[i] !== null) board[m.leave[i].y][m.leave[i].x] = board[m.take[i].y][m.take[i].x];
		board[m.take[i].y][m.take[i].x] = '.';
	}
}

var down = false;

// mouse drag handlers copied from stackoverflow
function drag(el) {
	el.onmousedown = drag_start;
	var ps = false;

	function drag_start(e) {
		e = e || window.event;
		down = true;
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
		down = false;
		redraw();
		update_pieces();
	}
}

/* Are you kidding ??? What the **** are you talking 
bout man ? You are a biggest looser i ever seen in my
life ! You was doing PIPI in your pampers when i was 
beating players much more stronger then you! You are 
not proffesional, because proffesionals knew how to 
lose and congratulate opponents, you are like a girl 
crying after i beat you! Be brave, be honest to 
yourself and stop this trush talkings!!! Everybody 
know that i am very good blitz player, i can win 
anyone in the world in single game! And "w"esley "s"o 
is nobody for me, just a player who are crying every 
single time when loosing, ( remember what you say 
about Firouzja ) !!! Stop playing with my name, i 
deserve to have a good name during whole my chess 
carrier, I am Officially inviting you to OTB blitz 
match with the Prize fund! Both of us will invest 
5000$ and winner takes it all! I suggest all other 
people who's intrested in this situation, just take 
a look at my results in 2016 and 2017 Blitz World 
championships, and that should be enough... No need 
to listen for every crying babe, Tigran Petrosyan is 
always play Fair ! And if someone will continue 
Officially talk about me like that, we will meet in 
Court! God bless with true! True will never die ! 
Liers will kicked off...*/