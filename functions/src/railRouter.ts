import * as express from 'express'
import * as request from 'request'
import * as mysql from 'promise-mysql'
import config from './config'

const router = express.Router()

let pool = mysql.createPool(config)

router.get('/', async (req, res) => {
  console.log('insert start.')
  detail_insert()
  res.send()
})

async function detail_insert() {
  const option = {
    url: 'https://rti-giken.jp/fhc/api/train_tetsudo/delay.json',
    method: 'GET',
    json: true
  }
  const body:any = await doRequest(option)
  let connection = await pool.getConnection()
  await connection.beginTransaction()
  try {
    // 前テーブル全消し
    await connection.query('delete from DELAY_RAIL_PREV')

    // 移し替えるため、今テーブル取得
    const rows = await connection.query('select * from DELAY_RAIL_NEW')
    for (const row of rows) {
      // 今テーブルの情報を、前テーブルに移し替え
      await connection.query('insert into DELAY_RAIL_PREV set ?', row)
    }
    // 今テーブルを全消し
    await connection.query('delete from DELAY_RAIL_NEW')
    for (const delay_rail_info of body) {
      // 今テーブルと、ALLテーブルに全件入れる
      await connection.query(
        'insert into DELAY_RAIL_NEW set ?',
        delay_rail_info
      )

      // JSONの情報はALLテーブルにあれば、Insertしない。なければ新規なのでInsert
      const rows = await connection.query(
        'select * from  DELAY_RAIL_ALL where name = ? and lastupdate_gmt = ? ;',
        [delay_rail_info['name'], delay_rail_info['lastupdate_gmt']]
      )
      if (rows.length === 0) {
        await connection.query(
          'insert into DELAY_RAIL_ALL set ?',
          delay_rail_info
        )
      }
    }
    // 全部出来たらコミット
    connection.commit()
  } catch (err) {
    console.log('err: ' + err)
    connection.rollback()
  } finally {
    console.log('create user end.')
    pool.releaseConnection(connection)
  }
}

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
