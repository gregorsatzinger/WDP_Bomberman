//comment for test commit
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});

const SOCKET_LIST = {};
let currentPlayers = 0;

io.on('connection', (socket) => {
    socket.id = ++currentPlayers;
    socket.x = 0;
    socket.y = 0;
    socket.name = "Player " + socket.id;
    SOCKET_LIST[socket.id] = socket;

    socket.on('disconnect', () => {
        delete SOCKET_LIST[socket.id];
        console.log('a user disconnected');
    });
    console.log('a user connected');
});

setInterval(() => {
    const pack = [];
    // Fill pack with position of all players
    for(let i in SOCKET_LIST) {
        const socket = SOCKET_LIST[i];
        socket.x++;
        socket.y++;
        pack.push({name: socket.name, x: socket.x, y: socket.y});
    }
    // Send pack to all players
    for(let i in SOCKET_LIST) {
        const socket = SOCKET_LIST[i];
        socket.emit('newPositions', pack);
    }
}, 1000/30);

http.listen(3000, () => {
    console.log('listening on *:3000');
});