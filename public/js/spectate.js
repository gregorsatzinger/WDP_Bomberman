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

/**
 * Resized drawing function for canvas
 */
function r_rect(ctx, x1, y1, x2, y2) {
    ctx.rect(x1 / RESIZE_FACTOR, y1 / RESIZE_FACTOR, x2 / RESIZE_FACTOR, y2 / RESIZE_FACTOR);
}
function r_clearRect(ctx, x1, y1, x2, y2) {
    ctx.clearRect(x1 / RESIZE_FACTOR, y1 / RESIZE_FACTOR, x2 / RESIZE_FACTOR, y2 / RESIZE_FACTOR);
}
//center.x center.y radius, start angle, end angle
function r_arc(ctx, x1, y1, r, a1, a2) {
    ctx.arc(x1 / RESIZE_FACTOR, y1 / RESIZE_FACTOR, r / RESIZE_FACTOR, a1, a2);
}

/**
 * Show running games
 */
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
    r_clearRect(ctx, 0, 0, GB_SIZE, GB_SIZE);
    players.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        r_rect(ctx, p.pos.x, p.pos.y, PLAYER_SIZE, PLAYER_SIZE);
        ctx.closePath();
        ctx.fill();
    });
}

function renderBombs(ctx, bombs) {
    bombs.forEach(b => {
        if(!b.detonated) { //draw bomb
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            r_arc(ctx, b.x, b.y, b.radius, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fill();
        } else { //draw explosion
            ctx.fillStyle = "#ffa421";
            ctx.beginPath();

            //TODO: use bomb.Explosion object for boundaries of rects.
            // --> calculating only once (on server side)
            // --> boundaries depend on surrounding obstacles

            //horizontal rect
            r_rect(ctx, b.x - BOMB_DETONATION_WIDTH/2, b.y - b.radius, BOMB_DETONATION_WIDTH, b.radius*2);
            //vertical rect
            r_rect(ctx, b.x - b.radius, b.y - BOMB_DETONATION_WIDTH/2, b.radius*2, BOMB_DETONATION_WIDTH);

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
                r_rect(ctx, j * FIELD_SIZE, i * FIELD_SIZE, FIELD_SIZE, FIELD_SIZE);
            }
        }
    }
    ctx.closePath();
    ctx.fill();
}

//TODO: use functions of drawing.js
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