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
const MOVING_STEP = 5; //how far does a player move by one timer interval --> speed

const clientRooms = {}; //Information about all rooms
//const gameState = {}; //Holds current gamestate for every room

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

class Room {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.playerCount = 0;
        this.gameState = initalGameState();
        this.isRunning = false;
    }
    addPlayer() {
        let id = this.playerCount;
        this.playerCount++;
        
        return id;
    }
    startGame() {
        if(this.playerCount < 2) {
            //TODO: error message "can't start game with less than 2 players"
        } else {
            const interval = setInterval(() => {
                /* send game update to current room */
                
                //update gamestate of room
                updatePlayerPositions(this.gameState.players[0]);
                updatePlayerPositions(this.gameState.players[1]);
        
                const bombs = this.gameState.bombs;
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

                // Send gamestate to all players in room
                io.in(this.roomCode).emit('gameUpdate', this.gameState);

                //WHY DOES THE ROOM NOT WORK? :( 
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

io.on('connection', (player) => {
    player.roomCode = -1;
    //console.log(player.rooms);

    player.on('joinGame', handleJoinGame);
    player.on('startNewGame', handleStartNewGame);
    player.on('direction', handleDirection);
    player.on('bomb', handleBomb);
    player.on('disconnect', handleDisconnect);

    function handleJoinGame(code) {
        //only join if client has no room yet
        if(player.roomCode === -1) {
            //TODO: Check if lobby with gameCode = code exists
            //Join lobby and save roomcode for player in clientRooms
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
        let roomCode = makeid(6);
        clientRooms[roomCode] = new Room(roomCode);
        player.roomCode = roomCode;
        player.number = clientRooms[roomCode].addPlayer();
        player.join(roomCode);
        console.log("joining code: " + roomCode);
        player.emit('gameCode', roomCode);

        console.log('opened lobby');
        //Waiting for second player to connect...
    }

    function handleDirection(data) {
        //update direction of current player
        clientRooms[player.roomCode].changeDirection(player.number, data.direction);
    }

    function handleBomb() {
        clientRooms[player.roomCode].placeBomb(player.number);
    }
    
    function handleDisconnect() {
        //TODO: update to room system
        //socket_arr.splice(player.id,1);
        console.log('a user disconnected');
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