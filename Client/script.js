window.onload = function() {
	window.onkeydown = keyEventHandler;
	window.onkeyup = keyEventHandler;
}

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
                    
                //TODO emit current_direction
                console.log(directions);
                console.log(current_direction);
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

        //TODO emit current_direction
        console.log(directions);
        console.log(current_direction);
        socket.emit('direction', {direction: current_direction});
    }
}

function keyEventHandler(e) {
    //Player wants to move
    if(     e.code === "ArrowLeft" ||
            e.code === "ArrowUp" ||
            e.code === "ArrowRight" ||
            e.code === "ArrowDown") {
        handleMovement(e);
    } //else ... TODO: place bomb
}

render = function(players) {
    ctx.clearRect(0, 0, 400, 400);
    players.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.rect(p.x, p.y, p.width, p.height);
        ctx.closePath();
        ctx.fill();
    });
}

socket.on('newPositions', (players) => {
    render(players);
});