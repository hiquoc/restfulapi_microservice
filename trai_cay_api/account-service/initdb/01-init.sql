CREATE DATABASE IF NOT EXISTS account_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE account_db;

CREATE TABLE `accounts` (
  `account_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(65) NOT NULL,
  `password` varchar(65) NOT NULL,
  `role` varchar(65) NOT NULL DEFAULT 'user',
  `fullname` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO `accounts` VALUES (1,'huy1','$2b$10$u00sj6xf.2UwQ.oojtyNdu6lNbShmRT2k7lIzsvNzRrpfc3tGxzsm','admin','Dang Quoc Huy','0862470050','dangquochuy26122003@gmail.com');

CREATE TABLE `addresses` (
  `address_id` int NOT NULL AUTO_INCREMENT,
  `account_id` int DEFAULT NULL,
  `tinh` varchar(100) DEFAULT NULL,
  `quan` varchar(100) DEFAULT NULL,
  `phuong` varchar(100) DEFAULT NULL,
  `nha` varchar(100) DEFAULT NULL,
  `ghichu` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`address_id`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;