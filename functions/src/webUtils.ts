import * as admin from 'firebase-admin'

const me = {
  getIdToken: function(request) {
    if (!request.headers.authorization) {
      throw new Error('Authorization ヘッダが存在しません。')
    }
    const match = request.headers.authorization.match(/^Bearer (.*)$/)
    if (match) {
      const idToken = match[1]
      return idToken
    }
    throw new Error(
      'Authorization ヘッダから、Bearerトークンを取得できませんでした。'
    )
  },

  checkAuthorization: async function(request, response, next) {
    try {
      const idToken = me.getIdToken(request)
      admin
        .auth()
        .verifyIdToken(idToken)
        .then(token => next())
        .catch(error => {
          console.log(error.message)
          response.status(401).send(error.message)
        })
    } catch (error) {
      response.status(401).send(error.message)
    }
  }
}

export default me

if (!module.parent) {
  //    me.getIdToken()ß
}
