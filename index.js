const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});

app.get('/script.js', (req, res) => {
    res.sendFile(__dirname + '/client/script.js');
})

const GB_SIZE = 400; //gameboard size
const PLAYER_SIZE = GB_SIZE/10;
const MOVING_STEP = 3; //how far does a player move by one timer interval

const SOCKET_ARR = []; //array of active players
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
    SOCKET_ARR[player.id] = player;

    player.on('direction', (data) => {
        player.direction = data.direction;
    })

    player.on('disconnect', () => {
        delete SOCKET_ARR[player.id];
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

setInterval(() => {
    const pack = [];
    // Fill pack with information of all players
    for(let i in SOCKET_ARR) {
        const player = SOCKET_ARR[i];
        updatePlayerPositions(player);
        pack.push({ name: player.name, 
                    x: player.x, 
                    y: player.y,
                    color: player.color, 
                    width: PLAYER_SIZE, //not safed for each player since the
                    height: PLAYER_SIZE //size is the same for everybody
                });
    }
    //TODO: check if bomb timer expired ---> peng

    // Send pack to all players
    io.emit('newPositions', pack);
}, 1000/30);

http.listen(3000, () => {
    console.log('listening on *:3000');
});