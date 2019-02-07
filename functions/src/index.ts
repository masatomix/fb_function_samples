import * as functions from 'firebase-functions'

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

// const functions = require('firebase-functions')
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

import * as admin from 'firebase-admin'
admin.initializeApp()

export const hello = functions.https.onRequest((req, res) => {
  res.send('Hello world.')
})

export const echo = functions.https.onRequest((request, response) => {
  const task = request.body
  console.log(JSON.stringify(task))

  response.send(JSON.stringify(task))
})
