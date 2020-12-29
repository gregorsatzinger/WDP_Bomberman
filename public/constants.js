//Constants used by both client and server
export const GB_SIZE = 400; //gameboard size
export const GB_FIELDS = 11; //fields within GB_SIZE
export const FIELD_SIZE = GB_SIZE / GB_FIELDS; //size of one field
export const PLAYER_SIZE = GB_SIZE/13;
export const BOMB_RADIUS = PLAYER_SIZE/3;

//TODO: probably not needed in client anymore when Explosion-class is implemented
export const BOMB_DETONATION_WIDTH = GB_SIZE/10*3;

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