import {GB_SIZE, PLAYER_SIZE, BOMB_RADIUS, BOMB_DETONATION_WIDTH} from './public/constants.js';

//const express = require('express');
import express from 'express';
const app = express();

//const http = require('http').createServer(app);
import http from 'http';
const httpServer = http.createServer(app);

//const io = require('socket.io')(http);
import {Server} from 'socket.io';
const io = new Server(httpServer);

//const {makeid} = require('./server/utils');
import {makeid} from './server/utils.js';
//const {initalGameState} = require('./server/game');
import {initalGameState} from './server/game.js';

// https://expressjs.com/en/starter/static-files.html
app.use(express.static(process.cwd() + '/public'));

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/client/index.html');
});

// Should probably be moved to public folder aswell. Not sure
app.get('/script.js', (req, res) => {
    res.sendFile(process.cwd() + '/client/script.js');
});

app.get('/constants.js', (req, res) => {
    res.sendFile(process.cwd() + '/public/constants.js');
});

const TIMER_INTERVAL = 20; //[ms]
const BOMB_MOVE_FACTOR = PLAYER_SIZE/2; //to place bomb in the middle of the player
const BOMB_TIMER = 3/*s*/ * 1000/TIMER_INTERVAL; //time until detonation
const BOMB_DETONATION_TIME = 1/*s*/ * 1000/TIMER_INTERVAL; //duration of detonation
const MOVING_STEP = GB_SIZE/80; //how far does a player move by one timer interval --> speed

const clientRooms = {}; //Information about all rooms

class Explosion {
    constructor(x, y) {
        //horizontal rect (left-top and right-bottom corners)
        this.hor_lt_x = x - BOMB_DETONATION_WIDTH/2;
        this.hor_lt_y = y - BOMB_RADIUS;
        this.hor_rb_x = this.hor_lt_x + BOMB_DETONATION_WIDTH;
        this.hor_rb_y = this.hor_lt_y + BOMB_RADIUS*2

        //vertical rect
        this.vert_lt_x = x - BOMB_RADIUS;
        this.vert_lt_y = y - BOMB_DETONATION_WIDTH/2;
        this.vert_rb_x = this.vert_lt_x + BOMB_RADIUS*2;
        this.vert_rb_y = this.vert_lt_y + BOMB_DETONATION_WIDTH;
    }
    hits(player) {
        //TODO: any point of player touching one of the rectangles?
        //player:
        let player_lt_x = player.pos.x;
        let player_lt_y = player.pos.y;
        let player_rb_x = this.player_lt_x + PLAYER_SIZE;
        let player_rb_y = this.player_lt_y + PLAYER_SIZE;

        //bottom right corner inside horizontal rect
        if((this.hor_lt_x  <= player_rb_x && player_rb_x <= this.hor_rb_x &&
            this.hor_lt_y <= player_rb_y && player_rb_y <= this.hor_rb_y     ) ||  
            //bottom left corner inside horizontal rect
            (this.hor_lt_x  <= player_lt_x && player_lt_x <= this.hor_rb_x &&
                this.hor_lt_y <= player_rb_y && player_rb_y <= this.hor_rb_y     ) ||
            //top left corner inside horizontal rect
            (this.hor_lt_x  <= player_lt_x && player_lt_x <= this.hor_rb_x &&
                this.hor_lt_y <= player_lt_y && player_lt_y <= this.hor_rb_y      ) ||
            //top right corner inside horizontal rect
            (this.hor_lt_x  <= player_rb_x && player_rb_x <= this.hor_rb_x &&
                this.hor_lt_y <= player_lt_y && player_lt_y <= this.hor_rb_y      ) ) {
                    
            return true;
        } else {
            return false;
        }
    }
}

