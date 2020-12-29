//const { getRandomColor } = require('./utils');
import { GB_SIZE, PLAYER_SIZE, BOMB_RADIUS, BOMB_DETONATION_WIDTH } from '../public/constants.js';
import { getRandomColor } from './utils.js';

/*module.exports = {
    initalGameState
}*/

const TIMER_INTERVAL = 20; //[ms]
const BOMB_MOVE_FACTOR = PLAYER_SIZE/2; //to place bomb in the middle of the player
const BOMB_TIMER = 3/*s*/ * 1000/TIMER_INTERVAL; //time until detonation
const BOMB_DETONATION_TIME = 1/*s*/ * 1000/TIMER_INTERVAL; //duration of detonation
const MOVING_STEP = GB_SIZE/80; //how far does a player move by one timer interval --> speed

export function initalGameState() {
    return {
        players: [
        {
            pos: {
                //top left corner
                x: GB_SIZE/40,
                y: GB_SIZE/40,
            },
            color: getRandomColor(),
            direction: 4,
            name: "P1"
        }, 
        {
            pos: {
                //bottom right corner
                x: GB_SIZE - GB_SIZE/40 - PLAYER_SIZE,
                y: GB_SIZE - GB_SIZE/40 - PLAYER_SIZE,
            },
            color: getRandomColor(),
            direction: 4,
            name: "P2"
            }
        ],
        bombs: [],
    };
}

function updatePlayerPositions(player) {
    let x_, y_;

    switch(player.direction) {
        case 0:     //left
            x_ = player.pos.x - MOVING_STEP;
            y_ = player.pos.y;
            break;
        case 1:     //up
            x_ = player.pos.x;
            y_ = player.pos.y - MOVING_STEP;
            break;
        case 2:     //right
            x_ = player.pos.x + MOVING_STEP;
            y_ = player.pos.y;
            break;
        case 3:     //down
            x_ = player.pos.x;
            y_ = player.pos.y + MOVING_STEP;
            break;
        default:    //not moving
            return;
    }

    //TODO: if(isValidPosition(player, x_, y_)) {
    player.pos.x = x_;
    player.pos.y = y_;
}

