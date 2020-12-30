import {GB_SIZE, PLAYER_SIZE, BOMB_RADIUS, BOMB_DETONATION_WIDTH, FIXED_OBSTACLES, GB_FIELDS, FIELD_SIZE} from '/constants.js';
let RESIZE_FACTOR = 1;

let socket = io();
let panel = document.getElementById("spectatePanel");   
const ctxs = [];

function createGamePanel() {
    const gamePanel = document.createElement('canvas');
    gamePanel.setAttribute('height', GB_SIZE / RESIZE_FACTOR+'px');
    gamePanel.setAttribute('width', GB_SIZE / RESIZE_FACTOR+'px');
    gamePanel.style.setProperty('background-color', '#e7e7e7');
    return gamePanel;
}

socket.emit('requestGamelist');

socket.on('gameList', (list) => {

    // 1x1, 2x2 or 3x3 grid?
    if(list.length >= 9) {
        RESIZE_FACTOR = 3;
    } else if(list.length >= 4) {
        RESIZE_FACTOR = 2;
    } else if(list.length >= 1) {
        RESIZE_FACTOR = 1;
    } else {
        document.getElementById("gameCodeDisplay").innerHTML = "No games found...";
        return;
    }
    
    panel.style.setProperty('grid-template-columns', 'repeat(' + RESIZE_FACTOR + ', 1fr)');
    
    for(let i = 0; i < RESIZE_FACTOR*RESIZE_FACTOR; i++) {
        let p = createGamePanel();
        let ctx = p.getContext("2d");

        const room = {};
        room.ctx = ctx;
        room.id = list[i];
        ctxs.push(room);  
        socket.emit('joinGame', room.id);

        panel.appendChild(p);
    }
});

function renderPlayers(ctx, players) {
    ctx.clearRect(0 / RESIZE_FACTOR, 0 / RESIZE_FACTOR, GB_SIZE / RESIZE_FACTOR, GB_SIZE / RESIZE_FACTOR);
    players.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.rect(p.pos.x / RESIZE_FACTOR, p.pos.y / RESIZE_FACTOR, PLAYER_SIZE / RESIZE_FACTOR, PLAYER_SIZE / RESIZE_FACTOR);
        ctx.closePath();
        ctx.fill();
    });
}

function renderBombs(ctx, bombs) {
    bombs.forEach(b => {
        if(!b.detonated) { //draw bomb
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(b.x / RESIZE_FACTOR, b.y / RESIZE_FACTOR, b.radius / RESIZE_FACTOR, 0, 2 * Math.PI / RESIZE_FACTOR);
            ctx.closePath();
            ctx.fill();
        } else { //draw explosion
            ctx.fillStyle = "#ffa421";
            ctx.beginPath();

            //TODO: use bomb.Explosion object for boundaries of rects.
            // --> calculating only once (on server side)
            // --> boundaries depend on surrounding obstacles

            //horizontal rect
            ctx.rect((b.x - BOMB_DETONATION_WIDTH/2) / RESIZE_FACTOR, (b.y - b.radius)  / RESIZE_FACTOR, BOMB_DETONATION_WIDTH  / RESIZE_FACTOR, b.radius*2  / RESIZE_FACTOR);
            //vertical rect
            ctx.rect((b.x - b.radius) / RESIZE_FACTOR, (b.y - BOMB_DETONATION_WIDTH/2) / RESIZE_FACTOR, b.radius*2 / RESIZE_FACTOR, BOMB_DETONATION_WIDTH / RESIZE_FACTOR);

            ctx.closePath();
            ctx.fill();
        }
    });
}

function renderObstacles(ctx, obstacles) {
    ctx.fillStyle = "#A8A8A8";
    ctx.beginPath();
    for(let i = 0; i < GB_FIELDS; i++) {
        for(let j = 0; j < GB_FIELDS; j++) {
            if(obstacles[GB_FIELDS * i + j]) {
                ctx.rect(j * FIELD_SIZE / RESIZE_FACTOR, i * FIELD_SIZE / RESIZE_FACTOR, FIELD_SIZE / RESIZE_FACTOR, FIELD_SIZE / RESIZE_FACTOR);
            }
        }
    }
    ctx.closePath();
    ctx.fill(); 
} 

socket.on('gameUpdate', (state) => {
    let context;
    ctxs.forEach((element) => {
        if(element.id == state.room) {
            context = element.ctx;
        } 
    });

    renderPlayers(context, state.players);
    renderBombs(context, state.bombs);
    renderObstacles(context, FIXED_OBSTACLES);
    //TODO: renderObstacles(state.var_obstacles);

});