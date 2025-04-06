const db = require("../config/mysql");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
module.exports = {
  upload: async (req, res) => {
    const connection = await db.promise().getConnection();
    try {
      await connection.beginTransaction(); // Bắt đầu transaction

      // Kiểm tra nếu không có file nào được tải lên
      if (
        !req.files ||
        (req.files["images"] && req.files["images"].length === 0)
      ) {
        return res
          .status(400)
          .json({ message: "Vui lòng tải ít nhất một ảnh!" });
      }

      // Lấy thông tin từ body request
      const { name, price, category, stock, status, details } = req.body;

      // Xử lý ảnh chính (mainImage) và lấy URL của ảnh từ Cloudinary
      const mainImage = req.files["mainImage"]
        ? req.files["mainImage"][0].path // Đảm bảo ảnh chính có URL Cloudinary
        : null;

      // Xử lý các ảnh phụ (images) và lấy URL của các ảnh từ Cloudinary
      const uploadedImages = req.files["images"]
        ? req.files["images"].map((file) => file.path) // Đảm bảo các ảnh phụ có URL Cloudinary
        : [];

      // Thêm ảnh chính vào đầu danh sách ảnh phụ nếu có
      if (mainImage) {
        uploadedImages.unshift(mainImage);
      }

      // Insert thông tin sản phẩm vào bảng product
      const newProSql =
        "INSERT INTO products (name, description, price, stock, category, status) VALUES (?, ?, ?, ?, ?,?)";
      const [proResult] = await connection.query(newProSql, [
        name,
        details,
        price,
        stock,
        category,
        status,
      ]);
      const productId = proResult.insertId;

      // Insert danh sách URL ảnh vào bảng product_image
      const values = uploadedImages.map((url) => [productId, url]);
      const newImgSql =
        "INSERT INTO product_images (product_id, image_url) VALUES ?";
      await connection.query(newImgSql, [values]);

      // Commit transaction và trả kết quả thành công
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
      const ProSql = "SELECT * FROM products WHERE product_id =?";
      let [products] = await db.promise().query(ProSql, [product_id]);

      const ImgSql = "SELECT * FROM product_images WHERE product_id =?";
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
        const response = await axios.get("http://account-service:3001/admin", {
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
      let ProSql = "SELECT product_id,name,price FROM products";
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
        const response = await axios.get("http://account-service:3001/admin", {
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
      let ProSql = "SELECT product_id,name,price,stock FROM products";
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
        const response = await axios.get("http://account-service:3001/admin", {
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
      const CateSql = "SELECT * FROM categories";
      let [categories] = await db.promise().query(CateSql);

      // Set proper content type with charset
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
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
  
      const uploadedImages = [];
  
      if (req.files["mainImage"]) {
        uploadedImages.push(req.files["mainImage"][0].path); // Đường dẫn Cloudinary
      }
  
      if (req.files["images"]) {
        req.files["images"].forEach((file) => {
          uploadedImages.push(file.path); // Đường dẫn Cloudinary
        });
      }
  
      // --- Cập nhật sản phẩm ---
      const updateProSql =
        "UPDATE products SET name=?, description=?, price=?, stock=?, category=?, status=? WHERE product_id=?";
      await connection.query(updateProSql, [
        name,
        details,
        price,
        stock,
        category,
        status,
        product_id,
      ]);
  
      // --- Lấy danh sách ảnh cũ từ DB ---
      const getOldImagesSql =
        "SELECT image_url FROM product_images WHERE product_id = ?";
      const [oldImages] = await connection.query(getOldImagesSql, [product_id]);
  
      // --- Xóa ảnh cũ trên Cloudinary ---
      for (const img of oldImages) {
        const imageUrl = img.image_url;
  
        const match = imageUrl.match(/\/uploads\/(.+?)\./);
        const public_id = match ? `uploads/${match[1]}` : null;
  
        if (!public_id) {
          console.log(`Không thể trích xuất public_id từ URL: ${imageUrl}`);
          continue;
        }
  
        try {
          const result = await cloudinary.uploader.destroy(public_id);
          console.log("Kết quả xóa ảnh từ Cloudinary:", result);
  
          if (result.result === "ok") {
            console.log(`Đã xóa ảnh: ${public_id}`);
          } else {
            console.log(`Không thể xóa ảnh: ${public_id}`);
          }
        } catch (error) {
          console.log(`Lỗi xóa ảnh trên Cloudinary: ${error}`);
          await connection.rollback();
          connection.release();
          return res.status(500).json({ message: "Lỗi khi xóa ảnh Cloudinary" });
        }
      }
  
      // --- Xóa ảnh cũ khỏi DB ---
      const deleteImgSql = "DELETE FROM product_images WHERE product_id=?";
      await connection.query(deleteImgSql, [product_id]);
  
      // --- Thêm ảnh mới vào DB ---
      const values = uploadedImages.map((url) => [product_id, url]);
      const newImgSql =
        "INSERT INTO product_images (product_id, image_url) VALUES ?";
      await connection.query(newImgSql, [values]);
  
      // --- Commit ---
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
        "UPDATE products SET name=?, description=?, price=?, stock=?, category=?, status=? WHERE product_id=?";
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
    const conn = await db.promise().getConnection();
    try {
      const token = req.headers.authorization;
      const response = await axios.get("http://buy-service:3003/orders", {
        headers: { Authorization: `${token}` },
      });
  
      const isProductOrdered = response.data.orderItems.some(
        (item) => item.product_id == product_id
      );
  
      if (isProductOrdered) {
        return res.status(400).json({ message: "Sản phẩm đã được mua!" });
      }
  
      // Bắt đầu transaction
      await conn.beginTransaction();
  
      // Lấy thông tin ảnh từ DB
      const getImagesSql = "SELECT image_url FROM product_images WHERE product_id = ?";
      const [oldImages] = await conn.query(getImagesSql, [product_id]);
  
      // Xóa ảnh trên Cloudinary
      for (const img of oldImages) {
        const imageUrl = img.image_url;
        const match = imageUrl.match(/\/uploads\/(.+?)\./);
        const public_id = match ? `uploads/${match[1]}` : null;
  
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
      await conn.query("DELETE FROM product_images WHERE product_id = ?", [product_id]);
  
      // Xóa sản phẩm
      await conn.query("DELETE FROM products WHERE product_id = ?", [product_id]);
  
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
        "SELECT * FROM products WHERE status='con-hang' AND category=?";
      const [products] = await db.promise().query(randomProSql, [category]);

      const ImgSql = "SELECT * FROM product_images";
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
        "SELECT * FROM products WHERE status='con-hang' ORDER BY sold";
      const [products] = await db.promise().query(topProSql);

      const ImgSql = "SELECT * FROM product_images";
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
        "SELECT * FROM products WHERE status='con-hang' ORDER BY sold DESC LIMIT 5";
      const [products] = await db.promise().query(topProSql);

      const ImgSql = "SELECT * FROM product_images";
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
