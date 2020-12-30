import {GB_SIZE, FIXED_OBSTACLES} from '/constants.js';
import {r_clearRect, renderPlayers, renderBombs, renderObstacles, getScreenFactor} from '/js/drawing.js'

let RESIZE_FACTOR = 1;

let socket = io();
let panel = document.getElementById("spectatePanel");   
const ctxs = [];

function createGamePanel() {
    const gamePanel = document.createElement('canvas');
    gamePanel.height = GB_SIZE / RESIZE_FACTOR;
    gamePanel.width = GB_SIZE / RESIZE_FACTOR;
    gamePanel.style.setProperty('background-color', '#e7e7e7');
    return gamePanel;
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


socket.on('gameUpdate', (state) => {
    let ctx;
    ctxs.forEach((element) => {
        if(element.id == state.room) {
            ctx = element.ctx;
        } 
    });

    r_clearRect(ctx, GB_SIZE, GB_SIZE, 1/RESIZE_FACTOR);
    renderPlayers(ctx, state.players, 1/RESIZE_FACTOR);
    renderBombs(ctx, state.bombs, 1/RESIZE_FACTOR);
    renderObstacles(ctx, FIXED_OBSTACLES, "#A8A8A8", 1/RESIZE_FACTOR); //gray
    renderObstacles(ctx, state.var_obstacles, "#DEB887", 1/RESIZE_FACTOR);  //brown
});