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

import * as express from 'express'
import * as cookieParser from 'cookie-parser'
import userRouter from './userRouter'
import companyRouter from './companyRouter'
import railRouter from './railRouter'
import oauthRouter from './oauthRouter'
import railUtils from './railUtils'

const app = express()
app.use(cookieParser())

app.use('/users', userRouter)
app.use('/companies', companyRouter)
app.use('/rails', railRouter)
app.use('/oauth', oauthRouter)


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
