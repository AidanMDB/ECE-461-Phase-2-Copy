import { defineFunction } from '@aws-amplify/backend';

export const myApiFunctionAuthenticate = defineFunction({ 
    name: 'api-authenticate',
    timeoutSeconds: 60,
    runtime: 20
    
});