import Engine from '../../core/engine.js';
import { BANNER } from '../banner.js';

export const analyzeCommand = async (url) => {
    console.log(BANNER);
    const fcopier = new Engine(url);
    await fcopier.analyze(url);
};
