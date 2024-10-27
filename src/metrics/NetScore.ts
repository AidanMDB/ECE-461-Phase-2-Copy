import { URLHandler } from '../utils/URLHandler';
import { BusFactor } from './BusFactor';
import { Correctness } from './Correctness';
import { RampUp } from './RampUp';
import { ResponsiveMetric } from './ResponsiveMetric';
import { LicenseMetric } from './License';
import { VersionPinning } from './VersionPinning';
import { EngineeringProcess } from './EngineeringProcess';

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
        this.latency =  parseFloat(((Date.now() - this.start) / 1000).toFixed(3));
    }
    
    public calculateScore(busFactor: BusFactor, correctness: Correctness, license: LicenseMetric, rampUp: RampUp, respMet: ResponsiveMetric, engProc: EngineeringProcess, versionPin:VersionPinning): number {
        const busWeight = 0.30; // Highest priority
        const correctnessWeight = 0.15;
        const rampUpWeight = 0.15;
        const respMetWeight = 0.30;
        const engProcWeight = 0.05; 
        const versionPinningWeight = 0.05; // Lowest priority

        let totalWeight = 0;
        // -1 is an edge case where the score is not calculated
        if (busFactor.getScore() !== -1) {
            this.score += busFactor.getScore() * busWeight;
            totalWeight += busWeight;
        }
        if (correctness.getScore() !== -1) {
            this.score += correctness.getScore() * correctnessWeight;
            totalWeight += correctnessWeight;
        }
        if (rampUp.getScore() !== -1) {
            this.score += rampUp.getScore() * rampUpWeight;
            totalWeight += rampUpWeight;
        }
        if (respMet.getScore() !== -1) {
            this.score += respMet.getScore() * respMetWeight;
            totalWeight += respMetWeight;
        }
        if (versionPin.getScore() !== -1) {
            this.score += versionPin.getScore() * versionPinningWeight;
            totalWeight += versionPinningWeight;
        }
        if (license.getScore() !== -1) {
            this.score *= license.getScore();
        }

        if (engProc.getScore() !== -1) {
            this.score += engProc.getScore() * engProcWeight;
            totalWeight += engProcWeight;
        }

        if (totalWeight > 0) {
            this.score /= totalWeight;
        } else {
            this.score = -1; // Handle case where all scores are -1
        }
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