/**
 * This file is for calling the handler for the api-authenticate REST API track.
**/

import { defineFunction } from '@aws-amplify/backend';

export const myApiFunctionAuthenticate = defineFunction({ 
    name: 'api-authenticate',
    timeoutSeconds: 60,
});