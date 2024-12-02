//import { URLFileHandler } from '../utils/URLFileHandler';
import { URLHandler } from './utils/URLHandler';
import { BusFactor } from './metrics/BusFactor';
import { Correctness } from './metrics/Correctness';
import { RampUp } from './metrics/RampUp';
import { LicenseMetric } from './metrics/License';
import { ResponsiveMetric } from './metrics/ResponsiveMetric';
import { NetScore } from './metrics/NetScore';
import { createNDJsonResult } from './metrics/resultsHelper';
import { VersionPinning } from './metrics/VersionPinning';
import { EngineeringProcess } from './metrics/EngineeringProcess';

export async function calcMetrics(URL:string) {

    const url = new URLHandler(URL);
    
    const netScore = new NetScore()
    const busFactor = new BusFactor(url);
    const corScore = new Correctness(url);
    const rampUp = new RampUp(url);
    const licScore = new LicenseMetric(url);
    const respMet = new ResponsiveMetric(url);
    const versionPinning = new VersionPinning(url);
    const engProc = new EngineeringProcess(url);
    
    // Calculate metrics
    netScore.startTimer();
    await Promise.allSettled([
                              busFactor.calculateScore(), 
                              corScore.calculateScore(), 
                              rampUp.calculateScore(), 
                              licScore.calculateScore(), 
                              respMet.calculateScore(),
                              engProc.calculateScore(),
                              versionPinning.calculateScore()
                            ]);
    
    netScore.calculateScore(busFactor, corScore, licScore, rampUp,  respMet, engProc, versionPinning);
    netScore.endTimer();
    
    const ndjsonResult = createNDJsonResult(netScore, [rampUp, corScore, busFactor, respMet, licScore, engProc, versionPinning]);
    return ndjsonResult;
}