export class Explosion {
    constructor(x, y) {
        this.rects = [];

        //horizontal rect (left-top and right-bottom corners)

        let lt_x = x - BOMB_DETONATION_WIDTH/2;
        let lt_y = y - BOMB_RADIUS;
        let rb_x = lt_x + BOMB_DETONATION_WIDTH;
        let rb_y = lt_y + BOMB_RADIUS*2;

        this.rects.push({
            lt_x: lt_x,
            lt_y: lt_y,
            rb_x: rb_x,
            rb_y: rb_y
        });

        //vertical rect

        lt_x = x - BOMB_RADIUS;
        lt_y = y - BOMB_DETONATION_WIDTH/2;
        rb_x = lt_x + BOMB_RADIUS*2;
        rb_y = lt_y + BOMB_DETONATION_WIDTH;

        this.rects.push({
            lt_x: lt_x,
            lt_y: lt_y,
            rb_x: rb_x,
            rb_y: rb_y
        });

        console.log(this.rects);

        //horizontal rect (left-top and right-bottom corners)
        /*this.hor_lt_x = x - BOMB_DETONATION_WIDTH/2;
        this.hor_lt_y = y - BOMB_RADIUS;
        this.hor_rb_x = this.hor_lt_x + BOMB_DETONATION_WIDTH;
        this.hor_rb_y = this.hor_lt_y + BOMB_RADIUS*2*/

        //vertical rect
        /*this.vert_lt_x = x - BOMB_RADIUS;
        this.vert_lt_y = y - BOMB_DETONATION_WIDTH/2;
        this.vert_rb_x = this.vert_lt_x + BOMB_RADIUS*2;
        this.vert_rb_y = this.vert_lt_y + BOMB_DETONATION_WIDTH;*/
    }
    hits(player) {
        //TODO: any point of player touching one of the rectangles?
        //player:
        let player_lt_x = player.pos.x;
        let player_lt_y = player.pos.y;
        let player_rb_x = player_lt_x + PLAYER_SIZE;
        let player_rb_y = player_lt_y + PLAYER_SIZE;

        let hit = false;
        let i = 0;

        //check collision for horizontal and vertical rect
        while(i < 2 && !hit) {
            let rect = this.rects[i];
            //bottom right corner inside rect?
            if((rect.lt_x  <= player_rb_x && player_rb_x <= rect.rb_x &&
                rect.lt_y <= player_rb_y && player_rb_y <= rect.rb_y      ) ||  
                //bottom left corner inside rect?
                (rect.lt_x  <= player_lt_x && player_lt_x <= rect.rb_x &&
                rect.lt_y <= player_rb_y && player_rb_y <= rect.rb_y      ) ||
                //top left corner inside rect?
                (rect.lt_x  <= player_lt_x && player_lt_x <= rect.rb_x &&
                    rect.lt_y <= player_lt_y && player_lt_y <= rect.rb_y  ) ||
                //top right corner inside rect?
                (rect.lt_x  <= player_rb_x && player_rb_x <= rect.rb_x &&
                    rect.lt_y <= player_lt_y && player_lt_y <= rect.rb_y  )) {
                
                hit = true;

            //special case where player is inside rectangle without touching it with its corners
                      //for horizontal rect
            } else if(i===0 &&
                      (player_lt_y < rect.lt_y && rect.rb_y < player_rb_y) && //rect between players corners
                      (rect.lt_x <= player_rb_x && rect.rb_x >= player_lt_x)) {
                hit = true;
                
                      //for vertical rect
            } else if(i===1 &&
                      (player_lt_x < rect.lt_x && rect.rb_x < player_rb_x) && //rect between players corners
                      (rect.lt_y <= player_rb_y && rect.rb_y >= player_lt_y)) {
                hit = true;
            }
            i++;
        }

        return hit;
    }
}

export class Room {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.playerCount = 0;
        this.gameState = initalGameState();
        this.isRunning = false;
        this.isReady = false;
    }
    //returns player-ID
    addPlayer() {
        let id = this.playerCount;
        this.playerCount++;
        
        return id;
    }
    removePlayer() {
        if(this.playerCount > 0) this.playerCount--;
    }
    isEmpty() {
        return this.playerCount === 0;
    }
    update() {
        let player1 = this.gameState.players[0];
        let player2 = this.gameState.players[1];
        
        //update gamestate of room
        updatePlayerPositions(player1);
        updatePlayerPositions(player2);

        const bombs = this.gameState.bombs;
        // TODO: 
        bombs.forEach(bomb => {
            bomb.timer--;

            if(!bomb.detonated) { //bomb is alive
                if(bomb.timer <= 0) { //bomb detonates now
                    bomb.detonated = true;
                    bomb.timer = BOMB_DETONATION_TIME; //reset timer to detonation time
                    bomb.explosion = new Explosion(bomb.x, bomb.y); //calc explosion range
                }
            } else { //bomb is exploding currently
                //check if hitting a player

                if(bomb.explosion.hits(player1)) console.log("hit player 1");
                if(bomb.explosion.hits(player2)) console.log("hit player 2");

                if(bomb.timer <= 0) { //detonation is over
                    bombs.splice(bombs.indexOf(bomb),1); //delete bomb
                }
            }
        });     
    }

    changeDirection(id, direction) {
        //only the first 2 players have the permission to play
        if(id < 2) {
            this.gameState.players[id].direction = direction;
        }
    }
    placeBomb(id) {
        //only the first 2 players have the permission to play
        if(id < 2) {
            let player = this.gameState.players[id];
            this.gameState.bombs.push({
                x: player.pos.x + BOMB_MOVE_FACTOR,
                y: player.pos.y + BOMB_MOVE_FACTOR,
                radius: BOMB_RADIUS,
                timer: BOMB_TIMER,
                detonated: false
            });
        }
    }
}