import * as express from "express";
import * as mysql from "promise-mysql";

import config from "./config";

const router = express.Router();

let mysqlPool = mysql.createPool(config);


router
  // findAll
  // status 200
  // 結果配列を返す
  .get("/", async (req, res) => {
    console.log("find all");
    try {
      const rows:any = await mysqlPool.query("select * from COMPANY_MASTER;");
      if (rows.length === 0) {
        res.status(404).send();
        return;
      }
      res.json(rows);
    } catch (err) {
      console.log("err: " + err);
      res.status(500).send(err);
    }
  })

  // create
  // status 201
  // 作成したオブジェクトを返す
  .post("/", async (req, res) => {
    console.log("create");
    const user = req.body;
    console.log(JSON.stringify(user));

    try {
      await mysqlPool.query("insert into COMPANY_MASTER set ?", user);
      const rows = await mysqlPool.query(
        "select * from  COMPANY_MASTER where COMPANY_CD = ? ;",
        [user.COMPANY_CD]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.log("err: " + err);
      res.status(500).send(err);
    }
  })

  // update
  // status 200
  // 作成したオブジェクトを返す
  .put("/", async (req, res) => {
    console.log("update");
    const user = req.body;
    console.log(JSON.stringify(user));
    const companyCode = user.COMPANY_CD;
    const userName = user.COMPANY_NAME;
    try {
      const rows = await mysqlPool.query(
        "update COMPANY_MASTER set COMPANY_CD = ? ,COMPANY_NAME = ? where COMPANY_CD = ?",
        [companyCode, userName, companyCode]
      );
      res.status(200).json(rows[0]);
      // res.status(204).send();
    } catch (err) {
      console.log("err: " + err);
      res.status(500).send(err);
    }
  });

// PK検索
// status 200
// 検索したオブジェクト(配列)を返す
router.get("/:company_cd/", async (req, res) => {
  console.log("find by pk");
  try {
    const rows:any = await mysqlPool.query(
      "select * from  COMPANY_MASTER where COMPANY_CD = ?",
      [req.params.company_cd]
    );
    if (rows.length === 0) {
      res.status(404).send();
      return;
    }
    res.json(rows);
  } catch (err) {
    console.log("err: " + err);
    res.status(500).send(err);
  }
});

// delete
// status 204
// 空データを返す
router.delete("/:company_cd/", async (req, res) => {
  console.log("delete");
  try {
    await mysqlPool.query(
      "delete from  COMPANY_MASTER where COMPANY_CD = ?",
      [req.params.company_cd]
    );
    res.status(204).send();
  } catch (err) {
    console.log("err: " + err);
    res.status(500).send(err);
  }
});

export default router;
