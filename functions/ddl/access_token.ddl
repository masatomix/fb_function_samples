CREATE TABLE `access_token` (
  `team_id` varchar(100) NOT NULL,
  `user_id` varchar(100) NOT NULL DEFAULT '',
  `scope` varchar(100) NOT NULL,
  `team_name` varchar(100) NOT NULL DEFAULT '',
  `access_token` varchar(4096) NOT NULL DEFAULT '',
  `body` varchar(4096) DEFAULT '',
  `update_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`team_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `USER_SLACKUSER` (
  `user_id` varchar(100) NOT NULL DEFAULT '',
  `slack_user_id` varchar(100) NOT NULL DEFAULT '',
  `update_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;