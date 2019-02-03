import * as functions from 'firebase-functions'

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

import * as logic from './logic'

export const helloPubSub = functions.pubsub
  .topic('testTopic')
  .onPublish(message => {
    logic.want_to_execute()
  })
