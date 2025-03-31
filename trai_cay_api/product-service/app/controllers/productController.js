const db = require("../config/mysql");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
module.exports = {
  upload: async (req, res) => {
    const connection = await db.promise().getConnection(); // Lấy kết nối
    try {
      await connection.beginTransaction(); // Bắt đầu transaction

      if (
        !req.files ||
        (req.files["images"] && req.files["images"].length === 0)
      ) {
        return res
          .status(400)
          .json({ message: "Vui lòng tải ít nhất một ảnh!" });
      }

      const { name, price, category, stock, status, details } = req.body;

      const mainImage = req.files["mainImage"]
        ? `/uploads/${req.files["mainImage"][0].filename}`
        : null;

      const uploadedImages = req.files["images"]
        ? req.files["images"].map((file) => `/uploads/${file.filename}`)
        : [];

      if (mainImage) {
        uploadedImages.unshift(mainImage);
      }

      const newProSql =
        "INSERT INTO product (name, description, price, stock, category, status) VALUES (?, ?, ?, ?, ?,?)";
      const [proResult] = await connection.query(newProSql, [
        name,
        details,
        price,
        stock,
        category,
        status,
      ]);
      const productId = proResult.insertId;

      const values = uploadedImages.map((path) => [productId, path]);
      const newImgSql =
        "INSERT INTO product_image (product_id, image_url) VALUES ?";
      await connection.query(newImgSql, [values]);

      await connection.commit();
      connection.release();

      return res.status(201).json({ message: "Đăng thành công!" });
    } catch (error) {
      await connection.rollback();
      connection.release();

      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },
  product: async (req, res) => {
    const product_id = req.params.product_id;
    try {
      const ProSql = "SELECT * FROM product WHERE product_id =?";
      let [products] = await db.promise().query(ProSql, [product_id]);

      const ImgSql = "SELECT * FROM product_image WHERE product_id =?";
      let [images] = await db.promise().query(ImgSql, [product_id]);

      const productMap = {};
      images.forEach((image) => {
        const productId = image.product_id;
        if (!productMap[productId]) {
          productMap[productId] = { images: [], mainImg: null };
        }

        if (image.image_url.includes("/uploads/main")) {
          productMap[productId].mainImg = image.image_url;
        } else {
          productMap[productId].images.push(image);
        }
      });

      // Kết hợp sản phẩm với danh sách ảnh và ảnh chính
      const Products = products.map((product) => ({
        ...product,
        mainImg: productMap[product.product_id]?.mainImg || null,
        images:
          productMap[product.product_id]?.images.map((img) => img.image_url) ||
          [],
      }));
      return res.status(200).json(Products);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  products: async (req, res) => {
    let role = "user";
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization;
        const response = await axios.get("http://localhost:3001/admin", {
          headers: { Authorization: `${token}` },
        });
        if (response.status != 401 || response.status != 403) {
          role = "admin";
        }
      } catch (e) {
        console.error("Lỗi server:", e.response ? e.response.data : e.message);
      }
    }
    try {
      let ProSql = "SELECT product_id,name,price FROM product";
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

      const ImgSql = "SELECT product_id,image_url FROM product_image";
      let [images] = await db.promise().query(ImgSql);

      const productMap = {};
      images.forEach((image) => {
        const productId = image.product_id;
        if (!productMap[productId]) {
          productMap[productId] = { mainImg: null };
        }

        if (image.image_url.includes("/uploads/main")) {
          productMap[productId].mainImg = image.image_url;
        }
      });

      // Kết hợp sản phẩm với danh sách ảnh và ảnh chính
      const Products = products.map((product) => ({
        ...product,
        mainImg: productMap[product.product_id]?.mainImg || null,
        images: productMap[product.product_id]?.images || [],
      }));
      return res.status(200).json(Products);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  productsAll: async (req, res) => {
    let role = "user";
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization;
        const response = await axios.get("http://localhost:3001/admin", {
          headers: { Authorization: `${token}` },
        });
        if (response.status != 401 || response.status != 403) {
          role = "admin";
        }
      } catch (e) {
        console.error("Lỗi server:", e.response ? e.response.data : e.message);
      }
    }
    try {
      let ProSql = "SELECT product_id,name,price,stock FROM product";
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

      const ImgSql = "SELECT product_id,image_url FROM product_image";
      let [images] = await db.promise().query(ImgSql);

      const productMap = {};
      images.forEach((image) => {
        const productId = image.product_id;
        if (!productMap[productId]) {
          productMap[productId] = { mainImg: null };
        }

        if (image.image_url.includes("/uploads/main")) {
          productMap[productId].mainImg = image.image_url;
        }
      });

      // Kết hợp sản phẩm với danh sách ảnh và ảnh chính
      const Products = products.map((product) => ({
        ...product,
        mainImg: productMap[product.product_id]?.mainImg || null,
        images: productMap[product.product_id]?.images || [],
      }));
      return res.status(200).json(Products);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  findProduct: async (req, res) => {
    let role = "user";
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization;
        const response = await axios.get("http://localhost:3001/admin", {
          headers: { Authorization: `${token}` },
        });
        if (response.status != 401 || response.status != 403) {
          role = "admin";
        }
      } catch (e) {
        console.error("Lỗi server:", e.response ? e.response.data : e.message);
      }
    }
    try {
      let ProSql = "SELECT * FROM product WHERE name LIKE ?";
      if (role == "user") {
        ProSql += " AND status='con-hang'";
      }
      ProSql += " ORDER BY product_id DESC";
      let [products] = await db
        .promise()
        .query(ProSql, [`%${req.params.product}%`]);

      const ImgSql = "SELECT * FROM product_image";
      let [images] = await db.promise().query(ImgSql);

      const productMap = {};
      images.forEach((image) => {
        const productId = image.product_id;
        if (!productMap[productId]) {
          productMap[productId] = { images: [], mainImg: null };
        }

        if (image.image_url.includes("/uploads/main")) {
          productMap[productId].mainImg = image.image_url;
        } else {
          productMap[productId].images.push(image);
        }
      });

      // Kết hợp sản phẩm với danh sách ảnh và ảnh chính
      const Products = products.map((product) => ({
        ...product,
        mainImg: productMap[product.product_id]?.mainImg || null,
        images: productMap[product.product_id]?.images || [],
      }));
      return res.status(200).json(Products);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  categories: async (req, res) => {
    try {
      const CateSql = "SELECT * FROM category";
      let [categories] = await db.promise().query(CateSql);

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

      const { name, price, category, stock, status, details } = req.body;
      const mainImage = req.files["mainImage"]
        ? `/uploads/${req.files["mainImage"][0].filename}`
        : null;

      const uploadedImages = req.files["images"]
        ? req.files["images"].map((file) => `/uploads/${file.filename}`)
        : [];

      if (mainImage) {
        uploadedImages.unshift(mainImage);
      }

      const updateProSql =
        "UPDATE product SET name=?, description=?, price=?, stock=?, category=?, status=? WHERE product_id=?";
      await connection.query(updateProSql, [
        name,
        details,
        price,
        stock,
        category,
        status,
        product_id,
      ]);

      // Lấy danh sách ảnh cũ
      const getOldImagesSql =
        "SELECT image_url FROM product_image WHERE product_id = ?";
      const [oldImages] = await connection.query(getOldImagesSql, [product_id]);

      // Xóa ảnh cũ khỏi thư mục uploads
      oldImages.forEach((img) => {
        const filePath = path.join(__dirname, "../../", img.image_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Đã xóa: ${filePath}`);
        } else {
          console.log(`Không tìm thấy ảnh: ${filePath}`);
        }
      });

      // Xóa ảnh cũ khỏi database
      const deleteImgSql = "DELETE FROM product_image WHERE product_id=?";
      await connection.query(deleteImgSql, [product_id]);

      // Thêm ảnh mới vào database
      const values = uploadedImages.map((path) => [product_id, path]);
      const newImgSql =
        "INSERT INTO product_image (product_id, image_url) VALUES ?";
      await connection.query(newImgSql, [values]);

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

  edit2: async (req, res) => {
    const connection = await db.promise().getConnection(); // Lấy kết nối

    try {
      await connection.beginTransaction(); // Bắt đầu transaction

      const product_id = req.params.product_id;
      const { name, price, category, stock, status, details } = req.body;

      const updateProSql =
        "UPDATE product SET name=?, description=?, price=?, stock=?, category=?, status=? WHERE product_id=?";
      await connection.query(updateProSql, [
        name,
        details,
        price,
        stock,
        category,
        status,
        product_id,
      ]);

      await connection.commit(); // Commit nếu thành công
      connection.release(); // Giải phóng kết nối

      return res.status(201).json({
        message: "Cập nhật thành công!",
      });
    } catch (error) {
      await connection.rollback(); // Rollback nếu có lỗi
      connection.release(); // Giải phóng kết nối

      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  delete: async (req, res) => {
    const product_id = req.params.product_id;
    try {
      //Xóa ảnh
      const getImagesSql =
        "SELECT image_url FROM product_image WHERE product_id = ?";
      const [oldImages] = await db.promise().query(getImagesSql, [product_id]);

      oldImages.forEach((img) => {
        const filePath = path.join(__dirname, "../../", img.image_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Đã xóa: ${filePath}`);
        } else {
          console.log(`Không tìm thấy ảnh: ${filePath}`);
        }
      });

      const deleteProSql = "DELETE FROM product WHERE product_id=?";
      await db.promise().query(deleteProSql, [product_id]);
      return res.status(200).json({ message: "Xóa thành công!" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  random: async (req, res) => {
    const product_id = req.params.product_id;
    try {
      const randomProSql =
        "SELECT * FROM product WHERE product_id != ? AND status='con-hang' ORDER BY RAND() LIMIT 10";
      const [products] = await db.promise().query(randomProSql, [product_id]);

      const ImgSql = "SELECT * FROM product_image WHERE product_id !=?";
      let [images] = await db.promise().query(ImgSql, [product_id]);

      const productMap = {};
      images.forEach((image) => {
        const productId = image.product_id;
        if (!productMap[productId]) {
          productMap[productId] = { images: [], mainImg: null };
        }

        if (image.image_url.includes("/uploads/main")) {
          productMap[productId].mainImg = image.image_url;
        } else {
          productMap[productId].images.push(image);
        }
      });

      // Kết hợp sản phẩm với danh sách ảnh và ảnh chính
      const Products = products.map((product) => ({
        ...product,
        mainImg: productMap[product.product_id]?.mainImg || null,
        images:
          productMap[product.product_id]?.images.map((img) => img.image_url) ||
          [],
      }));
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
        "SELECT * FROM product WHERE status='con-hang' AND category=?";
      const [products] = await db.promise().query(randomProSql, [category]);

      const ImgSql = "SELECT * FROM product_image";
      let [images] = await db.promise().query(ImgSql);

      const productMap = {};
      images.forEach((image) => {
        const productId = image.product_id;
        if (!productMap[productId]) {
          productMap[productId] = { images: [], mainImg: null };
        }

        if (image.image_url.includes("/uploads/main")) {
          productMap[productId].mainImg = image.image_url;
        } else {
          productMap[productId].images.push(image);
        }
      });

      // Kết hợp sản phẩm với danh sách ảnh và ảnh chính
      const Products = products.map((product) => ({
        ...product,
        mainImg: productMap[product.product_id]?.mainImg || null,
      }));
      return res.status(200).json(Products);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  top: async (req, res) => {
    try {
      const topProSql =
        "SELECT * FROM product WHERE status='con-hang' ORDER BY sold";
      const [products] = await db.promise().query(topProSql);

      const ImgSql = "SELECT * FROM product_image";
      let [images] = await db.promise().query(ImgSql);

      const productMap = {};
      images.forEach((image) => {
        const productId = image.product_id;
        if (!productMap[productId]) {
          productMap[productId] = { images: [], mainImg: null };
        }

        if (image.image_url.includes("/uploads/main")) {
          productMap[productId].mainImg = image.image_url;
        } else {
          productMap[productId].images.push(image);
        }
      });

      // Kết hợp sản phẩm với danh sách ảnh và ảnh chính
      const Products = products.map((product) => ({
        ...product,
        mainImg: productMap[product.product_id]?.mainImg || null,
      }));
      return res.status(200).json(Products);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  home: async (req, res) => {
    try {
      const topProSql =
        "SELECT * FROM product WHERE status='con-hang' ORDER BY sold DESC LIMIT 5";
      const [products] = await db.promise().query(topProSql);

      const ImgSql = "SELECT * FROM product_image";
      let [images] = await db.promise().query(ImgSql);

      const productMap = {};
      images.forEach((image) => {
        const productId = image.product_id;
        if (!productMap[productId]) {
          productMap[productId] = { images: [], mainImg: null };
        }

        if (image.image_url.includes("/uploads/main")) {
          productMap[productId].mainImg = image.image_url;
        } else {
          productMap[productId].images.push(image);
        }
      });

      // Kết hợp sản phẩm với danh sách ảnh và ảnh chính
      const Products = products.map((product) => ({
        ...product,
        mainImg: productMap[product.product_id]?.mainImg || null,
      }));
      // Chia sản phẩm theo danh mục (category)
      const categorizedProducts = {};
      Products.forEach((product) => {
        const category = product.category || "Uncategorized"; // Đề phòng nếu category bị null
        if (!categorizedProducts[category]) {
          categorizedProducts[category] = [];
        }
        categorizedProducts[category].push(product);
      });

      return res.status(200).json(categorizedProducts);
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
            UPDATE product
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
          UPDATE product
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
