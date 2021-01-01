//Constants used by both client and server
export const GB_SIZE = 400; //gameboard size
export const GB_FIELDS = 11; //fields within GB_SIZE
export const FIELD_SIZE = GB_SIZE / GB_FIELDS; //size of one field
export const PLAYER_SIZE = GB_SIZE/15;
export const INIT_MOVING_STEP = GB_SIZE/80;
export const BOMB_RADIUS = PLAYER_SIZE/3;

export const POWER_UPS_COUNT = 3;
export const POWER_UPS_PROBABILITY = 0.2;
export const POWER_UPS = [];

export const FIXED_OBSTACLES = [];

for(let i = 0; i < GB_FIELDS; i++) {
    for(let j = 0; j < GB_FIELDS; j++) {
        if((i % 2 != 0) && (j % 2 != 0)) {
            FIXED_OBSTACLES[GB_FIELDS * i + j] = true;
        } else {
            FIXED_OBSTACLES[GB_FIELDS * i + j] = false;
        }
    }
}

/* power ups */
export class Speed{
    render(ctx, i, j, resizeFactor) {
        let resized_field = FIELD_SIZE * resizeFactor;
        // red circle
        ctx.strokeStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(j * resized_field + resized_field/2, i * resized_field + resized_field / 2, // x,y
                resized_field / 2, 0, 2 * Math.PI); //r, a, a
        ctx.closePath();
        ctx.stroke();
        // rect
        ctx.fillStyle = "#FFFFE0";
        ctx.beginPath();
        ctx.rect(j * resized_field + resized_field/4, i * resized_field + resized_field/3, 
                 resized_field / 2, resized_field / 3);
        ctx.closePath();
        ctx.fill();
        //line in the middle
        ctx.strokeStyle = "#654321";
        ctx.beginPath();
        ctx.moveTo(j * resized_field + resized_field/2, i * resized_field + resized_field/3);
        ctx.lineTo(j * resized_field + resized_field/2, i * resized_field + resized_field * 2/3);
        ctx.closePath();
        ctx.stroke();
    }
    upgradePlayer(player) {
        //raised speed of player
        player.moving_step += INIT_MOVING_STEP/5;
    }
}

export class BombPlacingSpeed {
    render(ctx, i, j, resizeFactor) {
        let resized_field = FIELD_SIZE * resizeFactor;
        // red circle
        ctx.strokeStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(j * resized_field + resized_field/2, i * resized_field + resized_field / 2, // x,y
                resized_field / 2, 0, 2 * Math.PI); //r, a, a
        ctx.closePath();
        ctx.stroke();

        // mini bomb
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(j * resized_field + resized_field/2, i * resized_field + resized_field / 2, // x,y
                    resized_field / 6, 0, 2 * Math.PI); //r, a, a
        ctx.closePath();
        ctx.fill();
    }
    upgradePlayer(player) {
        player.bomb_max_cooldown /= 2;
    }
}

export class ExplosionRange {
    render(ctx, i, j, resizeFactor) {
        let resized_field = FIELD_SIZE * resizeFactor;
        // red circle
        ctx.strokeStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(j * resized_field + resized_field/2, i * resized_field + resized_field / 2, // x,y
                resized_field / 2, 0, 2 * Math.PI); //r, a, a
        ctx.closePath();
        ctx.stroke();

        // mini explosion
        ctx.fillStyle = "#ffa421";
        ctx.beginPath();
        ctx.rect(j * resized_field + resized_field/5, i * resized_field + resized_field/3, 
                 resized_field *3/5, resized_field / 3);
        ctx.rect(j * resized_field + resized_field/3, i * resized_field + resized_field/4, 
                 resized_field / 3, resized_field * 3/5);
        ctx.closePath();
        ctx.fill();
    }
    upgradePlayer(player) {
        player.bomb_detonation_width *= 1.2;
    }
}

POWER_UPS.push(new Speed());
POWER_UPS.push(new BombPlacingSpeed());
POWER_UPS.push(new ExplosionRange());

