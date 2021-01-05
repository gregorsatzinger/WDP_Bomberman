import {GB_SIZE, FIXED_OBSTACLES, GB_FIELDS} from '/js/constants.js';
import {r_clearRect, renderPlayers, renderBombs, renderObstacles, getScreenFactor} from '/js/drawing.js'

let RESIZE_FACTOR = getScreenFactor();
let grid_columns;

let socket = io();
let panel = document.getElementById("spectatePanel");   
const ctxs = [];
let var_obstacles = [];
let bombs = [];

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

        //init
        bombs[room.id] = [];
        var_obstacles[room.id] = [];
        for(let i = 0; i < GB_FIELDS; i++) {
            for(let j = 0; j < GB_FIELDS; j++) {
                var_obstacles[room.id][GB_FIELDS * i + j] = false;
            }
        }

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

    if(state.bombs !== undefined) {
        bombs[state.room] = state.bombs;
    }
    renderBombs(ctx, bombs[state.room], resizeBy);

    if(state.var_obstacles !== undefined) {
        var_obstacles[state.room] = state.var_obstacles;
    }

    renderObstacles(ctx, var_obstacles[state.room], "#DEB887", resizeBy);  //brown
    renderObstacles(ctx, FIXED_OBSTACLES, "#A8A8A8", resizeBy); //gray
});