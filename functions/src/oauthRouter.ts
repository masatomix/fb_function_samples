import * as express from 'express'
import * as request from 'request'
import * as mysql from 'promise-mysql'
import config from './config'
import oauthConfig from './oauthConfig'

let pool = mysql.createPool(config)

const router = express.Router()

router.get('/', async (req, res) => {
  console.log('token start.')

  const code = req.query.code

  // errorでリダイレクトされたとき
  if (req.query.error) {
    res.setHeader('ContentType', 'text/plain;charset=UTF-8')
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
    const authorization_endpoint_uri = [
      oauthConfig.authorization_endpoint,
      '?client_id=',
      oauthConfig.client_id,
      '&redirect_uri=',
      oauthConfig.redirect_uri,
      '&scope=',
      oauthConfig.scope
    ].join('')

    // const authorization_endpoint_uri = `${
    //   oauthConfig.authorization_endpoint
    // }?client_id=${oauthConfig.client_id}&redirect_uri=${
    //   oauthConfig.redirect_uri
    // }&scope=${oauthConfig.scope}`
    res.redirect(authorization_endpoint_uri)
  } else {
    // コードがあるときToken取得処理
    // const state = req.query.state

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

    const body: any = await doRequest(options)
    const instance = {
      team_id: body.team_id,
      user_id: body.user_id,
      scope: body.scope,
      team_name: body.team_name,
      access_token: body.access_token,
      body: JSON.stringify(body)
    }

    let connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.query(
        'delete from  access_token where team_id = ? and user_id = ? and scope = ? ;',
        [body.team_id, body.user_id, body.scope]
      )
      await connection.query('insert into access_token set ?', instance)

      const rows = await connection.query(
        'select * from  access_token where team_id = ? and user_id = ? and scope = ? ;',
        [body.team_id, body.user_id, body.scope]
      )
      connection.commit()
      res.status(201).json(rows[0])
    } catch (err) {
      console.log('err: ' + err)
      connection.rollback()
      res.status(500).send(err)
    } finally {
      pool.releaseConnection(connection)
    }

    console.log(body)
  }

  // 認可トークンから、Slackへトークンをもらいに行く処理を実装して、DBへ保存、とか。
  console.log('token End.')
  res.send('完了！')
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

export default router
