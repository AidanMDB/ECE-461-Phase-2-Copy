import axios from 'axios';
import { RampUp } from '../../src/metrics/RampUp';
import { URLHandler } from '../../src/utils/URLHandler';
import { BusFactor } from '../../src/metrics/BusFactor';
import { buffer } from 'stream/consumers';
import { Logger } from '../../src/logUtils';
import { dot } from 'node:test/reporters';

jest.mock('axios'); //fake api calls, not to actual endpoitns 
jest.mock('../../src/utils/URLHandler'); //with fake urls 


//wrapper for entire set of tests
describe('api endpoint', () => {
    const repo = 'https://github.com/user/repo'; 
    let bf: BusFactor; //"global" declaration outside beforeEach 

    beforeEach(() => {
        //get a fake url
        (URLHandler.prototype.getRepoURL as jest.Mock).mockReturnValue('https://github.com/user/repo');

        //create fake instance of bf that can be used independently within each test case
        let url = new URLHandler(repo);
        bf = new BusFactor(url);
    });

    it('should return 0 if endpoint returns null', async() => {
        (axios.get as jest.Mock).mockResolvedValueOnce(null); 
        
        //activate spying before you run the program duh
        const spy = jest.spyOn(console, 'log');

        await bf.calculateScore(); 

        //spy to see if null message is created
        // expect(spy).toHaveBeenLastCalledWith('data is null')
    
        expect(bf.getScore()).toBe(0); 

        //ignore the typeerror because jest continues to run code despite return statements!!! as long as not expect its ok
    });

    it('should return -1 when endpoint is returned, but empty', async() => {

        (axios.get as jest.Mock).mockResolvedValueOnce({data:[]}); 

        const spy = jest.spyOn(console, 'log'); 

        //set up mock for axios.get, returns a promise (resolved value once) to an empty arr when called anywhere! obj attributes are included.
        await bf.calculateScore(); 

        // expect(spy).toHaveBeenLastCalledWith('data is null');
        
        expect(bf.getScore()).toBe(0); 
    });

    it('should catch error', async()=>{

        const response = "Bus Factor: Error fetching bus factor data from repository\n";
        (axios.get as jest.Mock).mockRejectedValueOnce(new Error()); 

        const spy = jest.spyOn(Logger, 'logDebug').mockImplementation(() => {});

        // Call the function that should handle the axios error
        await bf.calculateScore();

        // Check if console.error was called with an Error object
        // expect(spy).toHaveBeenCalledWith(response + 'Error');

        // Check if the error message matches
        // expect(spy).toHaveBeenCalledWith(expect.objectContaining({ message: response }));

        // Verify that the score was set to -1 as per your logic
        expect(bf.getScore()).toBe(-1);

    })
});

describe('vary contributor amounts', () =>{
    const repo = 'https://github.com/user/repo'; 
    let bf: BusFactor; //"global" declaration outside beforeEach 

    beforeEach(() => {
        //get a fake url
        jest.clearAllMocks();
        (URLHandler.prototype.getRepoURL as jest.Mock).mockReturnValue('https://github.com/user/repo');

        //create fake instance of bf that can be used independently within each test case
        let url = new URLHandler(repo);
        bf = new BusFactor(url);
    });

    test('run with one contributor', async() =>{
        const response = {data:[
                {
                "author": {
                    "login": "octocat",
                    "id": 1,
                    "node_id": "MDQ6VXNlcjE=",
                    "avatar_url": "https://github.com/images/error/octocat_happy.gif",
                    "gravatar_id": "",
                    "url": "https://api.github.com/users/octocat",
                    "html_url": "https://github.com/octocat",
                    "followers_url": "https://api.github.com/users/octocat/followers",
                    "following_url": "https://api.github.com/users/octocat/following{/other_user}",
                    "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
                    "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
                    "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
                    "organizations_url": "https://api.github.com/users/octocat/orgs",
                    "repos_url": "https://api.github.com/users/octocat/repos",
                    "events_url": "https://api.github.com/users/octocat/events{/privacy}",
                    "received_events_url": "https://api.github.com/users/octocat/received_events",
                    "type": "User",
                    "site_admin": false
                },
                "total": 135,
                "weeks": [
                    {
                    "w": 1367712000,
                    "a": 6898,
                    "d": 77,
                    "c": 10
                    }
                ]
                }
            ]};

        (axios.get as jest.Mock).mockResolvedValueOnce(response); 
        const spy = jest.spyOn(console, 'log'); 
        
        await bf.calculateScore(); 

        // expect(spy).not.toHaveBeenCalledWith('data is null');
        //only if it is null that
        expect(bf.getScore()).toBe(0);
    });


});


