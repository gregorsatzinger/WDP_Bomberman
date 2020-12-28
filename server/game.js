//const { getRandomColor } = require('./utils');
import { GB_SIZE, PLAYER_SIZE } from '../public/constants.js';
import {getRandomColor} from './utils.js';

/*module.exports = {
    initalGameState
}*/

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