import { Metric } from "./Metric";
import { NetScore } from '../metrics/NetScore';

function roundToTwoDecimals(num: number): number {
    return Math.round(num * 100) / 100;
}

function roundNumbersInObject(obj: any): any {
    for (const key in obj) {
        if (typeof obj[key] === 'number' && key.endsWith('_Latency')) {
            obj[key] = parseFloat(obj[key].toFixed(3));   
        } else if (typeof obj[key] === 'number') {
            obj[key] = roundToTwoDecimals(obj[key]);
        }
        else if (typeof obj[key] === 'object' && obj[key] !== null) {
            obj[key] = roundNumbersInObject(obj[key]);
        }
    }
    return obj;
}

export function createNDJsonResult(netScore: NetScore, metrics: Metric[]) : string {
    let result = { URL: metrics[0].getURLHandler().getURL()};
    Object.assign(result, netScore.getJsonObject());

    metrics.forEach(metric => {
        Object.assign(result, metric.getJsonObject());
    });

    result = roundNumbersInObject(result);
    return JSON.stringify(result);
}