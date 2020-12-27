const express = require('express'); 
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const {makeid} = require('./server/utils');
const {initalGameState} = require('./server/game');

// https://expressjs.com/en/starter/static-files.html
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});

// Should probably be moved to public folder aswell. Not sure
app.get('/script.js', (req, res) => {
    res.sendFile(__dirname + '/client/script.js');
});

const TIMER_INTERVAL = 20; //[ms]
const GB_SIZE = 400; //gameboard size
const PLAYER_SIZE = GB_SIZE/10;
const BOMB_RADIUS = PLAYER_SIZE/3;
const BOMB_MOVE_FACTOR = PLAYER_SIZE/2; //to place bomb in the middle of the player
const BOMB_TIMER = 3/*s*/ * 1000/TIMER_INTERVAL; //time until detonation
const BOMB_DETONATION_TIME = 1/*s*/ * 1000/TIMER_INTERVAL; //duration of detonation
const BOMB_DETONATION_WIDTH = GB_SIZE/10*3;
const MOVING_STEP = 5; //how far does a player move by one timer interval --> speed

const clientRooms = {}; //Information about all rooms
const gameState = {}; //Holds current gamestate for every room


io.on('connection', (player) => {
    player.on('joinGame', handleJoinGame);
    player.on('startNewGame', handleStartNewGame);
    player.on('direction', handleDirection);
    player.on('bomb', handleBomb);
    player.on('disconnect', handleDisconnect);

    function handleJoinGame(code) {
        console.log('joined lobby');
        
        //TODO: Check if lobby with gameCode = code exists
        //Join lobby and save roomcode for player in clientRooms
        clientRooms[player.id] = code;
        player.join(code);

        player.number = 2;

        gameState[code] = initalGameState();

        //Second player joined -> game can start
        startGameInterval(code);
    }

    function handleStartNewGame() {
        let roomCode = makeid(6);
        clientRooms[player.id] = roomCode;
        player.join(roomCode);
        player.number = 1;
        player.emit('gameCode', roomCode);


        console.log('opened lobby');
        //Waiting for second player to connect...
    }

    function handleDirection(data) {
        //find room of current player
        const roomName = clientRooms[player.id];

        //update direction of current player
        gameState[roomName].players[player.number - 1].direction = data.direction;
    }

    function handleBomb() {
        //find room of current player
        const roomName = clientRooms[player.id];
        const currPlayer = gameState[roomName].players[player.number - 1]

        //add bomb to current gamestate of current room
        gameState[roomName].bombs.push({
            x: currPlayer.pos.x + BOMB_MOVE_FACTOR,
            y: currPlayer.pos.y + BOMB_MOVE_FACTOR,
            radius: BOMB_RADIUS,
            timer: BOMB_TIMER,
            detonated: false
        });
    }
    
    function handleDisconnect() {
        //TODO: update to room system
        //socket_arr.splice(player.id,1);
        console.log('a user disconnected');
    }
});

function updatePlayerPositions(player) {
    switch(player.direction) {
        case 0:     //left
            x_ = player.pos.x - MOVING_STEP;
            y_ = player.pos.y;
            break;
        case 1:     //up
            x_ = player.pos.x;
            y_ = player.pos.y - MOVING_STEP;
            break;
        case 2:     //right
            x_ = player.pos.x + MOVING_STEP;
            y_ = player.pos.y;
            break;
        case 3:     //down
            x_ = player.pos.x;
            y_ = player.pos.y + MOVING_STEP;
            break;
        default:    //not moving
            return;
    }

    //TODO: if(isValidPosition(player, x_, y_)) {
    player.pos.x = x_;
    player.pos.y = y_;
}

class Explosion {
    constructor(x, y) {
        //horizontal rect (left-top and right-bottom corners)
        hor_lt_x = x - BOMB_DETONATION_WIDTH/2;
        hor_lt_y = y - BOMB_RADIUS;
        hor_rb_x = hor_lt_x + BOMB_DETONATION_WIDTH;
        hor_rb_y = hor_lt_y + BOMB_RADIUS*2

        //vertical rect
        vert_lt_x = x - BOMB_RADIUS;
        vert_lt_y = y - BOMB_DETONATION_WIDTH/2;
        vert_rb_x = vert_lt_x + BOMB_RADIUS*2;
        vert_rb_y = vert_lt_y + BOMB_DETONATION_WIDTH;
    }
    hits(player) {
        //TODO: any point of player touching one of the rectangles?

        //return true/false
    }
}

function startGameInterval(roomName) {
    const interval = setInterval(() => {
        /* send game update to all rooms */

        //update gamestate / every rooms
        for (const key in gameState) {
            const currRoomState = gameState[key];
            const player1 = currRoomState.players[0];
            const player2 = currRoomState.players[1];
            updatePlayerPositions(player1);
            updatePlayerPositions(player2);

            const bombs = currRoomState.bombs;
            // TODO: 
            bombs.forEach(bomb => {
                bomb.timer--;

                if(!bomb.detonated) { //bomb is alive
                    if(bomb.timer <= 0) { //bomb detonates now
                        bomb.detonated = true;
                        bomb.timer = BOMB_DETONATION_TIME; //reset timer to detonation time
                        //bomb.explosion = new Explosion(bomb.x, bomb.y); //calc explosion range
                    }
                } else { //bomb is exploding currently
                    //check if hitting a player
    
                    //TODO: implement Explosion.hits()
                    /*for(let i = 0; i < socket_arr.length; i++) {
                        if(bomb.explosion.hits(socket_arr[i])) {
                            //TODO: handling of gameOver on client side
                            socket_arr[i].emit('gameOver'); //send game over signal to client
                            socket_arr.splice(i, 1); //delete player
                        }
                    }*/
    
                    if(bomb.timer <= 0) { //detonation is over
                        bombs.splice(bombs.indexOf(bomb),1); //delete bomb
                    }
                }
            });
        }

        // Send gamestate to all players in room
        io.in(roomName).emit('gameUpdate', gameState[roomName]);
    }, TIMER_INTERVAL)
};

http.listen(3000, () => {
    console.log('listening on *:3000');
});