class Room {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.playerCount = 0;
        this.gameState = initalGameState();
        this.isRunning = false;
    }
    //returns player-ID
    addPlayer() {
        let id = this.playerCount;
        this.playerCount++;
        
        return id;
    }
    removePlayer() {
        if(this.playerCount > 0) this.playerCount--;
    }
    isEmpty() {
        return this.playerCount === 0;
    }
    startGame() {
        if(this.playerCount < 2) {
            //TODO: error message "can't start game with less than 2 players"
        } else {
            const interval = setInterval(() => {
                /* send game update to current room */

                let player1 = this.gameState.players[0];
                let player2 = this.gameState.players[1];
                
                //update gamestate of room
                updatePlayerPositions(player1);
                updatePlayerPositions(player2);
        
                const bombs = this.gameState.bombs;
                // TODO: 
                bombs.forEach(bomb => {
                    bomb.timer--;
        
                    if(!bomb.detonated) { //bomb is alive
                        if(bomb.timer <= 0) { //bomb detonates now
                            bomb.detonated = true;
                            bomb.timer = BOMB_DETONATION_TIME; //reset timer to detonation time
                            bomb.explosion = new Explosion(bomb.x, bomb.y); //calc explosion range
                        }
                    } else { //bomb is exploding currently
                        //check if hitting a player

                        if(bomb.explosion.hits(player1)) console.log("hit player 1");
                        if(bomb.explosion.hits(player2)) console.log("hit player 2");
        
                        if(bomb.timer <= 0) { //detonation is over
                            bombs.splice(bombs.indexOf(bomb),1); //delete bomb
                        }
                    }
                });

                // Send gamestate to all players in room
                io.in(this.roomCode).emit('gameUpdate', this.gameState);

                
            }, TIMER_INTERVAL);
        }
    }
    changeDirection(id, direction) {
        //only the first 2 players have the permission to play
        if(id < 2) {
            this.gameState.players[id].direction = direction;
        }
    }
    placeBomb(id) {
        //only the first 2 players have the permission to play
        if(id < 2) {
            let player = this.gameState.players[id];
            this.gameState.bombs.push({
                x: player.pos.x + BOMB_MOVE_FACTOR,
                y: player.pos.y + BOMB_MOVE_FACTOR,
                radius: BOMB_RADIUS,
                timer: BOMB_TIMER,
                detonated: false
            });
        }
    }
}

io.on('connection', (player) => {
    player.roomCode = -1;

    player.on('joinGame', handleJoinGame);
    player.on('startNewGame', handleStartNewGame);
    player.on('direction', handleDirection);
    player.on('bomb', handleBomb);
    player.on('disconnect', handleDisconnect);

    function handleJoinGame(code) {
        //only join if client has no room yet
        if(player.roomCode !== -1) {
            //TODO: error message to client
            console.log("Client can't join 2 different lobbies!");
        //room does not exist
        } else if(clientRooms[code] === undefined) {
            //TODO: error message to client
            console.log("Room does not exist!");
        } else {
            //Join lobby
            player.roomCode = code;
            player.number = clientRooms[code].addPlayer();
            player.join(code);
            console.log('joined lobby');

            //Second player joined -> game can start
            //Spectators shouldnt start game again
            //TODO: add "start"-Button for creator of lobby
            if(!clientRooms[code].isRunning) {
                clientRooms[code].startGame();
                clientRooms[code].isRunning = true;
            }
        }
    }

    function handleStartNewGame() {
        //only join if client has no room yet
        if(player.roomCode !== -1) {
            //TODO: error message to client
            console.log("Client can't create more than one lobby!");
        } else {
            let roomCode = makeid(6);
            clientRooms[roomCode] = new Room(roomCode);
            player.roomCode = roomCode;
            player.number = clientRooms[roomCode].addPlayer(); //returns ID
            player.join(roomCode);
            player.emit('gameCode', roomCode);

            console.log('opened lobby');
            //Waiting for second player to connect...
        }
    }

    function handleDirection(data) {
        //Room exists and game has started
        if( clientRooms[player.roomCode] !== undefined &&
            clientRooms[player.roomCode].isRunning) {
            //update direction of current player
            clientRooms[player.roomCode].changeDirection(player.number, data.direction);
        }
    }

    function handleBomb() {
        //Room exists and game has started
        if( clientRooms[player.roomCode] !== undefined &&
            clientRooms[player.roomCode].isRunning) {
            clientRooms[player.roomCode].placeBomb(player.number);
        }
    }
    
    function handleDisconnect() {
        //update to room system
        
        if ( clientRooms[player.roomCode] !== undefined ) { //room exists
            clientRooms[player.roomCode].removePlayer();

            //last player has left --> delete room
            if(clientRooms[player.roomCode].isEmpty()) {
                delete clientRooms[player.roomCode];
                console.log("Room " + player.roomCode + " deleted.");
                console.log(clientRooms.length + " Rooms left.");
                player.leave(player.roomCode);
            }
        }
    }
});

function updatePlayerPositions(player) {
    let x_, y_;

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

httpServer.listen(3000, () => {
    console.log('listening on *:3000');
});