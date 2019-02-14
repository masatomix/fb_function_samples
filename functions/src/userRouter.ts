import * as express from "express";
import poolUtil from './poolUtil'

const router = express.Router();

router
  // findAll
  // status 200
  // 結果配列を返す
  .get("/", async (req, res) => {
    console.log("find all user start.");
    try {
      const rows:any = await  poolUtil.getPool().query("select * from  USER_MASTER;");
      if (rows.length === 0) {
        res.status(404).send();
        return;
      }
      res.json(rows);
    } catch (err) {
      console.log("err: " + err);
      res.status(500).send(err);
    } finally {
      console.log("find all user end.");
    }
  })

  // create
  // status 201
  // 作成したオブジェクトを返す
  .post("/", async (req, res) => {
    console.log("create user start.");
    const user = req.body;
    console.log(JSON.stringify(user));

    try {
      await  poolUtil.getPool().query("insert into USER_MASTER set ?", user);
      const rows = await  poolUtil.getPool().query(
        "select * from  USER_MASTER where COMPANY_CD = ? and LOGIN_ID = ? ;",
        [user.COMPANY_CD, user.LOGIN_ID]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.log("err: " + err);
      res.status(500).send(err);
    } finally {
      console.log("create user end.");
    }
  })

  // update
  // status 200
  // 作成したオブジェクトを返す
  .put("/", async (req, res) => {
    console.log("update user start.");
    const user = req.body;
    console.log(JSON.stringify(user));
    const companyCode = user.COMPANY_CD;
    const loginId = user.LOGIN_ID;
    const userName = user.USER_NAME;
    try {
      const rows = await  poolUtil.getPool().query(
        "update USER_MASTER set COMPANY_CD = ? ,LOGIN_ID = ? ,USER_NAME = ? where COMPANY_CD = ? and LOGIN_ID = ?",
        [companyCode, loginId, userName, companyCode, loginId]
      );
      res.status(200).json(rows[0]);
      // res.status(204).send();
    } catch (err) {
      console.log("err: " + err);
      res.status(500).send(err);
    } finally {
      console.log("update user end.");
    }
  });

// PK検索
// status 200
// 検索したオブジェクト(配列)を返す
router.get("/:company_cd/:login_id", async (req, res) => {
  console.log("find by pk start.");
  try {
    const rows:any = await  poolUtil.getPool().query(
      "select * from  USER_MASTER where COMPANY_CD = ? and LOGIN_ID = ? ;",
      [req.params.company_cd, req.params.login_id]
    );
    if (rows.length === 0) {
      res.status(404).send();
      return;
    }
    res.json(rows);
  } catch (err) {
    console.log("err: " + err);
    res.status(500).send(err);
  } finally {
    console.log("find by pk end.");
  }
});

// delete
// status 204
// 空データを返す
router.delete("/:company_cd/:login_id", async (req, res) => {
  console.log("delete user start.");
  try {
    await  poolUtil.getPool().query(
      "delete from  USER_MASTER where COMPANY_CD = ? and LOGIN_ID = ? ;",
      [req.params.company_cd, req.params.login_id]
    );
    res.status(204).send();
  } catch (err) {
    console.log("err: " + err);
    res.status(500).send(err);
  } finally {
    console.log("delete user end.");
  }
});

export default router;