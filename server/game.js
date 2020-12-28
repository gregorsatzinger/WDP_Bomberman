//const { getRandomColor } = require('./utils');
import {getRandomColor} from './utils.js';

/*module.exports = {
    initalGameState
}*/

export function initalGameState() {
    return {
        players: [
        {
            pos: {
                x: 100,
                y: 100,
            },
            color: getRandomColor(),
            direction: 4,
            name: "P1"
        }, 
        {
            pos: {
            x: 300,
            y: 300,
            },
            color: getRandomColor(),
            direction: 4,
            name: "P2"
            }
        ],
        bombs: [],
    };
}