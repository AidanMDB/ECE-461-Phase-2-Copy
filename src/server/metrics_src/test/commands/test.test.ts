import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../../src/logUtils';
import { runTests } from '../../src/commands/test';



describe(' runTest() Failure Only', () => {
    let githubToken: string | undefined;
    const execPromise = promisify(exec);
    
    beforeEach(() => {
        githubToken = process.env.GITHUB_TOKEN;
    });
    
    afterEach(() => {
        if (githubToken !== undefined) {
            process.env.GITHUB_TOKEN = githubToken;
        }
    });

    // Test 1: stores and empties the GITHUB_TOKEN environmental variable
    // It then runs the test suite with "./run test"
    // After test, it restores the GITHUB_TOKEN environmental variable
    // Expected output: "Please set the GITHUB_TOKEN environmental variable"
    it('should print "Please set the GITHUB_TOKEN environmental variable"', async () => {
        // Delete the github token
        if (process.env.GITHUB_TOKEN) {
            delete process.env.GITHUB_TOKEN;
        }
        expect(process.env.GITHUB_TOKEN).toBeUndefined();
        await expect(runTests()).rejects.toThrow('Please set the GITHUB_TOKEN environmental variable');
    });
});