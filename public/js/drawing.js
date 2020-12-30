import {PLAYER_SIZE, BOMB_RADIUS, BOMB_DETONATION_WIDTH, GB_FIELDS, FIELD_SIZE} from '/constants.js';
/**
 * Resized drawing function for canvas
 */
export function r_rect(ctx, x, y, width, height, resizeFactor) {
    ctx.rect(x / resizeFactor, y / resizeFactor, width / resizeFactor, height / resizeFactor);
}
export function r_clearRect(ctx, width, height, resizeFactor) {
    ctx.clearRect(0, 0, width / resizeFactor, height / resizeFactor);
}
//center.x center.y radius, start angle, end angle
export function r_arc(ctx, x, y, r, resizeFactor) {
    ctx.arc(x / resizeFactor, y / resizeFactor, r / resizeFactor, 0, 2 * Math.PI);
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
            r_arc(ctx, b.x, b.y, b.radius, resizeFactor);
            ctx.closePath();
            ctx.fill();
        } else { //draw explosion
            ctx.fillStyle = "#ffa421";
            ctx.beginPath();

            //TODO: use bomb.Explosion object for boundaries of rects.
            // --> calculating only once (on server side)
            // --> boundaries depend on surrounding obstacles

            //horizontal rect
            r_rect(ctx, b.x - BOMB_DETONATION_WIDTH/2, b.y - b.radius, BOMB_DETONATION_WIDTH, b.radius*2, resizeFactor);
            //vertical rect
            r_rect(ctx, b.x - b.radius, b.y - BOMB_DETONATION_WIDTH/2, b.radius*2, BOMB_DETONATION_WIDTH, resizeFactor);

            ctx.closePath();
            ctx.fill();
        }
    });
}

export function renderObstacles(ctx, obstacles, resizeFactor) {
    ctx.fillStyle = "#A8A8A8";
    ctx.beginPath();
    for(let i = 0; i < GB_FIELDS; i++) {
        for(let j = 0; j < GB_FIELDS; j++) {
            if(obstacles[GB_FIELDS * i + j]) {
                r_rect(ctx, j * FIELD_SIZE, i * FIELD_SIZE, FIELD_SIZE, FIELD_SIZE, resizeFactor);
            }
        }
    }
    ctx.closePath();
    ctx.fill(); 
}