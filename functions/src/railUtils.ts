import * as request from 'request'
import * as mysql from 'promise-mysql'
import config from './config'
import slackConfig from './slackConfig'
import * as moment from 'moment-timezone'

// import * as fs from 'fs'

let pool = mysql.createPool(config)

const excludeList = ['日高本線', '室蘭本線', '呉線', '芸備線'] // いつも遅延してる？ぽいので、まあ除外しちゃう

const me = {
  /**
   * 鉄道遅延情報WEBサイトにアクセスして、取得結果をDBに格納する。
   * それまで持っていたのはprevテーブルに入れて、あとで差分チェックが出来るようにする
   */
  async rail_detail_insert() {
    const option = {
      url: 'https://rti-giken.jp/fhc/api/train_tetsudo/delay.json',
      method: 'GET',
      json: true
    }
    const body: any = await _utils.doRequest(option)
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
        // 除外リストにないときだけ
        if (!excludeList.some(value => value === delay_rail_info['name'])) {
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
      }
      // 全部出来たらコミット
      connection.commit()
    } catch (err) {
      console.log('err: ' + err)
      connection.rollback()
    } finally {
      console.log('create rail_detail_insert end.')
      pool.releaseConnection(connection)
    }
  },

  /**
   * DELAY_RAIL_NEW/DELAY_RAIL_PREV どうしの差分をチェックし、差分があったら通知する
   */
  async rail_check() {
    //  探してきて、差分があったら、通知する。
    const rail_infos_prev = await _utils.getDataFromTable('DELAY_RAIL_PREV')
    const rail_infos = await _utils.getDataFromTable('DELAY_RAIL_NEW')

    // const rail_infos = JSON.parse(fs.readFileSync('new.json', 'utf8'))
    // const rail_infos_prev = JSON.parse(fs.readFileSync('prev.json', 'utf8'))

    if (_utils.equals(rail_infos, rail_infos_prev)) {
      console.log('差分ナシ!')
    } else {
      console.log('差分アリ!')
      const message = this.createMessage(rail_infos)
      console.log(message)
      this.sendSlack(message)
    }
  },

  createMessage(rail_infos: Array<any>) {
    const internal_message = rail_infos
      .map(element => {
        const lastupdateStr = moment(element.lastupdate_gmt * 1000)
          .tz('Asia/Tokyo')
          .format('HH:mm')
        return `${element.name} (${lastupdateStr})`
      })
      .reduce((prev, current) => prev + '\n' + current, '')
    // 最後の''は、空配列のときに初期値が不定となるので''を初期値とする、の意味

    const now = moment()
    const nowStr = now.tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm')

    let message = `電車運行情報 ${nowStr} 時点

${internal_message}

(カッコは更新時刻)
https://www.tetsudo.com/traffic/
https://rti-giken.jp/fhc/api/train_tetsudo/
`
    return message
  },

  sendSlack(message) {
    const option = {
      url: slackConfig.url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      json: { text: message, channel: '#rail_info' }
    }
    request(option, (error, response, body) => {
      if (error) {
        console.log('error:', error)
        return
      }
      if (response && body) {
        console.log('status Code:', response && response.statusCode)
        console.log(body)
      }
    })
  }
}

/**
 * ココでつかうUtilsを集めたメソッド。exportしないので外からつかえない(でイイんだよね)。。
 */
const _utils = {
  /**
   * 配列どうしの長さや中身の項目が一致していたらtrue/そうでなければfalse
   * @param rail_infos
   * @param rail_infos_prev
   */
  equals(rail_infos: Array<any>, rail_infos_prev: Array<any>) {
    // サイズ違いはそもそもDIFFあり
    if (rail_infos.length !== rail_infos_prev.length) {
      console.log(
        '配列の長さが違います.new:[%s],prev:[%s]',
        rail_infos.length,
        rail_infos_prev.length
      )
      return false
    }

    let matchFlag: boolean = false

    // サイズがおなじ場合、now側で、For文回す
    // 要修正。もすこしJSらしく
    for (const rail_info of rail_infos) {
      matchFlag = this.containsRailInfo(rail_info, rail_infos_prev)
      // containsRailInfo をくぐり抜けて、Falseだったら 一致するものがなかったということ
      if (!matchFlag) {
        console.log(
          'newにある[%s]に一致するレコードが見つからない',
          rail_info.name
        )
        return false
      }
    }
    return true
  },

  /**
   * 引数のRailInfoオブジェクト(rail_info)が、rail_infos_prevのリストに含まれているかをTrue/Falseで。
   * @param rail_info
   * @param rail_infos_prev
   */
  containsRailInfo(rail_info, rail_infos_prev: Array<any>) {
    if (
      // どれか一つにでも、一致してたら
      rail_infos_prev.some(rail_info_prev =>
        this.equalsRailInfo(rail_info, rail_info_prev)
      )
    ) {
      return true
    }
    return false
  },

  /**
   * 引数のRailInfoオブジェクトを比較する。name 属性がおなじかどうか。
   * @param rail_info1
   * @param rail_info2
   */
  equalsRailInfo(rail_info1, rail_info2) {
    return (
      // rail_info1.name === rail_info2.name &&
      // rail_info1.lastupdate_gmt === rail_info2.lastupdate_gmt
      rail_info1.name === rail_info2.name
    )
  },

  async getDataFromTable(tableName) {
    let connection = await pool.getConnection()
    try {
      return await connection.query('select * from ' + tableName)
    } catch (err) {
      console.log('err: ' + err)
    } finally {
      console.log('create getDataFromTable end.')
      pool.releaseConnection(connection)
    }
  },

  doRequest(option) {
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
}

export default me

if (!module.parent) {
  me.rail_check()
}
