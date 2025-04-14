CREATE DATABASE IF NOT EXISTS product_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE product_db;

CREATE TABLE `products` (
  `product_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(65) NOT NULL,
  `description` text,
  `price` int NOT NULL,
  `sold` int DEFAULT '0',
  `stock` int NOT NULL DEFAULT '0',
  `category` varchar(65) NOT NULL,
  `status` varchar(65) NOT NULL DEFAULT 'Còn hàng',
  `comment_id` varchar(45) DEFAULT NULL,
  `discount` int DEFAULT '0',
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `product_images` (
  `image_id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `image_url` text NOT NULL,
  PRIMARY KEY (`image_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_images_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(65) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `name_UNIQUE` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vietnamese characters will be preserved with utf8mb4
INSERT INTO categories (name) VALUES("Giỏ trái cây"),("Trái cây"),("Rau củ");