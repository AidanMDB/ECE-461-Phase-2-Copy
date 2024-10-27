# project-f2024

## Project Purpose
This repository is an implementation of a command line tool which aims to help developers choose reliable open-source modules. By analyzing npm package repositories on GitHub, it evaluates modules based on important factors such as ease of use, correctness, contributor activity, responsiveness, and license compatibility. 

Our goal is to simplify the process of assessing open-source software.

## Usage
### `./run install`
* Installs all dependencies required for project-f2024 reposistory

### `./run <url_file>`
* Scores npm or Github URLs inside <url_file>
* Sample Input File:
    ```
    https://www.npmjs.com/package/commander
    https://www.npmjs.com/package/command-line-args
    https://github.com/yargs/yargs
    ```
* Outputs net and individual scores as well as latency to stdout in NDJSON format
* Sample Output:
    ```
    {"URL":"https://www.npmjs.com/package/express", "NetScore":0, "NetScore_Latency": 0.133,"RampUp":0.5,"RampUp_Latency": 0.002, "Correctness":0.7, "Correctness_Latency":0.076, "BusFactor":-1, "BusFactor_Latency":-1, "ResponsiveMaintainer":0.6, "ResponsiveMaintainer_Latency": 0.009, "License":0, "License_Latency": 0.046}
    ```
### `./run test`
* to run test for individual file's run "npm test tests/metrics/(the metric).test.ts"
*
* export GITHUB_TOKEN='your token'
* Runs tests on project-f2024 repository using jest
* Test can be found in /test directory
* Sample Output:
    ```
    Total: 10
    Passed: 9
    Coverage: 90%
    9/10 test cases passed. 90% line coverage achieved.
    ```

## Setup
1. Install Dependencies: `./run install`
2. Setup environment variables
    1. LOG_FILE (see [Logging](#Logging) section)
    2. LOG_LEVEL (see [Logging](#Logging) section)
    3. GITHUB_TOKEN (required)
    * Sample .env file:
        ```
        # To activate: ". .env"
        LOG_LEVEL=1
        LOG_FILE="log.log"
        GITHUB_TOKEN="gh*****"`
        ```
    * Setting in command line (Linux):
        ```
        export LOG_LEVEL=2
        ```
3. Run unit tests or evalutate models (see [Usage](#Usage) section)

## Scoring
All scores are calculated between 0 and 1 (inclusive), a higher score corresponds to a better implementation of the metric within a repository. If the module fails to calculate the score, the score is set to -1.
### Bus Factor
* Defined by "the minimum number of team members that have to suddenly disappear from a project before the project stalls due to lack of knowledgeable or competent personnel" (Source: Wikipedia).
* `bus_factor = 1 - 0.5 (highest contributor commits / total commits) - 0.5 (highest contributor lines changed) / total lines changed)`
    * if there is only one contributor, bus factor would be 0
    * if there are many contributors, but changes are disproportionately made by a single person, bus factor would approach 0
    * for evenly split contributions, bus factor will approach 1
* Possibility of repositories that omit commits or line changed data, such as React. 
    * no commits, lines changed: `bus_factor = 1 - 0.5 (highest contributor lines changed) / total lines changed)`
    * commits exist, no lines changed:  `bus_factor = 1 - 0.5 (highest contributor commits / total commits)`
### Correctness
* Want to determine if issues are resolved as they are brought up, demonstrating an effort to minimize bugs and hence "increase" the validity of the code
* `correctness = resolved issues / total issues`
### License
* Only LGPLv2.1 License is accepted, rest is rejected
* Utilize regex to parse through README and LICENSE files as needed
### Ramp Up
* High score indicates low ramp up time required
* Measured by ratio of documentation to code
* Target ratio is smaller for smaller projects as it is assumed that looking through the code itself will be easier as compared to a larger project
* `ramp_up = (estimated_documentation_file_size / estimated_total_code_size) * size_ratio`
### Responsiveness
* This score measures the responsiveness of contributors within last three months
* Calculated using average response times for issues and pull requests i.e. time from open to close
* `responsiveness = min(1, 1 / (1 + e^(K * normAvgTime))) `
    * `K` = 6, constant value
    * `normAvgTime = (avgTime – minResp) / (maxResp – minResp)`
        * `minResp` = 1 day (8.64e+7 ms)
        * `maxResp` = 30 days (2.592e+9 ms)
### Net Score
* Calculated as a net score between the five metrics: `NS = LC * (0.4BF + 0.15CM + 0.15RU + 0.3RM)`where 
    * `NS` = Net Score
    * `LC` = License
    * `BF` = Bus Factor
    * `CM` = Correctness
    * `RU` = Ramp Up
    * `RM` = Responsive Maintainer
* Weights:
    * `LC` = weight of the net score depends on the licensing score. Package is automatically rejected for ACME if it doesn't match the LGPLv2.0 license regardless of other attributes, score will be pulled down to 0 due to the binary nature of this metric
    * `BF` = 0.4, according to Sarah's requirements, bus factor is the most important metric in determining repository validity
    * `CM` = 0.15, while closed issues and raised issues can indicate correctness it is possible that they are not a direct correlation
    * `RU` = 0.15, our target 'stakeholders', or users, of the product are engineers that are capable and used to learning new how new packages work
    * `RM` = 0.3, this metric is similar to bus factor because it shows a continuous effort to keep the package up to date
## External Dependencies
* **axios**: A promise-based HTTP client for making requests to the npm Registry and GitHub REST APIs. It simplifies the process of handling asynchronous requests and managing responses, making it easier to interact with external services.
* **minimist**: A lightweight module for parsing command-line arguments. It enables easy extraction of arguments from the CLI, allowing for flexible and user-friendly command-line interfaces in your application.
* **jest**: A javascript testing framework 

## Logging
* **LOG_LEVEL**
    * `0` (default) : Silent
    * `1` : Only displays information messages
    * `2` : Diplays information and debug messages
* **LOG_FILE**: Location of log output
    * Default is default.log

## Structure
* `src`: .ts files
     * `commands`   Contains functions called for each CL argument
     * `metrics`    Contains classes for each metric
     * `utils`      Contains helper functions for URL and cloning
 * `test`: contains jest test suite corresponding with each file in in src subfolders
     * `commands`
     * `metrics`
     * `utils`
 * `dist`: compiled .ts -> .js files from src
     * `commands`
     * `metrics`
     * `utils`
