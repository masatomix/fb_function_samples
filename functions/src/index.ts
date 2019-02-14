import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

import webUtils from './webUtils'

admin.initializeApp()

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

export const echo = functions.https.onRequest(async (request, response) => {
  const task = request.body
  console.log(JSON.stringify(task))

  try {
    const idToken = webUtils.getIdToken(request) // Bearerトークン取れるかチェック
    const decodedToken = await admin.auth().verifyIdToken(idToken)

    // ココにロジック
    console.log(decodedToken.uid) // Firebase Authentication 上のユーザUID
    response.send(JSON.stringify(task))
  } catch (error) {
    console.log(error.message)
    response.status(401).send(error.message)
  }
})

// import * as corsLib from 'cors'
// const cors = corsLib({ origin: true })

// export const echo3 = functions.https.onRequest((req, res) => {
//   return cors(req, res, () => {
//     const idToken = getIdToken(req, res)
//     res.cookie('id', idToken)
//     console.log(idToken)
//     res.redirect(idToken)
//   })
// })

import * as express from 'express'
import * as cookieParser from 'cookie-parser'
import userRouter from './userRouter'
import companyRouter from './companyRouter'
import railRouter from './railRouter'
import oauthRouter from './oauthRouter'
import railUtils from './railUtils'

const app = express()
app.use(cookieParser())

app.use('/rails', railRouter)
// app.use('/rails', webUtils.checkAuthorization) // Bearerないとダメってしてるけど、使うときはコメントアウトする
app.use('/oauth', oauthRouter)

app.use('/users', userRouter)
app.use('/companies', companyRouter)

export const api = functions.https.onRequest(app)

export const store_rail_info = functions.pubsub
  .topic('store_rail_info')
  .onPublish(message => railUtils.rail_detail_insert())

export const check_rail_info = functions.pubsub
  .topic('check_rail_info')
  .onPublish(message => railUtils.rail_check())
