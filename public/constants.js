//Constants used by both client and server
export const GB_SIZE = 400; //gameboard size
export const PLAYER_SIZE = GB_SIZE/10;
export const BOMB_RADIUS = PLAYER_SIZE/3;

//TODO: probably not needed in client anymore when Explosion-class is implemented
export const BOMB_DETONATION_WIDTH = GB_SIZE/10*3;