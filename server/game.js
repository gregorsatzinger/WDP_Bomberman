import { GB_SIZE, 
         GB_FIELDS, 
         FIELD_SIZE, 
         INIT_MOVING_STEP, 
         PLAYER_SIZE,
         BOMB_RADIUS,
         FIXED_OBSTACLES, 
         POWER_UPS_COUNT, 
         POWER_UPS_PROBABILITY, 
         POWER_UPS } from '../public/js/constants.js';

import { getRandomColor } from './utils.js';

const TIMER_INTERVAL = 20; //[ms] TODO: into constants.js
const BOMB_MOVE_FACTOR = PLAYER_SIZE/2; //to place bomb in the middle of the player
const BOMB_TIMER = 2/*s*/ * 1000/TIMER_INTERVAL; //time until detonation
const BOMB_DETONATION_TIME = 0.7/*s*/ * 1000/TIMER_INTERVAL; //duration of detonation
const INIT_BOMB_DETONATION_WIDTH = GB_SIZE/10*3;

export function initalGameState() {

    //generating random var_obstacles
    let var_obstacles = [];

    for(let i = 0; i < GB_FIELDS; i++) {
        for(let j = 0; j < GB_FIELDS; j++) {
            if((i > 1 || j > 1) && (i < GB_FIELDS-2 || j < GB_FIELDS-2)) { //not too close to the players
                var_obstacles[GB_FIELDS * i + j] = Math.random() < 0.65 && !FIXED_OBSTACLES[GB_FIELDS * i + j];
            } else {
                var_obstacles[GB_FIELDS * i + j] = false;
            }
        }
    }

    return {
        players: [
        {
            pos: {
                //top left corner
                x: (FIELD_SIZE - PLAYER_SIZE) / 2,
                y: (FIELD_SIZE - PLAYER_SIZE) / 2,
            },
            color: getRandomColor(),
            direction: 4,
            bomb_max_cooldown: BOMB_TIMER,  //cooldown after bomb-placing. initially until bomb explodes
            bomb_curr_cooldown: 0,
            bomb_detonation_width: INIT_BOMB_DETONATION_WIDTH, //explosion radius of placed bombs
            moving_step: INIT_MOVING_STEP,
            name: "P1"
        }, 
        {
            pos: {
                //bottom right corner
                x: GB_SIZE - PLAYER_SIZE - (FIELD_SIZE - PLAYER_SIZE) / 2,
                y: GB_SIZE - PLAYER_SIZE - (FIELD_SIZE - PLAYER_SIZE) / 2,
            },
            color: getRandomColor(),
            direction: 4,
            bomb_max_cooldown: BOMB_TIMER,  //cooldown after bomb-placing. initially until bomb explodes
            bomb_curr_cooldown: 0,
            bomb_detonation_width: INIT_BOMB_DETONATION_WIDTH, //explosion radius of placed bombs
            moving_step: INIT_MOVING_STEP,
            name: "P2"
            }
        ],
        bombs: [],
        var_obstacles: var_obstacles
    };
}

