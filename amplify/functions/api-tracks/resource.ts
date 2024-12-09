import { defineFunction } from '@aws-amplify/backend';

export const myApiFunctionTracks = defineFunction({
    name: 'api-tracks',
    timeoutSeconds: 60,
    runtime: 20,

});