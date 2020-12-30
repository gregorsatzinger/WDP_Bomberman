import {GB_SIZE, FIXED_OBSTACLES} from '/constants.js';
import {r_clearRect, renderPlayers, renderBombs, renderObstacles} from '/js/drawing.js'

window.onload = function() {
    document.getElementById("newBtn").onclick = createGame;
    document.getElementById("joinBtn").onclick = joinGame;

    //resize canvas
    document.getElementById("ctx").width = GB_SIZE;
    document.getElementById("ctx").height = GB_SIZE;

	window.onkeydown = keyEventHandler;
	window.onkeyup = keyEventHandler;
}

/*const GB_SIZE = 400; //gameboard size
const PLAYER_SIZE = GB_SIZE/10;
const BOMB_DETONATION_WIDTH = GB_SIZE/10*3;*/

let ctx = document.getElementById("ctx").getContext("2d");
let socket = io();

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

socket.on('gameCode', (roomCode) => {
    console.log(roomCode);
    document.getElementById('gameCodeDisplay').innerText = "Game code: " + roomCode;
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
    //TODO: replace '1' with resize factor
    r_clearRect(ctx, GB_SIZE, GB_SIZE, 1);
    renderPlayers(ctx, state.players, 1);
    renderBombs(ctx, state.bombs, 1);
    renderObstacles(ctx, FIXED_OBSTACLES, 1);
    //TODO: renderObstacles(state.var_obstacles);
    
    //hacky solution for now. Messaging system probably gets changed later anyway
    let infoText = document.getElementById('bottomPanel').innerText;
    if(infoText !== "Spectating the game...") {
        document.getElementById('bottomPanel').innerText = "";
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
            document.getElementById('bottomPanel').innerText = data.message;
            break;
        default: break;
    }
});