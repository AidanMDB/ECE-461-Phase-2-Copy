import { Metric } from "./Metric";
import { URLHandler } from '../utils/URLHandler';
//import { Logger } from '../logUtils';
import axios from 'axios';
import * as semver from 'semver';
import { secret } from '@aws-amplify/backend';


export class VersionPinning extends Metric {
    jsonKey: string = "VersionPinning";

    constructor(url: URLHandler) {
        super(url);
    }

    /**
     * @async @function calculateScore()
     * @return {Promise<void>}
     * @description: The fraction of dependencies that are pinned to at least a specific
                    major+minor version, e.g., version 2.3.X of the dependency. (If a package
                    has zero dependencies, it should receive a 1.0 rating. Now, suppose a
                    package has two dependencies, one that is constrained to a particular
                    major+minor version and another that is not. In this case, one of the two
                    dependencies satisfies the requisite level of pinning, and so the fraction
                    of dependencies is 1 in 2 or a score of ½ = 0.5.) 
                    npm supports more sophisticated notation for describing dependency versions. 
                    Please account for the effect of tilde and carat: https://github.com/npm/node-semver.
     */

    async calculateScore(): Promise<void> {
        //start timer 
        this.startTimer();
        
        //stats/contributors endpoint 
        let ep = this.url.getBaseAPI() + "/contents/package.json";

        let totalDeps: number = 0;
        let pinnedDeps: number = 0;

        try{
            //make api call to ep to return container of objects.
            const response = await axios.get(ep, {headers: {'Authorization': `token ${secret('GITHUB_TOKEN')}`}}); 
            
            const decodedContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
            const packageJson = JSON.parse(decodedContent);

            if (!packageJson.dependencies) {
                // No dependencies found, set score to 1.0
                this.score = 1.0;
                this.endTimer();
                return;
            }
            
            // console.log(typeof(response)); 
            const dependencies = packageJson.dependencies;
            //const data = response.data.dependencies;
            for (const dep in dependencies) {
                totalDeps++;
                const version = dependencies[dep];

                // Check if the version is pinned to a specific major+minor version
                const parsedVersion = semver.parse(version);
                //if (parsedVersion && parsedVersion.major !== null && parsedVersion.minor !== null) {
                if (parsedVersion && !version.includes('^') && !version.includes('~')) {

                    pinnedDeps++;
                }
            }

            //this.score = pinnedDeps / totalDeps;
            this.score = totalDeps > 0 ? pinnedDeps / totalDeps : 1.0;
            this.endTimer();
            return;

        } catch (error) {
            //Logger.logDebug("Version Pinning: Error fetching Version Pinning data from repository \n" + error);
            this.score = -1;
            this.endTimer();
            return;
        }
    }
}