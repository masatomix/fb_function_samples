import * as request from 'request'
import poolUtil from './poolUtil'
import * as moment from 'moment-timezone'

// import * as fs from 'fs'

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
    const body: any = await _internal.doRequest(option)
    let connection = await poolUtil.getPool().getConnection()
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
      poolUtil.getPool().releaseConnection(connection)
    }
  },

  /**
   * DELAY_RAIL_NEW/DELAY_RAIL_PREV どうしの差分をチェックし、差分があったら通知する
   */
  async rail_check() {
    //  探してきて、差分があったら、通知する。
    const rail_infos_prev = await _internal.getDataFromTable('DELAY_RAIL_PREV') //DELAY_RAIL_PREV
    const rail_infos = await _internal.getDataFromTable('DELAY_RAIL_NEW')

    // const rail_infos = JSON.parse(fs.readFileSync('new.json', 'utf8'))
    // const rail_infos_prev = JSON.parse(fs.readFileSync('prev.json', 'utf8'))

    // token のフィールド
    //   slack_user_id
    //   user_id
    //   access_token
    //   body
    const tokens: Array<any> = await _internal.getTokens()

    // user_rail のフィールド
    //   user_id
    //   rail_name
    const user_rails: Array<any> = await _internal.getDataFromTable('USER_RAIL')

    // console.log(JSON.stringify(user_rails))

    // 登録されたトークンごとに、繰り返し処理
    tokens.forEach(token => {
      // tokenのユーザIDでフィルタして路線名の配列を作成
      const user_rails_per_user = user_rails.filter(
        user_rail => user_rail.user_id === token.user_id
      )

      // DELAY_RAIL_NEW のレコードに対して、
      const f_rail_infos = rail_infos.filter(rail_info =>
        user_rails_per_user.some(
          user_rail_per_user => user_rail_per_user.rail_name === rail_info.name
        )
      )
      const f_rail_infos_prev = rail_infos_prev.filter(rail_info =>
        user_rails_per_user.some(
          user_rail_per_user => user_rail_per_user.rail_name === rail_info.name
        )
      )
      // console.log('--')
      // console.log(JSON.stringify(f_rail_infos))
      // console.log('--')
      // console.log(JSON.stringify(f_rail_infos_prev))
      // console.log('--')

      if (_internal.equals(f_rail_infos, f_rail_infos_prev)) {
        console.log('差分ナシ! for ', token.user_id)
      } else {
        console.log('差分アリ! for ', token.user_id)

        _internal.sendSlack(f_rail_infos, token)

        _internal.insert_data('send_log', {
          dest_user: token.user_id,
          message: JSON.stringify(f_rail_infos)
        })
      }
    })
  }
}

/**
 * ココでつかうUtilsを集めたメソッド。exportしないので外からつかえない(でイイんだよね)。。
 */
const _internal = {
  async getTokens() {
    let tokens = []
    let connection = await poolUtil.getPool().getConnection()
    try {
      const sql = `select
        access_token.user_id as slack_user_id,
        USER_SLACKUSER.user_id ,
        access_token.access_token,
        access_token.body
      from access_token left join  USER_SLACKUSER
      on
        access_token.user_id = USER_SLACKUSER.slack_user_id
      `
      tokens = await connection.query(
        sql
        // 'select access_token,body from access_token'
      )

      // tokens = rows.map(row=>row.access_token)
    } catch (err) {
      console.log('err: ' + err)
    }
    return tokens
  },

  /**
   * 前回DBと差分があり、メッセージを送信する事になった際に呼ばれるメソッド。
   * ・token2Rosens で、ユーザが送信してほしい路線一覧を取得する。
   * ・rail_infos にその路線が入っていたら、その行は挿入する。入ってなければ、その行は挿入しない
   * ・結果どの路線も挿入しない場合もありえる。
   * ただし、そもそも rail_infos がゼロ件のばあいは、、、とか結構制御がむずかしい。。
   * @param rail_infos
   * @param token
   */
  createMessage(rail_infos: Array<any>, token) {
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

    const message = `電車運行情報 ${nowStr} 時点
${internal_message}

(カッコは更新時刻)
https://www.tetsudo.com/traffic/
https://rti-giken.jp/fhc/api/train_tetsudo/
`
    return message
  },

  sendSlack(rail_infos, token) {
    const message = this.createMessage(rail_infos, token)
    console.log(message)
    const option = {
      url: JSON.parse(token.body).incoming_webhook.url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        Authorization: `Bearer ${token.access_token}`
      },
      json: {
        text: message,
        channel: JSON.parse(token.body).incoming_webhook.channel
      }
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
  },

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

    // サイズがおなじ場合、now側(rail_infos)で、For文回す
    // 全てのrail_info において、containsRailInfo がtrueだったら -> true
    return rail_infos.every(rail_info => {
      const matchFlag = this.containsRailInfo(rail_info, rail_infos_prev)
      if (!matchFlag) {
        console.log(
          'newにある[%s]に一致するレコードが見つからない',
          rail_info.name
        )
      }
      return matchFlag
    })
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
    let connection = await poolUtil.getPool().getConnection()
    try {
      return await connection.query('select * from ' + tableName)
    } catch (err) {
      console.log('err: ' + err)
    } finally {
      console.log('create getDataFromTable end.')
      poolUtil.getPool().releaseConnection(connection)
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
  },

  async insert_data(tableName, obj) {
    console.log(JSON.stringify(obj))
    console.log('send log start.')
    let connection = await poolUtil.getPool().getConnection()
    await connection.beginTransaction()
    try {
      await connection.query('insert into ' + tableName + ' set ?', obj)
      connection.commit()
    } catch (err) {
      console.log('err: ' + err)
      connection.rollback()
    } finally {
      console.log('send log end.')
      poolUtil.getPool().releaseConnection(connection)
    }
  }
}

export default me

if (!module.parent) {
  me.rail_check()
}
