import express from 'express';
const app = express();

import http from 'http';
const httpServer = http.createServer(app);

import {Server} from 'socket.io';
const io = new Server(httpServer);

import {makeid} from './server/utils.js';

import {Room} from './server/game.js'

app.use(express.static(process.cwd() + '/public'));

app.get('/spectate', (req, res) => {
    res.sendFile(process.cwd() + '/client/spectate.html');
    /* Use this code for presentation to reduce server load
    if(req.connection.remoteAddress === "::1") {
        res.sendFile(process.cwd() + '/client/spectate.html');
    } else {
        res.sendFile(process.cwd() + '/client/index.html');
    }*/
});
app.get('/:roomCode', (req, res) => {
    res.sendFile(process.cwd() + '/client/index.html');
});
app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/client/index.html');
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
    player.on('requestGamelist', handleRequestGamelist);
    player.on('quickGame', handleQuickGame);


    function handleJoinGame(code) {
        if(clientRooms[code] === undefined) {
            player.emit('log', {"type": "error" ,"message": "Invalid game code entered."})
        } else {
            //Join lobby
            player.roomCode = code;
            player.number = clientRooms[code].addPlayer();
            player.join(code);
            player.emit('log', {"type": "success" ,"message": "Joined lobby successfully."})

            //Second player joined -> p1 can start game
            //Spectators shouldnt start game again
            if(!clientRooms[code].isReady && !clientRooms[code].isRunning) {
                player.emit('log', {"type": "info" ,"message": "Waiting for lobby owner to start the game..."})
                clientRooms[code].p1.emit('lobbyFull');
                clientRooms[code].isReady = true;
            } else {
                player.emit('log', {"type": "info" ,"message": "Spectating the game..."})

                //TODO update-method
                clientRooms[code].sendUpdate();
            }
        }
    }

    function handleCreateGame() {
        //only join if client has no room yet
        if(player.roomCode !== -1) {
            player.emit('log', {"type": "error" ,"message": "Can't create more than one lobby."})
        } else {
            let roomCode = makeid(6);
            clientRooms[roomCode] = new Room(roomCode);
            player.roomCode = roomCode;
            player.number = clientRooms[roomCode].addPlayer(); //returns ID
            clientRooms[roomCode].p1 = player;
            player.join(roomCode);
            player.emit('gameCode', roomCode);

            player.emit('log', {"type": "success" ,"message": "Created lobby successfully."})
            player.emit('log', {"type": "info" ,"message": "Waiting for second player to join..."})

            //Waiting for second player to connect...
        }
    }

    function handleQuickGame() {
        let availableRoom = "";
        //Find available room
        Object.entries(clientRooms).forEach(([key, value]) => {
            //Look for a game thats not private, not running, has one player waiting and isnt finished
            if(!value.isPrivate && !value.isRunning && value.playerCount == 1 && value.gameResult === '-') {
                availableRoom = key;
            }
        });
        //no lobby found -> create new one
        if(availableRoom === "") {
            //Create new game and sets player.roomCode to created lobby
            handleCreateGame();
            clientRooms[player.roomCode].isPrivate = false;
        } 
        //lobby found -> join
        else {
            handleJoinGame(availableRoom);
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
        if ( clientRooms[player.roomCode] !== undefined ) { //room exists
            clientRooms[player.roomCode].removePlayer();

            //last player has left --> delete room
            if(clientRooms[player.roomCode].isEmpty()) {
                delete clientRooms[player.roomCode];
                player.leave(player.roomCode);
            //active player has left
            } else if(player.number === 0) {
                io.in(player.roomCode).emit('log', {"type": "info" ,"message": "Opponent left the game"});
                clientRooms[player.roomCode].gameResult = "p2";
                clientRooms[player.roomCode].isRunning = false;
            } else if(player.number === 1) {
                io.in(player.roomCode).emit('log', {"type": "info" ,"message": "Opponent left the game"});
                clientRooms[player.roomCode].gameResult = "p1";
                clientRooms[player.roomCode].isRunning = false;
            }
        }
    }

    function handleRequestGamelist() {
        const activeGames = [];
        Object.entries(clientRooms).forEach(([key, value]) => {
            if(value.isRunning) {
                activeGames.push(key);
            }
        });
        player.emit('gameList', activeGames);
    }
});


function startGameLoop(room) {
    if(room.playerCount < 2) {
        //Cant get reached
    } else {
        const interval = setInterval(() => {
            // update gamestate of current room
            room.update();
            
            // Send gamestate to all players in room
            const state = room.gameState;

            /* client doesn't need all information of gamestate */
            const gameUpdate = {
                players: [],
                room: room.roomCode
            };

            state.players.forEach(p => {
                gameUpdate.players.push({
                    pos: p.pos,
                    color: p.color
                })
            });

            if(state.bombs_changed) {
                gameUpdate.bombs = [];
                state.bombs.forEach(b => {
                    gameUpdate.bombs.push({
                        x: b.x,
                        y: b.y,
                        detonated: b.detonated,
                        explosion: b.explosion
                    })
                });
                state.bombs_changed = false;
            }

            if(state.obstacles_changed) {
                gameUpdate.var_obstacles = state.var_obstacles;
                state.obstacles_changed = false;
            }

            io.in(room.roomCode).emit('gameUpdate', gameUpdate);
            
            //Check if game is over
            if(room.gameResult != "-") {
                let msg;
                if(room.gameResult == "p1") {
                    msg = "Player 1 won";
                } else if (room.gameResult == "p2") {
                    msg = "Player 2 won"
                } else if (room.gameResult == "tie") {
                    msg = "Tie";
                }
                io.in(room.roomCode).emit('gameOver', msg);
                room.isRunning = false;
                clearInterval(interval);
            }
        }, TIMER_INTERVAL);
    }
}


httpServer.listen(3000, () => {
    console.log('listening on *:3000');
});