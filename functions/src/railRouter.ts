import * as express from 'express'
import railUtils from './railUtils'

const router = express.Router()

router.get('/store_rail_info', async (req, res) => {
  console.log('/store_rail_info start.')
  railUtils.rail_detail_insert()
  console.log('/store_rail_info End.')
  res.send()
})

router.get('/check_rail_info', async (req, res) => {
  console.log('/check_rail_info start.')
  railUtils.rail_check()
  console.log('/check_rail_info End.')
  res.send()
})

export default router
