const express = require('express'); 
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// https://expressjs.com/en/starter/static-files.html
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});

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
const MOVING_STEP = 5; //how far does a player move by one timer interval

const socket_arr = []; //array of active players
const bombs = [];
let currentPlayers = 0;

function getRandomColor() {
    let letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

io.on('connection', (player) => {
    player.id = ++currentPlayers;
    //random start position
    player.x = Math.floor(Math.random()*(GB_SIZE-PLAYER_SIZE));
    player.y = Math.floor(Math.random()*(GB_SIZE-PLAYER_SIZE));
    player.color = getRandomColor();
    player.direction = 4; //moving direction. 0:left, 1:up, 2:right, 3:down, 4:none
    player.name = "Player " + player.id;

    //add to active players
    socket_arr[player.id] = player;

    player.on('direction', (data) => {
        player.direction = data.direction;
    });

    player.on('bomb', () => {
        bombs.push({
            x: player.x + BOMB_MOVE_FACTOR,
            y: player.y + BOMB_MOVE_FACTOR,
            radius: BOMB_RADIUS,
            timer: BOMB_TIMER,
            detonated: false
        });
    });

    player.on('disconnect', () => {
        socket_arr.splice(player.id,1); //better than delete (?)
        //delete socket_arr[player.id];
        console.log('a user disconnected');
    });

    console.log('a user connected');
});

function updatePlayerPositions(player) {
    switch(player.direction) {
        case 0:     //left
            x_ = player.x - MOVING_STEP;
            y_ = player.y;
            break;
        case 1:     //up
            x_ = player.x;
            y_ = player.y - MOVING_STEP;
            break;
        case 2:     //right
            x_ = player.x + MOVING_STEP;
            y_ = player.y;
            break;
        case 3:     //down
            x_ = player.x;
            y_ = player.y + MOVING_STEP;
            break;
        default:    //not moving
            return;
    }

    //TODO: if(isValidPosition(player, x_, y_)) {
    player.x = x_;
    player.y = y_;
}

class Explosion {
    constructor(x, y) {
        //horizontal rect (left-top and right-bottom corners)
        hor_lt_x = x - DETONATION_WIDTH/2;
        hor_lt_y = y - BOMB_RADIUS;
        hor_rb_x = hor_lt_x + DETONATION_WIDTH;
        hor_rb_y = hor_lt_y + BOMB_RADIUS*2

        //vertical rect
        vert_lt_x = x - BOMB_RADIUS;
        vert_lt_y = y - DETONATION_WIDTH/2;
        vert_rb_x = vert_lt_x + BOMB_RADIUS*2;
        vert_rb_y = vert_lt_y + DETONATION_WIDTH;
    }
    hits(player) {
        //TODO: any point of player touching one of the rectangles?

        //return true/false
    }
}

setInterval(() => {
    /* send game update to all players */

    //update players positions
    const playerPack = [];
    // Fill pack with information of all players
    socket_arr.forEach(player => {
        updatePlayerPositions(player);
        playerPack.push({ name: player.name, 
                    x: player.x, 
                    y: player.y,
                    color: player.color, 
                    width: PLAYER_SIZE, //not safed for each player since the
                    height: PLAYER_SIZE //size is the same for everybody
        });
    });
        
    for(let i = 0; i < bombs.length; i++) {
        const bomb = bombs[i];

        bomb.timer--;

        if(!bomb.detonated) { //bomb is alive
            if(bomb.timer <= 0) { //bomb detonates now
                bomb.detonated = true;
                bomb.timer = BOMB_DETONATION_TIME; //reset timer to detonation time
                bomb.explosion = new Explosion(bomb.x, bomb.y); //calc explosion range
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
                bombs.splice(i,1); //delete bomb
            }
        }
    }

    // Send pack(s) to all players
    io.emit('gameUpdate', playerPack, bombs);
}, 20);

http.listen(3000, () => {
    console.log('listening on *:3000');
});