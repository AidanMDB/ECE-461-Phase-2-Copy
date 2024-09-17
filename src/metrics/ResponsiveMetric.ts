import {Metric} from './Metric';
import { URLHandler } from '../utils/URLHandler';

export class ResponsiveMetric extends Metric {
    jsonKey: string = "ResponsiveMaintainer";

    constructor(url: URLHandler) {
        super(url);
    }
    calculateScore(): void {
        this.score = Math.random()*10;
    }
}