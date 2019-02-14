import * as express from 'express'
import * as request from 'request'
import poolUtil from './poolUtil'
import oauthConfig from './oauthConfig'

// const pool = poolUtil.getPool()

const router = express.Router()

/**
 * Slack追加、ボタンをクリックしたときにまず呼ばれるリンク。リクエストパラメタに
 * user=xxxって FirebaseのユーザIDが渡ってくる想定で、Cookieに入れる指示をして、'./'へリダイレクト。
 */
router.get('/addCookie', (req, res) => {
  addCookie(res, 'user', req.query.user)
  res.redirect('./')
})

/**
 * こっちが本丸のSlack追加リンク。
 * リクエストパラメタに認可コード(code=xxxx)がついていない場合は、
 * CSRFのstateパラメタをはじめとする様々なパラメタをつけて、Slackの認可サイトへ302リダイレクト。
 *
 * リクエストパラメタに、認可コードがついている場合は、Slackサイトでユーザが認可をしたってことで、
 * その認可コードを使って、認可サーバ(Slack)へアクセストークンを取得しに行く。
 * そのアクセストークンを取りに行くときは、ClientSecretをつけて認証をおこなう、認可コードグラント方式のOAuthになってます
 *
 * アクセストークンを取れた際には、/addCookieのアクセス時に指示されたユーザ情報がcookieにセットされて登ってきているはずなので
 * そのユーザ情報と、アクセストークンを対にして、データベースへ格納している。
 */
router.get('/', async (req, res) => {
  console.log('token start.')

  const code = req.query.code

  // errorでリダイレクトされたとき
  // ユーザがキャンセルしたときはココなので、そこそこちゃんと実装しないと。。(今んとこ適当実装)
  if (req.query.error) {
    res.setHeader('Content-Type', 'text/plain;charset=UTF-8')
    const message = `
error: ${req.query.error}
error_uri: ${req.query.error_uri}
error_description: ${req.query.error_description}
`
    res.send(message)
    return
  }

  // codeがなかったとき、まずは認可画面へ遷移
  if (!code) {
    const randomValue = getRandomString()
    console.log('randomValue: ' + randomValue)

    const authorization_endpoint_uri = [
      oauthConfig.authorization_endpoint,
      '?client_id=',
      oauthConfig.client_id,
      '&redirect_uri=',
      oauthConfig.redirect_uri,
      '&state=',
      randomValue,
      '&response_type=code',
      '&scope=',
      oauthConfig.scope
    ].join('')

    addCookie(res, 'state', randomValue)
    res.redirect(authorization_endpoint_uri)
  } else {
    checkCSRF(req, res)

    const formParams = {
      redirect_uri: oauthConfig.redirect_uri,
      client_id: oauthConfig.client_id,
      client_secret: oauthConfig.client_secret,
      grant_type: 'authorization_code',
      code: code
    }

    const options = {
      uri: oauthConfig.token_endpoint,
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      form: formParams,
      json: true
    }
    // 別テーブルにすべきだ。
    const body: any = await doRequest(options)

    const instance = {
      team_id: body.team_id,
      user_id: body.user_id,
      scope: body.scope,
      team_name: body.team_name,
      access_token: body.access_token,
      body: JSON.stringify(body)
    }

    const fbUser = req.cookies.user
    const user_slack_user = {
      user_id: fbUser,
      slack_user_id: body.user_id
    }

    const connection = await poolUtil.getPool().getConnection()
    try {
      await connection.beginTransaction()
      await connection.query(
        'delete from  access_token where team_id = ? and user_id = ? ',
        [body.team_id, body.user_id]
      )
      await connection.query('delete from  USER_SLACKUSER where user_id = ? ', [
        fbUser
      ])

      await connection.query(
        'insert into USER_SLACKUSER set ?',
        user_slack_user
      )
      await connection.query('insert into access_token set ?', instance)

      // const rows = await connection.query(
      //   'select * from  access_token where auth_user_id = ? ',
      //   [fbUser]
      // )
      connection.commit()
      // res.status(201).json(rows[0])
      res.send('登録完了。ブラウザ閉じちゃってください。')
    } catch (err) {
      console.log('err: ' + err)
      connection.rollback()
      res.status(500).send(err)
    } finally {
      poolUtil.getPool().releaseConnection(connection)
    }
    console.log(body)
  }
  console.log('token End.')
})

function doRequest(option) {
  return new Promise((resolve, reject) => {
    request(option, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        resolve(body)
      } else {
        reject(error)
      }
    })
  })
}

function getRandomString() {
  var S = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  var N = 50
  const randomValue = Array.from(Array(N))
    .map(() => S[Math.floor(Math.random() * S.length)])
    .join('')
  return randomValue
}

function checkCSRF(req, res) {
  const state = req.query.state
  const sessionState = req.cookies.state || ''
  console.log('requestState: ' + state)
  console.log('sessionState: ' + sessionState)
  if (state !== sessionState) {
    res
      .status(400)
      .send('前回のリクエストと今回のstate値が一致しないため、エラー。')
  }
}

function addCookie(res, key, value) {
  const expiresIn = 60 * 60 * 24 * 5 * 1000
  const options = { maxAge: expiresIn, httpOnly: true, secure: true }
  res.cookie(key, value, options)
}

export default router
