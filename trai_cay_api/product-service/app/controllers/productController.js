const db = require("../config/mysql");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const productFacade = require("../facade/productFacade");
module.exports = {
  upload: async (req, res) => {
    const connection = await db.promise().getConnection();
    try {
      await connection.beginTransaction();

      if (
        !req.files ||
        (req.files["images"] && req.files["images"].length === 0)
      ) {
        return res
          .status(400)
          .json({ message: "Vui lòng tải ít nhất một ảnh!" });
      }

      // Khởi tạo sản phẩm bằng Factory
      const product = productFacade.create({
        name: req.body.name,
        price: req.body.price,
        category: req.body.category,
        stock: req.body.stock,
        status: req.body.status,
        details: req.body.details,
        mainImage: req.files["mainImage"]
          ? req.files["mainImage"][0].path
          : null,
        images: req.files["images"]
          ? req.files["images"].map((f) => f.path)
          : [],
      });

      // Insert product info
      const newProSql =
        "INSERT INTO products (name, description, price, stock, category, status) VALUES (?, ?, ?, ?, ?, ?)";
      const [proResult] = await connection.query(newProSql, [
        product.name,
        product.details,
        product.price,
        product.stock,
        product.category,
        product.status,
      ]);
      const productId = proResult.insertId;

      // Insert image URLs
      const values = product.getAllImages().map((url) => [productId, url]);
      const newImgSql =
        "INSERT INTO product_images (product_id, image_url) VALUES ?";
      await connection.query(newImgSql, [values]);

      await connection.commit();
      connection.release();

      return res.status(201).json({ message: "Đăng thành công!" });
    } catch (err) {
      await connection.rollback();
      connection.release();
      return res
        .status(500)
        .json({ message: "Lỗi máy chủ!", error: err.message });
    }
  },

  product: async (req, res) => {
    const product_id = req.params.product_id;
    try {
      const ProSql = "SELECT * FROM products WHERE product_id =?";
      let [products] = await db.promise().query(ProSql, [product_id]);

      const ImgSql = "SELECT * FROM product_images WHERE product_id =?";
      let [images] = await db.promise().query(ImgSql, [product_id]);

      const Products=productFacade.getProducts(products,images);

      return res.status(200).json(Products);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  products: async (req, res) => {
    let role=productFacade.getRole(req.headers.authorization)
    try {
      let ProSql = "SELECT product_id,name,price,discount FROM products";
      let conditions = [];

      if (role == "user") {
        conditions.push("status='con-hang'");
      }

      if (req.query.sort) {
        switch (req.query.sort) {
          case "gio-trai-cay":
            conditions.push("category=1");
            break;
          case "trai-cay":
            conditions.push("category=2");
            break;
          case "rau-cu":
            conditions.push("category=3");
            break;
        }
      }
      if (conditions.length > 0) {
        ProSql += " WHERE " + conditions.join(" AND ");
      }
      ProSql += " ORDER BY product_id DESC";

      let [products] = await db.promise().query(ProSql);

      const ImgSql = "SELECT product_id,image_url FROM product_images";
      let [images] = await db.promise().query(ImgSql);

      const Products=productFacade.getProducts(products,images);
      return res.status(200).json(Products);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  productsAll: async (req, res) => {
    try {
      let ProSql = "SELECT product_id,name,price,stock,discount,sold FROM products";
      let conditions = [];

      if (req.query.sort) {
        switch (req.query.sort) {
          case "gio-trai-cay":
            conditions.push("category=1");
            break;
          case "trai-cay":
            conditions.push("category=2");
            break;
          case "rau-cu":
            conditions.push("category=3");
            break;
        }
      }
      if (conditions.length > 0) {
        ProSql += " WHERE " + conditions.join(" AND ");
      }
      ProSql += " ORDER BY product_id DESC";

      let [products] = await db.promise().query(ProSql);

      const ImgSql = "SELECT product_id,image_url FROM product_images";
      let [images] = await db.promise().query(ImgSql);

      const Products=productFacade.getProducts(products,images);
      return res.status(200).json(Products);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  findProduct: async (req, res) => {
    let role=productFacade.getRole(req.headers.authorization)
    try {
      let ProSql = "SELECT * FROM products WHERE name LIKE ?";
      if (role == "user") {
        ProSql += " AND status='con-hang'";
      }
      ProSql += " ORDER BY product_id DESC";
      let [products] = await db
        .promise()
        .query(ProSql, [`%${req.params.product}%`]);

      const ImgSql = "SELECT * FROM product_images";
      let [images] = await db.promise().query(ImgSql);

      const Products=productFacade.getProducts(products,images);
      return res.status(200).json(Products);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  categories: async (req, res) => {
    try {
      const CateSql = "SELECT * FROM categories";
      let [categories] = await db.promise().query(CateSql);

      // Set proper content type with charset
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(200).json(categories);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  edit1: async (req, res) => {
    const connection = await db.promise().getConnection();
    const product_id = req.params.product_id;

    try {
      await connection.beginTransaction();

      if (
        !req.files ||
        (req.files["images"] && req.files["images"].length === 0)
      ) {
        return res
          .status(400)
          .json({ message: "Vui lòng tải ít nhất một ảnh!" });
      }
      // Tạo product từ Factory
      const product = productFacade.create({
        name: req.body.name,
        price: req.body.price,
        category: req.body.category,
        stock: req.body.stock,
        status: req.body.status,
        details: req.body.details,
        discount: req.body.discount,
        mainImage: req.files["mainImage"]
          ? req.files["mainImage"][0].path
          : null,
        images: req.files["images"]?.map((file) => file.path) || [],
      });
      // --- Cập nhật sản phẩm ---
      const updateProSql =
        "UPDATE products SET name=?, description=?, price=?, stock=?, category=?, status=?,discount=? WHERE product_id=?";
      await connection.query(updateProSql, [
        product.name,
        product.details,
        product.price,
        product.stock,
        product.category,
        product.status,
        product.discount,
        product_id,
      ]);

      // --- Lấy danh sách ảnh cũ từ DB ---
      const getOldImagesSql =
        "SELECT image_url FROM product_images WHERE product_id = ?";
      const [oldImages] = await connection.query(getOldImagesSql, [product_id]);

      // --- Xóa ảnh cũ trên Cloudinary ---
      for (const img of oldImages) {
        const public_id = productFacade.extractPublicIdFromUrl(img.image_url);

        try {
          const result = await cloudinary.uploader.destroy(public_id);
          console.log("Kết quả xóa ảnh từ Cloudinary:", result);
        } catch (error) {
          console.error("Lỗi khi xóa ảnh Cloudinary:", error);
        }
      }

      // --- Xóa ảnh cũ khỏi bảng product_images ---
      await connection.query(
        "DELETE FROM product_images WHERE product_id = ?",
        [product_id]
      );

      // --- Thêm ảnh mới ---
      const newImgValues = product
        .getAllImages()
        .map((url) => [product_id, url]);
      await connection.query(
        "INSERT INTO product_images (product_id, image_url) VALUES ?",
        [newImgValues]
      );

      await connection.commit();
      connection.release();
      return res.status(200).json({ message: "Cập nhật thành công!" });
    } catch (err) {
      await connection.rollback();
      connection.release();
      console.error(err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  edit2: async (req, res) => {
    const connection = await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      const product_id = req.params.product_id;

      // Dùng Factory để tạo đối tượng sản phẩm
      const product = productFacade.create(req.body);
      const updateProSql =
        "UPDATE products SET name=?, description=?, price=?, stock=?, category=?, status=?,discount=? WHERE product_id=?";
      await connection.query(updateProSql, [
        product.name,
        product.details,
        product.price,
        product.stock,
        product.category,
        product.status,
        product.discount,
        product_id,
      ]);

      await connection.commit();
      connection.release();

      return res.status(201).json({
        message: "Cập nhật thành công!",
      });
    } catch (error) {
      await connection.rollback();
      connection.release();

      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  delete: async (req, res) => {
    const product_id = req.params.product_id;
    const conn = await db.promise().getConnection();
    try {
      const token = req.headers.authorization;
      const checkResult = await productFacade.checkIfProductCanBeDeleted(
        product_id,
        token
      );
      if (!checkResult.canDelete) {
        return res.status(400).json({ message: checkResult.message });
      }

      // Bắt đầu transaction
      await conn.beginTransaction();

      // Lấy thông tin ảnh từ DB
    const oldImages = await productFacade.getProductImages(product_id, conn);

      // Xóa ảnh trên Cloudinary
      for (const img of oldImages) {
        const public_id = productFacade.extractPublicIdFromUrl(img.image_url);

        try {
          const result = await cloudinary.uploader.destroy(public_id);
          if (result.result === "ok") {
            console.log(`Đã xóa ảnh: ${public_id}`);
          } else {
            console.log(`Không thể xóa ảnh: ${public_id}`);
          }
        } catch (error) {
          console.log(`Lỗi xóa ảnh trên Cloudinary: ${error}`);
        }
      }

      // Xóa ảnh khỏi bảng product_image
      await conn.query("DELETE FROM product_images WHERE product_id = ?", [
        product_id,
      ]);

      // Xóa sản phẩm
      await conn.query("DELETE FROM products WHERE product_id = ?", [
        product_id,
      ]);

      // Commit transaction
      await conn.commit();
      return res.status(200).json({ message: "Xóa thành công!" });
    } catch (error) {
      await conn.rollback(); // Rollback nếu lỗi
      console.error("Lỗi server:", error);
      return res.status(500).json({ message: "Lỗi server!" });
    } finally {
      conn.release(); // Giải phóng kết nối
    }
  },

  random: async (req, res) => {
    const product_id = req.params.product_id;
    try {
      const randomProSql =
        "SELECT * FROM products WHERE product_id != ? AND status='con-hang' ORDER BY RAND() LIMIT 10";
      const [products] = await db.promise().query(randomProSql, [product_id]);

      const ImgSql = "SELECT * FROM product_images WHERE product_id !=?";
      let [images] = await db.promise().query(ImgSql, [product_id]);

      const Products=productFacade.getProducts(products,images);
      return res.status(200).json(Products);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  category: async (req, res) => {
    const category = req.params.category;
    try {
      const randomProSql =
        "SELECT * FROM products WHERE status='con-hang' AND category=?";
      const [products] = await db.promise().query(randomProSql, [category]);

      const ImgSql = "SELECT * FROM product_images";
      let [images] = await db.promise().query(ImgSql);

      const Products=productFacade.getProducts(products,images);
      return res.status(200).json(Products);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  top: async (req, res) => {
    try {
      const topProSql =
        "SELECT * FROM products WHERE status='con-hang' ORDER BY sold DESC";
      const [products] = await db.promise().query(topProSql);

      const ImgSql = "SELECT * FROM product_images";
      let [images] = await db.promise().query(ImgSql);

      const Products=productFacade.getProducts(products,images);
      return res.status(200).json(Products);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  orderAdd: async (req, res) => {
    const connection = await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      const stockChangeValues = req.body;
      const updateOrderSql = `
            UPDATE products
            SET 
                stock = CASE 
                    ${stockChangeValues
                      .map(
                        ([id, qty]) =>
                          `WHEN product_id = ${id} THEN stock - ${qty}`
                      )
                      .join(" ")}
                END,
                sold = CASE 
                    ${stockChangeValues
                      .map(
                        ([id, qty]) =>
                          `WHEN product_id = ${id} THEN sold + ${qty}`
                      )
                      .join(" ")}
                END,
                status = CASE 
                    ${stockChangeValues
                      .map(
                        ([id]) =>
                          `WHEN product_id = ${id} AND stock - ${
                            stockChangeValues.find((v) => v[0] === id)[1]
                          } <= 0 THEN 'het-hang'`
                      )
                      .join(" ")}
                      ELSE status
                END
            WHERE product_id IN (${stockChangeValues
              .map(([id]) => id)
              .join(",")});
        `;

      await connection.query(updateOrderSql, []);
      await connection.commit();
      connection.release();

      res.status(200).json({ message: "Stock updated successfully!" });
    } catch (error) {
      await connection.rollback();
      connection.release();

      console.error("Error updating stock:", error);
      res.status(500).json({ message: "Server error!" });
    }
  },
  
  orderAbort: async (req, res) => {
    const connection = await db.promise().getConnection();
    try {
      await connection.beginTransaction();

      const stockChangeValues = req.body;
      const updateOrderSql = `
          UPDATE products
          SET 
              stock = CASE 
                  ${stockChangeValues
                    .map(
                      ([id, qty]) =>
                        `WHEN product_id = ${id} THEN stock + ${qty}`
                    )
                    .join(" ")}
              END,
              sold = CASE 
                  ${stockChangeValues
                    .map(
                      ([id, qty]) =>
                        `WHEN product_id = ${id} THEN sold - ${qty}`
                    )
                    .join(" ")}
              END,
              status = CASE 
                  ${stockChangeValues
                    .map(
                      ([id]) =>
                        `WHEN product_id = ${id} AND stock + ${
                          stockChangeValues.find((v) => v[0] === id)[1]
                        } > 0 THEN 'con-hang'`
                    )
                    .join(" ")}
                    ELSE status
              END
          WHERE product_id IN (${stockChangeValues
            .map(([id]) => id)
            .join(",")});
      `;

      await connection.query(updateOrderSql, []);
      await connection.commit();
      connection.release();

      res.status(200).json({ message: "Stock updated successfully!" });
    } catch (error) {
      await connection.rollback();
      connection.release();

      console.error("Error updating stock:", error);
      res.status(500).json({ message: "Server error!" });
    }
  },
};
