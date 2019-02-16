import * as mysql from 'promise-mysql'
import config from './config'
import { socketPath } from './config'

const mysqlConfig: any = config

if (process.env.NODE_ENV === 'production') {
  console.log('ProductionEnv...')
  mysqlConfig.socketPath = socketPath
}

let pool

export default {
  getPool() {
    if (!pool) {
      // console.log('config: ', JSON.stringify(mysqlConfig))
      pool = mysql.createPool(mysqlConfig)
    }
    return pool
  }
}
