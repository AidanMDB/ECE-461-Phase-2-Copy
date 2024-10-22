import {Logger} from '../logUtils';
import { URLFileHandler } from '../utils/URLFileHandler';
import { BusFactor } from '../metrics/BusFactor';
import { Correctness } from '../metrics/Correctness';
import { RampUp } from '../metrics/RampUp';
import { LicenseMetric } from '../metrics/License';
import { ResponsiveMetric } from '../metrics/ResponsiveMetric';
import { NetScore } from '../metrics/NetScore';
import { createNDJsonResult } from '../metrics/resultsHelper';

/**
 * Function to process a file containing URLs to Github repositories and output the metrics
 * @param argument - the file containing the URLs
 * @throws {Error} if the file is invalid or the URLs are invalid
 */
export async function urlCommand (argument:string) {  
    
    const urls = await URLFileHandler.getGithubUrlsFromFile(argument);
    if (urls === null) {
      Logger.logInfo('Error reading file or file has invalid URLs');
      throw new Error('Error reading file or file has invalid URLs');
    }

    try {
      for (const url of urls) {
        // Setup metrics
        Logger.logInfo(`Processing URL: ${url.getRepoURL()}`);
        const netScore = new NetScore()
        const busFactor = new BusFactor(url);
        const corScore = new Correctness(url);
        const rampUp = new RampUp(url);
        const licScore = new LicenseMetric(url);
        const respMet = new ResponsiveMetric(url);
  
        // Calculate metrics
        netScore.startTimer();
        await Promise.allSettled([busFactor.calculateScore(), corScore.calculateScore(), rampUp.calculateScore(), licScore.calculateScore(), respMet.calculateScore()]);
  
        netScore.calculateScore(busFactor, corScore, licScore, rampUp,  respMet);
        netScore.endTimer();
  
        const ndjsonResult = createNDJsonResult(netScore, [rampUp, corScore, busFactor, respMet, licScore]);
        
        // Final Output
        console.log(ndjsonResult);
      }

    } catch (error:any) {
      Logger.logInfo('Error calculating Metrics');
      Logger.logDebug(error);
      throw error
    }
    
} 