class Explosion {
    constructor(bomb, var_obstacles) {
        let x = bomb.x;
        let y = bomb.y
        let explosion_range = bomb.detonation_width / 2;
        /***************** calculate range of explosion (explosion may be hitting (destroying) an obstacle) ******************/

        //indizes of bomb in obstacle-matrix
        let bomb_j = Math.floor(x / FIELD_SIZE);
        let bomb_i = Math.floor(y / FIELD_SIZE);
        

        //nearest distance to obstacle in every direction
        let left = GB_FIELDS;
        let right = GB_FIELDS;
        let up = GB_FIELDS;
        let down = GB_FIELDS;

        //left side
        let max_range = bomb_j - Math.floor((x - explosion_range) / FIELD_SIZE); //maximum number of affected fields
        let range = 1; //actual number of affected fields (due to obstacles)
        while(range <= max_range) {
            if(bomb_j - range >= 0) { //prevent destroying obstacle on the very right side one row above
                let idx = GB_FIELDS * bomb_i + (bomb_j - range); //index - to not calculate it three times
                if(FIXED_OBSTACLES[idx]) {
                    break; //obstacle found
                } else if(var_obstacles[idx] !== false) { //either true or index of power_up
                    this.destroy_var_obstacle(var_obstacles, idx);
                    break;
                }
            }
            range++;
        }
        range > max_range ? left = -1 : left = range; //-1 --> bomb does not hit an obstacle

        //right side
        max_range = Math.floor((x + explosion_range) / FIELD_SIZE) - bomb_j; //maximum number of affected fields
        range = 1; //actual number of affected fields (due to obstacles)
        while(range <= max_range) {
            if(bomb_j + range < GB_FIELDS) {
                let idx = GB_FIELDS * bomb_i + (bomb_j + range); //index - to not calculate it three times
                if(FIXED_OBSTACLES[idx]) {
                    break; //obstacle found
                } else if(var_obstacles[idx] !== false) { //either true or index of power_up
                    this.destroy_var_obstacle(var_obstacles, idx);
                    break;
                }
            }
            range++;
        }
        range > max_range ? right = -1 : right = range; //-1 --> bomb does not hit an obstacle

        //upper side
        max_range = bomb_i - Math.floor((y - explosion_range) / FIELD_SIZE); //maximum number of affected fields
        range = 1; //actual number of affected fields (due to obstacles)
        while(range <= max_range) {
            let idx = GB_FIELDS * (bomb_i - range) + bomb_j; //index - to not calculate it three times
            if(FIXED_OBSTACLES[idx]) {
                break; //obstacle found
            } else if(var_obstacles[idx] !== false) { //either true or index of power_up
                this.destroy_var_obstacle(var_obstacles, idx);
                break;
            }
            range++;
        }
        range > max_range ? up = -1 : up = range; //-1 --> bomb does not hit an obstacle

        //lower side
        max_range = Math.floor((y + explosion_range) / FIELD_SIZE) - bomb_i; //maximum number of affected fields
        range = 1; //actual number of affected fields (due to obstacles)
        while(range <= max_range) {
            let idx = GB_FIELDS * (bomb_i + range) + bomb_j; //index - to not calculate it three times
            if(FIXED_OBSTACLES[idx]) {
                break; //obstacle found
            } else if(var_obstacles[idx] !== false) { //either true or index of power_up
                this.destroy_var_obstacle(var_obstacles, idx);
                break;
            }
            range++;
        }
        range > max_range ? down = -1 : down = range; //-1 --> bomb does not hit an obstacle


        /************************ calculate explosion rectangles (horizontal/vertical rect) *******************/
        this.rects = [];

        // horizontal rect (left-top and right-bottom corners)
        
        let lt_y = y - BOMB_RADIUS;
        let lt_x;
        //bomb does not hit an obstacle or explosion range would not hit the following obstacle too
        if(left < 0 || (bomb_j - left) * FIELD_SIZE <= x - explosion_range) {
            lt_x = x - explosion_range;
        } else { //explosion range needs to be limited, so it does not hit the following obstacle too
            lt_x = (bomb_j - left) * FIELD_SIZE + 1;
        }

        let rb_y = lt_y + BOMB_RADIUS*2;
        let rb_x;
        //bomb does not hit an obstacle or explosion range would not hit the following obstacle too
        if(right < 0 || x + explosion_range <= (bomb_j + right + 1) * FIELD_SIZE) {
            rb_x = lt_x + explosion_range * 2;
        } else { //explosion range needs to be limited, so it does not hit the following obstacle too
            rb_x = (bomb_j + right + 1) * FIELD_SIZE - 1;
        }

        this.rects.push({
            lt_x: lt_x,
            lt_y: lt_y,
            rb_x: rb_x,
            rb_y: rb_y
        });

        // vertical rect

        lt_x = x - BOMB_RADIUS;
        lt_y;
        //bomb does not hit an obstacle or explosion range would not hit the following obstacle too
        if(up < 0 || (bomb_i - up) * FIELD_SIZE <= y - explosion_range) {
            lt_y = y - explosion_range;
        } else { //explosion range needs to be limited, so it does not hit the following obstacle too
            lt_y = (bomb_i - up) * FIELD_SIZE + 1;
        }

        rb_x = lt_x + BOMB_RADIUS*2;
        rb_y;
        //bomb does not hit an obstacle or explosion range would not hit the following obstacle too
        if(down < 0 || y + explosion_range <= (bomb_i + down + 1) * FIELD_SIZE) {
            rb_y = lt_y + explosion_range * 2;
        } else { //explosion range needs to be limited, so it does not hit the following obstacle too
            rb_y = (bomb_i + down + 1) * FIELD_SIZE - 1;
        }

        this.rects.push({
            lt_x: lt_x,
            lt_y: lt_y,
            rb_x: rb_x,
            rb_y: rb_y
        });
    }
    //helper method to either
    // - destroy var_obstacle and (maybe) replace it by a power up
    // - destroy power up
    destroy_var_obstacle(var_obstacles, idx) {
        //there is an obstacle
        if(var_obstacles[idx] === true) {
            //obstacle is destroyed - maybe replaced by power up
            if(Math.random() < POWER_UPS_PROBABILITY) {
                //index in POWER_UPS array
                var_obstacles[idx] = Math.floor(Math.random() * POWER_UPS_COUNT);
            } else {
                var_obstacles[idx] = false; //obstacle is destroyed
            }
        } else { //there is a power up
            //destroy power up
            var_obstacles[idx] = false;
        }
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
        this.gameResult = "-";
        this.isRunning = false;
        this.isReady = false;
        this.isPrivate = true;
    }
    //returns player-ID
    addPlayer() {
        let id = this.playerCount;
        this.playerCount++;
        
        return id;
    }
    //players position is corrected according to surrounding obstacles and borders of gameboard.
    //also collecting power ups is handled here
    validatePosition(player, x, y) {
        //outer boundaries
        if(x < 0) x = 0;
        else if(x > (GB_SIZE - PLAYER_SIZE)) x = GB_SIZE - PLAYER_SIZE;
        else if(y < 0) y = 0;
        else if(y > (GB_SIZE - PLAYER_SIZE)) y = GB_SIZE - PLAYER_SIZE;

        //obstacles
        else {
            let old_x = player.pos.x;
            let old_y = player.pos.y;

            //index of current position in obstacle-matrix (left-top, right-bottom corner)
            let lt_j = Math.floor(old_x / FIELD_SIZE);
            let lt_i = Math.floor(old_y / FIELD_SIZE);
            let rb_j = Math.floor((old_x + PLAYER_SIZE-1) / FIELD_SIZE);
            let rb_i = Math.floor((old_y + PLAYER_SIZE-1) / FIELD_SIZE);

            //for fixed and variable obstacles
            for(let obstacle of [FIXED_OBSTACLES, this.gameState.var_obstacles]) {
                //left side
                //calculate index of both corners on the left side
                let idx_1 = GB_FIELDS * lt_i + (lt_j-1);
                let idx_2 = GB_FIELDS * rb_i + (lt_j-1);
                //there is an obstacle/power up on the left side
                if((obstacle[idx_1] !== false|| //top left corner
                    obstacle[idx_2] !== false) && //bottom left corner
                                        x < lt_j * FIELD_SIZE) { //player touches left obstacle
                    if(obstacle[idx_1] === true || obstacle[idx_2] === true) { //player ran against obstacle
                        x = lt_j * FIELD_SIZE; //stop player
                        
                        //help player to avoid obstacle if the way is free at one of both corners
                        if(obstacle[idx_1] === true && obstacle[idx_2] === false) {
                            y++;
                        } else if(obstacle[idx_1] === false && obstacle[idx_2] === true) {
                            y--;
                        }
                    } else { //player ran against power up
                        if(obstacle[idx_1] !== false) {
                            POWER_UPS[obstacle[idx_1]].upgradePlayer(player); //player collects power up --> upgrade
                            obstacle[idx_1] = false; //delete power up
                        }
                        if(obstacle[idx_2] !== false) {
                            POWER_UPS[obstacle[idx_2]].upgradePlayer(player); //player collects power up --> upgrade
                            obstacle[idx_2] = false; //delete power up
                        }
                    }                   
                } 
                //upper side
                idx_1 = GB_FIELDS * (lt_i-1) + lt_j;
                idx_2 = GB_FIELDS * (lt_i-1) + rb_j;
                if ((obstacle[idx_1] !== false || //top left corner
                    obstacle[idx_2] !== false) && //top right corner
                                                    y < lt_i * FIELD_SIZE) { //player touches top obstacle
                    if(obstacle[idx_1] === true || obstacle[idx_2] === true) { //player ran against obstacle
                        y = lt_i * FIELD_SIZE; //stop player

                        //help player to avoid obstacle if the way is free at one of both corners
                        if(obstacle[idx_1] === true && obstacle[idx_2] === false) {
                            x++;
                        } else if(obstacle[idx_1] === false && obstacle[idx_2] === true) {
                            x--;
                        }
                    } else { //player ran against power up
                        if(obstacle[idx_1] !== false) {
                            POWER_UPS[obstacle[idx_1]].upgradePlayer(player); //player collects power up --> upgrade
                            obstacle[idx_1] = false; //delete power up
                        }
                        if(obstacle[idx_2] !== false) {
                            POWER_UPS[obstacle[idx_2]].upgradePlayer(player); //player collects power up --> upgrade
                            obstacle[idx_2] = false; //delete power up
                        }
                    }   
                }
                //right side
                idx_1 = GB_FIELDS * (lt_i) + (rb_j+1);
                idx_2 = GB_FIELDS * (rb_i) + (rb_j+1);
                if ((obstacle[idx_1] !== false || //top right corner
                    obstacle[idx_2] !== false) && //bottom right corner
                                    x+PLAYER_SIZE > (rb_j+1) * FIELD_SIZE) { //player touches right obstacle
                    if(obstacle[idx_1] === true || obstacle[idx_2] === true) { //player ran against obstacle
                        x = (rb_j+1) * FIELD_SIZE - PLAYER_SIZE; //stop player

                        //help player to avoid obstacle if the way is free at one of both corners
                        if(obstacle[idx_1] === true && obstacle[idx_2] === false) {
                            y++;
                        } else if(obstacle[idx_1] === false && obstacle[idx_2] === true) {
                            y--;
                        }
                    } else { //player ran against power up
                        if(obstacle[idx_1] !== false) {
                            POWER_UPS[obstacle[idx_1]].upgradePlayer(player); //player collects power up --> upgrade
                            obstacle[idx_1] = false; //delete power up
                        }
                        if(obstacle[idx_2] !== false) {
                            POWER_UPS[obstacle[idx_2]].upgradePlayer(player); //player collects power up --> upgrade
                            obstacle[idx_2] = false; //delete power up
                        }
                    }  
                }
                //lower side
                idx_1 = GB_FIELDS * (rb_i+1) + (lt_j);
                idx_2 = GB_FIELDS * (rb_i+1) + (rb_j);
                if ((obstacle[idx_1] !== false || //bottom left corner
                    obstacle[idx_2] !== false) && //bottom right corner
                                    y+PLAYER_SIZE > (rb_i+1) * FIELD_SIZE) { //player touches bottom obstacle
                    if(obstacle[idx_1] === true || obstacle[idx_2] === true) { //player ran against obstacle
                        y = (rb_i+1) * FIELD_SIZE - PLAYER_SIZE; //stop player

                        //help player to avoid obstacle if the way is free at one of both corners
                        if(obstacle[idx_1] === true && obstacle[idx_2] === false) {
                            x++;
                        } else if(obstacle[idx_1] === false && obstacle[idx_2] === true) {
                            x--;
                        }
                    } else { //player ran against power up
                        if(obstacle[idx_1] !== false) {
                            POWER_UPS[obstacle[idx_1]].upgradePlayer(player); //player collects power up --> upgrade
                            obstacle[idx_1] = false; //delete power up
                        }
                        if(obstacle[idx_2] !== false) {
                            POWER_UPS[obstacle[idx_2]].upgradePlayer(player); //player collects power up --> upgrade
                            obstacle[idx_2] = false; //delete power up
                        }
                    } 
                }
            }
        }
        return {x: x, y: y};
    }
    updatePlayerPosition(player) {
        let x_, y_;

        switch(player.direction) {
            case 0:     //left
                x_ = player.pos.x - player.moving_step;
                y_ = player.pos.y;
                break;
            case 1:     //up
                x_ = player.pos.x;
                y_ = player.pos.y - player.moving_step;
                break;
            case 2:     //right
                x_ = player.pos.x + player.moving_step;
                y_ = player.pos.y;
                break;
            case 3:     //down
                x_ = player.pos.x;
                y_ = player.pos.y + player.moving_step;
                break;
            default:    //not moving
                return;
        }

        player.pos = this.validatePosition(player, x_, y_);
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
        this.updatePlayerPosition(player1);
        this.updatePlayerPosition(player2);

        //update bomb-placing cooldown
        if(player1.bomb_curr_cooldown > 0) player1.bomb_curr_cooldown--;
        if(player2.bomb_curr_cooldown > 0) player2.bomb_curr_cooldown--;

        const bombs = this.gameState.bombs;
        
        bombs.forEach((bomb,idx) => {
            bomb.timer--;

            if(!bomb.detonated) { //bomb is alive
                if(bomb.timer <= 0) { //bomb detonates now
                    bomb.detonated = true;
                    bomb.timer = BOMB_DETONATION_TIME; //reset timer to detonation time
                    //calc explosion range and destroy variable obstacles within explosion
                    bombs[idx].explosion = new Explosion(bomb, this.gameState.var_obstacles); 
                }
            } else { //bomb is exploding currently
                //check if hitting a player
                let hitP1 = bomb.explosion.hits(player1);
                let hitP2 = bomb.explosion.hits(player2);

                if(hitP1 || hitP2) {
                    if(hitP1 && hitP2) {
                        this.gameResult = "tie";
                    } else if(hitP1) {
                        this.gameResult = "p2";
                    } else if(hitP2) {
                        this.gameResult = "p1";
                    }
                }

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
            if(player.bomb_curr_cooldown <= 0) { //player is able to place bomb
                player.bomb_curr_cooldown = player.bomb_max_cooldown; //set cooldown

                this.gameState.bombs.push({
                    x: player.pos.x + BOMB_MOVE_FACTOR,
                    y: player.pos.y + BOMB_MOVE_FACTOR,
                    detonation_width: player.bomb_detonation_width,
                    timer: BOMB_TIMER,
                    detonated: false
                });
            }
        }
    }
}