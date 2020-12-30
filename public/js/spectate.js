import {GB_SIZE, PLAYER_SIZE, BOMB_RADIUS, BOMB_DETONATION_WIDTH, FIXED_OBSTACLES, GB_FIELDS, FIELD_SIZE} from '/constants.js';

let socket = io();
let panel = document.getElementById("spectatePanel");   
const ctxs = [];

function createGamePanel() {
    const gamePanel = document.createElement('canvas');
    gamePanel.style.setProperty('height', '150px');
    gamePanel.style.setProperty('width', '150px');
    gamePanel.style.setProperty('background-color', '#e7e7e7');
    return gamePanel;
}

socket.emit('requestGamelist');

socket.on('gameList', (list) => {
    if(list.length == 0) {
        document.getElementById("gameCodeDisplay").innerHTML("No games found...");
        return;
    } 

    // 1x1, 2x2 or 3x3 grid?
    let size = 1;
    if(list.length >= 9) {
        size = 3;
    } else if(list.length >= 4) {
        size = 2;
    }
    
    panel.style.setProperty('grid-template-columns', 'repeat(' + size + ', 1fr)');
    
    for(let i = 0; i < size*size; i++) {
        let p = createGamePanel();
        let ctx = p.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.rect(20, 20, 100, 100);
        ctx.closePath();
        ctx.fill();

        const room = {};
        room.ctx = ctx;
        room.id = list[i];
        ctxs.push(room);  
        socket.emit('joinGame', room.id);

        panel.appendChild(p);
    }
});

function renderPlayers(ctx, players) {
    ctx.clearRect(0, 0, GB_SIZE, GB_SIZE);
    players.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.rect(p.pos.x, p.pos.y, PLAYER_SIZE, PLAYER_SIZE);
        ctx.closePath();
        ctx.fill();
    });
}

function renderBombs(ctx, bombs) {
    bombs.forEach(b => {
        if(!b.detonated) { //draw bomb
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fill();
        } else { //draw explosion
            ctx.fillStyle = "#ffa421";
            ctx.beginPath();

            //TODO: use bomb.Explosion object for boundaries of rects.
            // --> calculating only once (on server side)
            // --> boundaries depend on surrounding obstacles

            //horizontal rect
            ctx.rect(b.x - BOMB_DETONATION_WIDTH/2, b.y - b.radius, BOMB_DETONATION_WIDTH, b.radius*2);
            //vertical rect
            ctx.rect(b.x - b.radius, b.y - BOMB_DETONATION_WIDTH/2, b.radius*2, BOMB_DETONATION_WIDTH);

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
                ctx.rect(j * FIELD_SIZE, i * FIELD_SIZE, FIELD_SIZE, FIELD_SIZE);
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