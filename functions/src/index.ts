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

function getIdToken(request, response) {
  if (!request.headers.authorization) {
    throw new Error('Authorization ヘッダが存在しません。')
  }
  const match = request.headers.authorization.match(/^Bearer (.*)$/)
  if (match) {
    const idToken = match[1]
    return idToken
  }
  throw new Error(
    'Authorization ヘッダから、Bearerトークンを取得できませんでした。',
  )
}

import * as corsLib from 'cors'
const cors = corsLib()

export const echo = functions.https.onRequest((request, response) => {
  return cors(request, response, async () => {
    const task = request.body
    console.log(JSON.stringify(task))

    try {
      const idToken = getIdToken(request, response) // Bearerトークン取れるかチェック
      const decodedToken = await admin.auth().verifyIdToken(idToken)

      console.log(decodedToken.uid) // Firebase Authentication 上のユーザUID
      response.send(JSON.stringify(task))
    } catch (error) {
      console.log(error.message)
      response.status(401).send(error.message)
    }
  })
})

export const echo_onCall = functions.https.onCall((data, context) => {
  console.log('data: ' + JSON.stringify(data))
  console.log('context.auth: ' + JSON.stringify(context.auth))
  if (context.auth) {
    console.log('context.auth.uid: ' + context.auth.uid)
  }
  return data
})
