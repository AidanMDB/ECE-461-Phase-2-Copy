import { URLHandler } from '../utils/URLHandler';
import { BusFactor } from './BusFactor';
import { Correctness } from './Correctness';
import { RampUp } from './RampUp';
import { ResponsiveMetric } from './ResponsiveMetric';
import { License } from './License';

export class NetScore{
    jsonKey: string = "NetScore";
    latency: number;
    score: number;
    start: number;

    constructor() {
        this.latency = 0;
        this.score = 0;
        this.start = 0;
    }

    public startTimer(): void {
        this.start = Date.now();
    }

    public endTimer(): void {
        this.latency = Date.now() - this.start;
    }
    
    public calculateScore(busFactor: BusFactor, correctness: Correctness, license: License, rampUp: RampUp, respMet: ResponsiveMetric): number {
        const busWeight = 0.2;
        const correctnessWeight = 0.2;
        const licenseWeight = 0.2;
        const rampUpWeight = 0.2;
        const respMetWeight = 0.2;

        this.score = busFactor.getScore() * busWeight + correctness.getScore() * correctnessWeight + license.getScore() * licenseWeight + rampUp.getScore() * rampUpWeight + respMet.getScore() * respMetWeight;
        return this.score;
    }

    private getJsonLatencyKey(): string {
        return `${this.jsonKey}_Latency`;
    }

    getJsonObject(): Object {
        return {
            [this.jsonKey]: this.score,
            [this.getJsonLatencyKey()] : this.latency
        }
    }
}