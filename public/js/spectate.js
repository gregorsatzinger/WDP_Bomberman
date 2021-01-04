import {GB_SIZE, FIXED_OBSTACLES} from '/js/constants.js';
import {r_clearRect, renderPlayers, renderBombs, renderObstacles, getScreenFactor} from '/js/drawing.js'

let RESIZE_FACTOR = getScreenFactor();
let grid_columns;

let socket = io();
let panel = document.getElementById("spectatePanel");   
const ctxs = [];

function createGamePanel(roomCode) {
    const gamePanel = document.createElement('canvas');
    gamePanel.onclick = () => {window.location.href = '/'+roomCode}; //redirect to start page
    gamePanel.height = GB_SIZE * RESIZE_FACTOR / grid_columns;
    gamePanel.width = GB_SIZE * RESIZE_FACTOR / grid_columns;
    gamePanel.style.setProperty('background-color', '#e7e7e7');
    return gamePanel;
}

/**
 * Show running games
 */
socket.emit('requestGamelist');

socket.on('gameList', (list) => {

    // 1x1, 2x2 or 3x3 grid?
    if(list.length > 4) {
        grid_columns = 3;
    } else if(list.length > 1) {
        grid_columns = 2;
    } else if(list.length == 1) {
        grid_columns = 1;
    } else {
        document.getElementById("gameCodeDisplay").innerHTML = "No games found...";
        return;
    }
    
    document.getElementById("gameCodeDisplay").innerHTML = "Spectating " + list.length + " game" + ((list.length == 1) ? "" : "s") + "...";
    panel.style.setProperty('grid-template-columns', 'repeat(' + grid_columns + ', 1fr)');
    
    for(let i = 0; i < list.length; i++) {
        let p = createGamePanel(list[i]);
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

    r_clearRect(ctx, GB_SIZE, GB_SIZE, RESIZE_FACTOR/grid_columns);
    renderPlayers(ctx, state.players, RESIZE_FACTOR/grid_columns);
    renderBombs(ctx, state.bombs, RESIZE_FACTOR/grid_columns);
    renderObstacles(ctx, FIXED_OBSTACLES, "#A8A8A8", RESIZE_FACTOR/grid_columns); //gray
    renderObstacles(ctx, state.var_obstacles, "#DEB887", RESIZE_FACTOR/grid_columns);  //brown
});