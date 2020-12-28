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

import {Explosion, Room} from './server/game.js'

// https://expressjs.com/en/starter/static-files.html
app.use(express.static(process.cwd() + '/public'));

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/client/index.html');
});

// Should probably be moved to public folder aswell. Not sure
app.get('/script.js', (req, res) => {
    res.sendFile(process.cwd() + '/client/script.js');
});

const TIMER_INTERVAL = 20;
const clientRooms = {}; //Information about all rooms

io.on('connection', (player) => {
    player.roomCode = -1;

    player.on('joinGame', handleJoinGame);
    player.on('createGame', handleCreateGame);
    player.on('startGame', handleStartGame);
    player.on('direction', handleDirection);
    player.on('bomb', handleBomb);
    player.on('disconnect', handleDisconnect);

    function handleJoinGame(code) {
        //only join if client has no room yet
        if(player.roomCode !== -1) {
            //TODO: error message to client
            player.emit('log', {"type": "error" ,"message": "Already joined another lobby."})

            console.log("Client can't join 2 different lobbies!");
        //room does not exist
        } else if(clientRooms[code] === undefined) {
            //TODO: error message to client
            player.emit('log', {"type": "error" ,"message": "Invalid game code entered."})
            console.log("Room does not exist!");
        } else {
            //Join lobby
            player.roomCode = code;
            player.number = clientRooms[code].addPlayer();
            player.join(code);
            console.log('joined lobby');
            player.emit('log', {"type": "success" ,"message": "Joined lobby successfully."})

            //Second player joined -> owner can start game
            //Spectators shouldnt start game again
            if(!clientRooms[code].isReady && !clientRooms[code].isRunning) {
                player.emit('log', {"type": "info" ,"message": "Waiting for lobby owner to start the game..."})
                clientRooms[code].owner.emit('lobbyFull');
                clientRooms[code].isReady = true;
            } else {
                player.emit('log', {"type": "info" ,"message": "Spectating the game..."})
            }
        }
    }

    function handleCreateGame() {
        //only join if client has no room yet
        if(player.roomCode !== -1) {
            player.emit('log', {"type": "error" ,"message": "Can't create more than one lobby."})
            console.log("Client can't create more than one lobby!");
        } else {
            let roomCode = makeid(6);
            clientRooms[roomCode] = new Room(roomCode);
            player.roomCode = roomCode;
            player.number = clientRooms[roomCode].addPlayer(); //returns ID
            clientRooms[roomCode].owner = player;
            player.join(roomCode);
            player.emit('gameCode', roomCode);

            console.log('opened lobby');
            player.emit('log', {"type": "success" ,"message": "Created lobby successfully."})

            //Waiting for second player to connect...
        }
    }

    function handleStartGame() {
        let room = clientRooms[player.roomCode];
        if(!room.isRunning) {
            startGameLoop(room);
            room.isRunning = true;
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

function startGameLoop(room) {
    if(room.playerCount < 2) {
        //TODO: error message "can't start game with less than 2 players"
    } else {
        const interval = setInterval(() => {
            // update gamestate of current room
            room.update();
            
            // Send gamestate to all players in room
            io.in(room.roomCode).emit('gameUpdate', room.gameState);
        }, TIMER_INTERVAL);
    }
}


httpServer.listen(3000, () => {
    console.log('listening on *:3000');
});