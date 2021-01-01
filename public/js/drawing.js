import {PLAYER_SIZE, BOMB_RADIUS, GB_FIELDS, FIELD_SIZE, GB_SIZE, POWER_UPS} from '/js/constants.js';
export function getScreenFactor() {
    return window.innerHeight * 0.7 / GB_SIZE;
}
/**
 * Resized drawing function for canvas
 */
function r_rect(ctx, x, y, width, height, resizeFactor) {
    ctx.rect(x * resizeFactor, y * resizeFactor, width * resizeFactor, height * resizeFactor);
}
export function r_clearRect(ctx, width, height, resizeFactor) {
    ctx.clearRect(0, 0, width * resizeFactor, height * resizeFactor);
}
//center.x center.y radius, start angle, end angle
function r_arc(ctx, x, y, r, resizeFactor) {
    ctx.arc(x * resizeFactor, y * resizeFactor, r * resizeFactor, 0, 2 * Math.PI);
}

export function renderPlayers(ctx, players, resizeFactor) {
    players.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        r_rect(ctx, p.pos.x, p.pos.y, PLAYER_SIZE, PLAYER_SIZE, resizeFactor);
        ctx.closePath();
        ctx.fill();
    });
}

export function renderBombs(ctx, bombs, resizeFactor) {
    bombs.forEach(b => {
        if(!b.detonated) { //draw bomb
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            r_arc(ctx, b.x, b.y, BOMB_RADIUS, resizeFactor);
            ctx.closePath();
            ctx.fill();
        } else { //draw explosion
            ctx.fillStyle = "#ffa421";
            ctx.beginPath();

            b.explosion.rects.forEach(rect => {
                r_rect(ctx, rect.lt_x, rect.lt_y, rect.rb_x - rect.lt_x, rect.rb_y - rect.lt_y, resizeFactor);
            })

            ctx.closePath();
            ctx.fill();
        }
    });
}

function renderObstacle(ctx, i, j, color, resizeFactor) {
    ctx.fillStyle = color;
    ctx.beginPath();
    r_rect(ctx, j * FIELD_SIZE, i * FIELD_SIZE, FIELD_SIZE, FIELD_SIZE, resizeFactor);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#654321";
    ctx.stroke();
}

function renderPowerup(ctx, i, j, powerup, resizeFactor) {
    switch (powerup) {
        case 'Speed':
            ctx.fillStyle = "#ff0000";
            break;
        case 'BombPlacingSpeed':
            ctx.fillStyle = "#000000";
            break;
        case 'ExplosionRange':
            ctx.fillStyle = "#ffa500";
        default:
            break;
    }

    ctx.beginPath();
    r_rect(ctx, j * FIELD_SIZE, i * FIELD_SIZE, FIELD_SIZE, FIELD_SIZE, resizeFactor);
    ctx.closePath();
    ctx.fill();
}

//in var_obstacles also the power ups are safed
export function renderObstacles(ctx, obstacles, color, resizeFactor) {
    for(let i = 0; i < GB_FIELDS; i++) {
        for(let j = 0; j < GB_FIELDS; j++) {
            //either false, true or the name of a power up
            if(obstacles[GB_FIELDS * i + j] !== false) {
                if(obstacles[GB_FIELDS * i + j] === true) { //obstacle
                    renderObstacle(ctx, i, j, color, resizeFactor);
                } else { //power up
                    let powerup_idx = obstacles[GB_FIELDS * i + j];
                    POWER_UPS[powerup_idx].render(ctx, i, j, resizeFactor);
                    //renderPowerup(ctx, i, j, powerup, resizeFactor);
                }
            }
        }
    }
}
