import { exec } from 'child_process';
import { Logger } from '../logUtils';
import { createCoverageMap } from 'istanbul-lib-coverage';

export async function runTests() {

  if (!process.env.GITHUB_TOKEN) {
    throw new Error('Please set the GITHUB_TOKEN environmental variable');
  }

  try {
    exec('npx jest --json --coverage --silent', (err, stdout, stderr) => {
        if (err) {
          Logger.logInfo('Error running tests:' + stderr);
        }

        // Parse Jest results
        const results = JSON.parse(stdout);
        const total = results.numTotalTests;
        const passed = results.numPassedTests;
        const coverageMap = createCoverageMap(results.coverageMap);
        let totalLines = 0;
        let coveredLines = 0;
        coverageMap.files().forEach((filePath) => {
          const fileCoverage = coverageMap.fileCoverageFor(filePath);
          const { lines } = fileCoverage.toSummary();
          
          totalLines += lines.total;
          coveredLines += lines.covered;
        });
        const averageCoverage = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;

        // Print formatted output
        console.log(`Total: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Coverage: ${Math.round(averageCoverage)}%`);
        console.log(`${passed}/${total} test cases passed. ${Math.round(averageCoverage)}% line coverage achieved.`);
    });
  } catch (error: any) {
    Logger.logInfo("Error while running runTests()")
    Logger.logDebug(error);
    throw new Error("Error while running jest. Check logs.")
  }
}
