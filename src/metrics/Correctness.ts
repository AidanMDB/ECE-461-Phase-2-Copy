import {Metric} from './Metric';
import { URLHandler } from '../urlUtils/URLHandler';

export class Correctness extends Metric {
    jsonKey: string = "Correctness";

    constructor(url: URLHandler) {
        super(url);
    }
    calculateScore(): void {
        this.score = Math.random()*10;
    }
}