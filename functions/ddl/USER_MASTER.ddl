CREATE TABLE `USER_MASTER` (
  `COMPANY_CD` varchar(11) NOT NULL DEFAULT '',
  `LOGIN_ID` varchar(11) NOT NULL DEFAULT '',
  `USER_NAME` varchar(100) DEFAULT NULL,
  `UPDATE_TIME` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`COMPANY_CD`,`LOGIN_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;