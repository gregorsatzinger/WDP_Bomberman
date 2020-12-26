window.onload = function() {
	window.onkeydown = keyEventHandler;
	window.onkeyup = keyEventHandler;
}

const GB_SIZE = 400; //gameboard size

//define here AND in server-side index.js?
//define only on server side and client sends request?
//need help.
const DETONATION_WIDTH = GB_SIZE/10*3;

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
    socket.emit('bomb');
}

function keyEventHandler(e) {
    //Player wants to move
    if(     e.code === "ArrowLeft" ||
            e.code === "ArrowUp" ||
            e.code === "ArrowRight" ||
            e.code === "ArrowDown") {
        handleMovement(e);
    } else if(e.code === "Space" && e.type === "keydown") {
        handleBombPlacing(e);    
    }
}

function renderPlayers(players) {
    ctx.clearRect(0, 0, 400, 400);
    players.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.rect(p.x, p.y, p.width, p.height);
        ctx.closePath();
        ctx.fill();
    });
}

function renderBombs(bombs) {
    bombs.forEach(b => {
        console.log(b.detonated);
        if(!b.detonated) { //draw bomb
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fill();
        } else { //draw explosion
            ctx.fillStyle = "#ffa421";
            ctx.beginPath();
            //horizontal rect
            ctx.rect(b.x - DETONATION_WIDTH/2, b.y - b.radius, DETONATION_WIDTH, b.radius*2);
            //vertical rect
            ctx.rect(b.x - b.radius, b.y - DETONATION_WIDTH/2, b.radius*2, DETONATION_WIDTH);
            ctx.closePath();
            ctx.fill();
        }
    })
}

socket.on('gameUpdate', (players, bombs) => {
    renderPlayers(players);
    renderBombs(bombs);
});