describe('divide by zero', ()=> {
    const repo = 'https://github.com/user/repo'; 
    let bf: BusFactor; //"global" declaration outside beforeEach 

    beforeEach(() => {
        //get a fake url
        (URLHandler.prototype.getRepoURL as jest.Mock).mockReturnValue('https://github.com/user/repo');

        //create fake instance of bf that can be used independently within each test case
        let url = new URLHandler(repo);
        bf = new BusFactor(url);
    });

    //inspired by react having no lines
    test('commit history exists, line change history dne', async() => {
        const response = {data: [
            {
              "author": {
                "login": "user1",
                "id": 1,
                "node_id": "MDQ6VXNlcjE=",
                "avatar_url": "https://github.com/images/error/octocat_happy.gif",
                "gravatar_id": "",
                "url": "https://api.github.com/users/octocat",
                "html_url": "https://github.com/octocat",
                "followers_url": "https://api.github.com/users/octocat/followers",
                "following_url": "https://api.github.com/users/octocat/following{/other_user}",
                "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
                "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
                "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
                "organizations_url": "https://api.github.com/users/octocat/orgs",
                "repos_url": "https://api.github.com/users/octocat/repos",
                "events_url": "https://api.github.com/users/octocat/events{/privacy}",
                "received_events_url": "https://api.github.com/users/octocat/received_events",
                "type": "User",
                "site_admin": false
              },
              "total": 5,
              "weeks": [
                {
                  "w": 1367712000,
                  "a": 0,
                  "d": 0,
                  "c": 5
                }
              ]
            },
            {
              "author": {
                "login": "user2",
                "id": 2,
                "node_id": "MDQ6VXNlcjI=",
                "avatar_url": "https://github.com/images/error/anotherUser_happy.gif",
                "gravatar_id": "",
                "url": "https://api.github.com/users/anotherUser",
                "html_url": "https://github.com/anotherUser",
                "followers_url": "https://api.github.com/users/anotherUser/followers",
                "following_url": "https://api.github.com/users/anotherUser/following{/other_user}",
                "gists_url": "https://api.github.com/users/anotherUser/gists{/gist_id}",
                "starred_url": "https://api.github.com/users/anotherUser/starred{/owner}{/repo}",
                "subscriptions_url": "https://api.github.com/users/anotherUser/subscriptions",
                "organizations_url": "https://api.github.com/users/anotherUser/orgs",
                "repos_url": "https://api.github.com/users/anotherUser/repos",
                "events_url": "https://api.github.com/users/anotherUser/events{/privacy}",
                "received_events_url": "https://api.github.com/users/anotherUser/received_events",
                "type": "User",
                "site_admin": false
              },
              "total": 3,
              "weeks": [
                {
                  "w": 1367712000,
                  "a": 0,
                  "d": 0,
                  "c": 3
                }
              ]
            }
          ]};

        (axios.get as jest.Mock).mockResolvedValueOnce(response); 
        const spy = jest.spyOn(console, 'log'); 
        
        await bf.calculateScore(); 

        // expect(spy).not.toHaveBeenCalledWith('data is null');
        // expect(spy).toHaveBeenLastCalledWith('proceed with caution, total changed lines unable to be retrieved by api');
        
        expect(bf.getScore()).toBe(0.6875); 
    });

    test('commit history exists, line change history dne', async() => {
        const response = {data: [
            {
              "author": {
                "login": "user1",
                "id": 1,
                "node_id": "MDQ6VXNlcjE=",
                "avatar_url": "https://github.com/images/error/octocat_happy.gif",
                "gravatar_id": "",
                "url": "https://api.github.com/users/octocat",
                "html_url": "https://github.com/octocat",
                "followers_url": "https://api.github.com/users/octocat/followers",
                "following_url": "https://api.github.com/users/octocat/following{/other_user}",
                "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
                "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
                "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
                "organizations_url": "https://api.github.com/users/octocat/orgs",
                "repos_url": "https://api.github.com/users/octocat/repos",
                "events_url": "https://api.github.com/users/octocat/events{/privacy}",
                "received_events_url": "https://api.github.com/users/octocat/received_events",
                "type": "User",
                "site_admin": false
              },
              "total": 0,
              "weeks": [
                {
                  "w": 1367712000,
                  "a": 200,
                  "d": 100,
                  "c": 0
                }
              ]
            },
            {
              "author": {
                "login": "user2",
                "id": 2,
                "node_id": "MDQ6VXNlcjI=",
                "avatar_url": "https://github.com/images/error/anotherUser_happy.gif",
                "gravatar_id": "",
                "url": "https://api.github.com/users/anotherUser",
                "html_url": "https://github.com/anotherUser",
                "followers_url": "https://api.github.com/users/anotherUser/followers",
                "following_url": "https://api.github.com/users/anotherUser/following{/other_user}",
                "gists_url": "https://api.github.com/users/anotherUser/gists{/gist_id}",
                "starred_url": "https://api.github.com/users/anotherUser/starred{/owner}{/repo}",
                "subscriptions_url": "https://api.github.com/users/anotherUser/subscriptions",
                "organizations_url": "https://api.github.com/users/anotherUser/orgs",
                "repos_url": "https://api.github.com/users/anotherUser/repos",
                "events_url": "https://api.github.com/users/anotherUser/events{/privacy}",
                "received_events_url": "https://api.github.com/users/anotherUser/received_events",
                "type": "User",
                "site_admin": false
              },
              "total": 0,
              "weeks": [
                {
                  "w": 1367712000,
                  "a": 50,
                  "d": 50,
                  "c": 0
                }
              ]
            }
          ]};

        (axios.get as jest.Mock).mockResolvedValueOnce(response); 
        const spy = jest.spyOn(console, 'log'); 
        
        await bf.calculateScore(); 

        // expect(spy).not.toHaveBeenCalledWith('data is null');
        // expect(spy).toHaveBeenLastCalledWith('proceed with caution, total commits unable to be retrieved by api');
        
        expect(bf.getScore()).toBe(0.625); 
    });
});