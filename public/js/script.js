import {GB_SIZE, FIXED_OBSTACLES, GB_FIELDS} from '/js/constants.js';
import {r_clearRect, renderPlayers, renderBombs, renderObstacles, getScreenFactor} from '/js/drawing.js'

let canv = document.getElementById("ctx");
let ctx = canv.getContext("2d");
let socket = io();
let resizeBy;
let bombs = [];

//initially empty var_obstacles (received by server)
let var_obstacles = [];

for(let i = 0; i < GB_FIELDS; i++) {
    for(let j = 0; j < GB_FIELDS; j++) {
        var_obstacles[GB_FIELDS * i + j] = false;
    }
}

window.onload = function() {
    document.getElementById("newBtn").onclick = createGame;
    document.getElementById("joinBtn").onclick = joinGame;
    document.getElementById("quickpayBtn").onclick = quickGame;

    //resize canvas
    resizeBy = getScreenFactor();
    canv.height = GB_SIZE * resizeBy;
    canv.width = GB_SIZE * resizeBy;

    //add keylistener
	window.onkeydown = keyEventHandler;
    window.onkeyup = keyEventHandler;
    
    if(window.location.pathname.length === 7) {
        socket.emit('joinGame', window.location.pathname.substring(1));
    }
}
window.onresize = function() {
    resizeBy = getScreenFactor();
    canv.height = GB_SIZE * resizeBy;
    canv.width = GB_SIZE * resizeBy;
}



//bool variables for moving direction
//left (0) - up (1) - right (2) - down (3)
let directions = [false, false, false, false];
let current_direction = 4; //no movement

function KeyToIndex(code) {
    switch(code) {
        case "ArrowLeft":
            return 0;
        case "ArrowUp":
            return 1;
        case "ArrowRight":
            return 2;
        case "ArrowDown":
            return 3;
    }
}

/* There can be up to 2 active directions, but a player only moves vertically or horizontally.
   If the player holds ArrowRIGHT, and then additionally holds ArrowDOWN, he will move to
   the last-pressed direction (DOWN) but we also want to memorize that he is pressing ArrowRIGHT.
   So when releasing ArrowDOWN while still holding ArrowRIGHT, he must move to RIGHT again.*/
function handleMovement(e) {
    if(e.type === "keydown") {
        let index = KeyToIndex(e.code);

        //no need to emit the current direction again
        if(index !== current_direction) {
            let sum = 0;
            for(let i = 0; i < 4; i++) {
                sum += directions[i];
            }
            if(sum < 2) { //not more than one active direction
                directions[index] = true;
                //player is moving to latest direction, but previous direction
                //is also borne in mind (in directions-array)
                current_direction = index;
                socket.emit('direction', {direction: current_direction});
            }
        }
    } else if(e.type === "keyup") { //key released
        directions[KeyToIndex(e.code)] = false;
        
        //since only two directions at the same time are allowed
        //and one key is released --> only one direction can be active
        let i = 0;
        while(!directions[i] && i < 4) {
            i++;
        }
        current_direction = i;
        socket.emit('direction', {direction: current_direction});
    }
}

function handleBombPlacing(e) {
    //TODO: check if player can place a bomb (cooldown after previous bomb)
    socket.emit('bomb');
}

function keyEventHandler(e) {
    //Player wants to move
    if(     e.code === "ArrowLeft" ||
            e.code === "ArrowUp" ||
            e.code === "ArrowRight" ||
            e.code === "ArrowDown") {
        handleMovement(e);
    //Player wants to place bomb
    } else if(e.code === "Space" && e.type === "keydown") {
        handleBombPlacing(e);    
    }
}

function createGame() {
    socket.emit('createGame');
}

function joinGame() {
    const code = document.getElementById('gameCodeInput').value;
    socket.emit('joinGame', code);
}

function quickGame() {
    socket.emit('quickGame');
}

socket.on('gameCode', (roomCode) => {
    console.log(roomCode);
    document.getElementById('gameCodeDisplay').innerText = "Game code: " + roomCode;
});

socket.on('gameOver', (msg) => {
    document.getElementById('gameCodeDisplay').innerText = msg;
});

socket.on('lobbyFull', () => {
    let startBtn = document.createElement('button');
    startBtn.className = "retroBtn";
    startBtn.textContent = "start";
    startBtn.style.setProperty('margin-left', '2rem');
    startBtn.onclick = () => {
        socket.emit('startGame');
        startBtn.remove();
    };
    document.getElementById('topPanel').appendChild(startBtn);
});


socket.on('gameUpdate', (state) => {
    r_clearRect(ctx, GB_SIZE, GB_SIZE, resizeBy);
    renderPlayers(ctx, state.players, resizeBy);
    
    if(state.bombs !== undefined) {
        bombs = state.bombs;
    }
    renderBombs(ctx, bombs, resizeBy);

    if(state.var_obstacles !== undefined) {
        var_obstacles = state.var_obstacles;
    }
    renderObstacles(ctx, var_obstacles, "#DEB887", resizeBy);  //brown
    renderObstacles(ctx, FIXED_OBSTACLES, "#A8A8A8", resizeBy); //gray
    
    
    //Game started -> reset message
    let infoPanel = document.getElementById('bottomPanel');
    if( (infoPanel.innerText === "Waiting for lobby owner to start the game...\n") || 
        (infoPanel.innerText === "Waiting for second player to join...\n")) {
        infoPanel.innerText = "";
    }
});

socket.on('log', (data) => {
    switch(data.type) {
        case "success": 
            document.getElementById("ctx").style.setProperty('display', 'block');
            document.getElementById("joinPanel").style.setProperty('display', 'none');
            break; 
        case "error":
            document.getElementById('gameCodeDisplay').innerText = data.message;
            break;
        case "info":
            document.getElementById('bottomPanel').innerText += data.message + "\n";
            break;
        default: break;
    }
});