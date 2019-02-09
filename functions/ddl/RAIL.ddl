CREATE TABLE `DELAY_RAIL_ALL` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `company` varchar(100) DEFAULT NULL,
  `lastupdate_gmt` int(11) DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
  `update_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5555 DEFAULT CHARSET=utf8mb4;


CREATE TABLE `DELAY_RAIL_NEW` (
  `name` varchar(100) NOT NULL DEFAULT '',
  `company` varchar(100) DEFAULT NULL,
  `lastupdate_gmt` int(11) DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
  `update_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE `DELAY_RAIL_PREV` (
  `name` varchar(100) NOT NULL DEFAULT '',
  `company` varchar(100) DEFAULT NULL,
  `lastupdate_gmt` int(11) DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
  `update_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `RAIL_MASTER` (
  `rail_name` varchar(100) NOT NULL,
  `company` varchar(100) NOT NULL,
  `location` varchar(100) NOT NULL,
  PRIMARY KEY (`rail_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE `USER_RAIL` (
  `user_id` varchar(100) NOT NULL,
  `rail_name` varchar(100) NOT NULL,
  PRIMARY KEY (`user_id`,`rail_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;