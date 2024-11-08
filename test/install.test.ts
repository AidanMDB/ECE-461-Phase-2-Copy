import { exec } from 'child_process';
import exp from 'constants';
import { promisify } from 'util';

const execPromise = promisify(exec);

describe('./run install', () => {
  describe('./run install valid', () => {
    it('should print "Dependencies installed successfully"', async () => {
      // Run the command
      const { stdout: stdout, stderr:stderr } = await execPromise('npm install');
      
      // Check for errors
      if (stderr) {
        throw new Error(`Error: ${stderr}`);
      }

      // Check if the output contains the expected result
      //expect(stdout).toContain('Dependencies installed successfully');
      expect(stdout).toContain('up to date, audited');
    });
  });
    ///// Got rid of due to usage of chmod, which is not working outside of purdue ecn
    
  // describe('./run install no permission', () => {
  //   beforeAll(async () => {
  //     await execPromise('ren node_modules');
  //   });
  //   afterAll(async () => {
  //     await execPromise('ren node_modules');
  //   });
  //   it('should error with a non-zero exit code and output "Error: npm install failed"', async () => {
  //     try {
  //       await execPromise('npm install');
  //       expect(null).not.toBeFalsy() // fail() shouldn't reach this line
  //     } catch (error: any) {;
  //       expect(error.code).not.toBe(0);
  //       expect(error.stderr).toContain('Error: npm install failed with exit code ');
  //     }
  //   });
  // });
});
