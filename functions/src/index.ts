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

export const hello_auth = functions.https.onCall((data, context) => {
  console.log('data: ' + JSON.stringify(data))
  console.log('context.auth: ' + JSON.stringify(context.auth))
  if (context.auth) {
    console.log('context.auth.uid: ' + context.auth.uid)
  }
  console.log(
    'context.instanceIdToken: ' + JSON.stringify(context.instanceIdToken)
  )

  // const auth = context.auth
  // console.log(JSON.stringify(auth))
  // console.log(JSON.stringify(context.instanceIdToken))
  // console.log(JSON.stringify(context.rawRequest))

  return data
})

export const addTask = functions.https.onRequest((req, res) => {
  const task = req.body
  const firestore = admin.firestore()
  const ref = firestore.collection('todos')

  ref.add(task).then(docref => {
    task.id = docref.id
    ref.doc(docref.id).set(task) // idを入れて再度更新
    res.send('Hello from Firebase!')
  })
})

function getIdToken(request, response) {
  if (!request.headers.authorization) {
    response.status(401).send('Authorization ヘッダが存在しません。')
    return
  }
  const match = request.headers.authorization.match(/^Bearer (.*)$/)
  if (match) {
    const idToken = match[1]
    return idToken
  } else {
    response
      .status(401)
      .send('Authorization ヘッダから、Bearerトークンを取得できませんでした。')
    return
  }
}

export const echo = functions.https.onRequest(async (request, response) => {
  const task = request.body
  console.log(JSON.stringify(task))

  const idToken = getIdToken(request, response) // Bearerトークン取れるかチェック
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken)

    // ココにロジック
    console.log(decodedToken.uid) // Firebase Authentication 上のユーザUID
    response.send(JSON.stringify(task))
  } catch (error) {
    console.log(error.message)
    response.status(401).send(error.message)
  }
})

// export const echo_onCall = functions.https.onCall((data, context) => {
//   console.log('data: ' + JSON.stringify(data))
//   console.log('context.auth: ' + JSON.stringify(context.auth))
//   if (context.auth) {
//     console.log('context.auth.uid: ' + context.auth.uid)
//   }
//   return data
// })

import * as express from 'express'
import userRouter from './userRouter'
import companyRouter from './companyRouter'
import railRouter from './railRouter'
import railUtils from './railUtils'

const app = express()

app.use('/users', userRouter)
app.use('/companies', companyRouter)
app.use('/rails', railRouter)

export const api = functions.https.onRequest(app)

export const store_rail_info = functions.pubsub
  .topic('store_rail_info')
  .onPublish(message => {
    railUtils.rail_detail_insert()
  })

export const check_rail_info = functions.pubsub
  .topic('check_rail_info')
  .onPublish(message => {
    railUtils.rail_check()
  })
