import { URLHandler } from '../utils/URLHandler';
// Metric Class
// has score variable, getScore, calculateScore, and url
// Abstract Class
export abstract class Metric {
    score: number;
    url: URLHandler;
    latency: number;
    start: number;
    abstract jsonKey: string;

    constructor(url: URLHandler) {
        this.score = -1;
        this.url = url;
        this.latency = -1;
        this.start = -1;
    }

    abstract calculateScore(): Promise<void>; 

    getScore(): number {
        return this.score;
    }

    public getURLHandler(): URLHandler {
        return this.url;
    }

    public getJsonObject(): Object {
        return {
            [this.jsonKey]: this.score,
            [this.getJSONLatencyKey()]: this.latency
        }
    }

    private getJSONLatencyKey(): string {
        return `${this.jsonKey}_Latency`;
    }

    public startTimer(): void {
        this.start = Date.now();
    }

    public endTimer(): void {
        this.latency = parseFloat(((Date.now() - this.start) / 1000).toFixed(3));
    }

}
