/**
 * This file is for handling the api-package regex REST API track.
**/

import { defineFunction } from '@aws-amplify/backend';

export const myApiFunctionRegex = defineFunction({ 
    name: 'api-package-regex',
    timeoutSeconds: 60,
    runtime: 20
});