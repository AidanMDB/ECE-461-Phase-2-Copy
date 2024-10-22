import {Metric} from './Metric';
import { URLHandler } from '../utils/URLHandler';
import axios from 'axios';
import { Logger } from '../logUtils';
import { DatabaseSync } from 'node:sqlite';
import { Console } from 'node:console';


export class BusFactor extends Metric {
    jsonKey: string = "BusFactor";

    constructor(url: URLHandler) {
        super(url);
    }

    /**
     * @async @function calculateScore()
     * @return {Promise<void>}
     * @description: thie function calculates the bus factor on a github repository as part of the final metrics evaluation. 
     *               the endpoint /stats/contributors is used to gather lines by largest contributor, total lines changed, 
     *               number of commits by largest contributor, and total commits. 
     */
    async calculateScore(): Promise<void> {

        //start timer 
        this.startTimer();
        
        //stats/contributors endpoint 
        let ep = this.url.getBaseAPI() + "/stats/contributors";
    
        
        //metrics values need (explicitly typed or else will be interpreted as boolean)
        //hc stands for 'highest contributor', defined as individual with most commits, not necessarily most lines
        let total_commits: number = 0; 
        let hc_commits = 0; 
        let total_lines = 0; 
        let hc_lines = 0;

        let author:string = " "
        try{
            //make api call to ep to return container of objects.
            const response = await axios.get(ep, {headers: {'Authorization': `token ${process.env.GITHUB_TOKEN}`}}); 
            
            if(!response || !response.data || !response.data.length){
                // console.log('data is null');
                this.score = 0; 
                return;
            }
            
            // console.log(typeof(response)); 
            
            //iterate through each contributor data
            const data = response.data; 
            data.forEach((contributor : any) =>{
                
                //add to total commits
                total_commits += contributor.total; 

                //get highest contributor (change if needed)
                if(contributor.total > hc_commits){
                    hc_commits = contributor.total; 
                    author = contributor.author.login; //record this to determine whether to change hc_lines
                    hc_lines = 0; //reset highest contributor lines to be overwritten below
                }

                //get total lines
                let individual_contribution = 0;
                contributor.weeks.forEach((week : any) => {
                    individual_contribution += week.a + week.d; 
                });

                total_lines += individual_contribution;

                
                if ((author == contributor.author.login) || (author == ' ' && individual_contribution > hc_lines)){
                    hc_lines = individual_contribution;
                }
            }); 

        }catch(Error){ 
            Logger.logDebug("Bus Factor: Error fetching bus factor data from repository\n" + Error);
            this.score = -1; 
            this.endTimer(); 
            return;
        }

        // console.log(`\nlargest contributor:${author}\nlines altered: ${hc_lines}/${total_lines}\ncommits:${hc_commits}/${total_commits}`);

        //there are certain github repo settings that omit data
        if(!total_lines && total_commits){
            // console.log('proceed with caution, total changed lines unable to be retrieved by api'); 
            this.score = 1 - 0.5 * (hc_commits / total_commits); //omit calculation that would make it null 
        }
        else if (!total_commits){
            // console.log('proceed with caution, total commits unable to be retrieved by api')
            this.score = 1 - 0.5 * (hc_lines / total_lines);
        }
        else{
            this.score = 1 - 0.5 * (hc_lines / total_lines) - 0.5 * (hc_commits / total_commits);
        }
        

        //one is the maximum value 
        this.score = this.score > 1 ? 1 : this.score; 
    
        // End timer for latency
        this.endTimer();
    }
}