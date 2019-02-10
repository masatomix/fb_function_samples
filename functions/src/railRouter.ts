import * as express from 'express'
import railUtils from './railUtils'

const router = express.Router()

router.get('/', async (req, res) => {
  console.log('insert start.')
  railUtils.rail_detail_insert()
  console.log('insert End.')
  res.send()
})

export default router
