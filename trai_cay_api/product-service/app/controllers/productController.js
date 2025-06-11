const db = require("../config/mysql");
const productFacade = require("../facade/productFacade");
const ProductRepository = require("../repositories/productRepository");

module.exports = {
  upload: async (req, res) => {
    const connection = await db.promise().getConnection();
    const productRepo = new ProductRepository(connection);
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

      const productId = await productRepo.createProduct(product);
      await productRepo.addProductImages(productId, product.getAllImages());

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
    const connection = await db.promise().getConnection();
    const productRepo = new ProductRepository(connection);

    try {
      const productWithImages = await productRepo.getProductWithImages(
        product_id
      );
      if (!productWithImages) {
        connection.release();
        return res.status(404).json({ message: "Product not found" });
      }

      const result = {
        ...productWithImages,
        mainImg:
          productWithImages.images.find(
            (img) =>
              img.image_url.includes("/main") ||
              img.image_url.match(/\/main(-|_|\.)?/i)
          )?.image_url || null,
        images: productWithImages.images
          .filter(
            (img) =>
              !img.image_url.includes("/main") &&
              !img.image_url.match(/\/main(-|_|\.)?/i)
          )
          .map((img) => img.image_url),
        afterDiscount: Math.round(
          productWithImages.price * (1 - productWithImages.discount / 100)
        ),
      };

      connection.release();
      return res.status(200).json([result]);
    } catch (error) {
      connection.release();
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  products: async (req, res) => {
    const connection = await db.promise().getConnection();
    const productRepo = new ProductRepository(connection);

    try {
      const role = productFacade.getRole(req.headers.authorization);

      const { products, images } = await productRepo.getProductsWithImages({
        role,
        sort: req.query.sort,
      });

      const Products = productFacade.getProducts(products, images);

      connection.release();
      return res.status(200).json(Products);
    } catch (error) {
      connection.release();
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  productsAll: async (req, res) => {
    const connection = await db.promise().getConnection();
    const productRepo = new ProductRepository(connection);

    try {
      const { products, images } = await productRepo.getAllProductsDetailed({
        sort: req.query.sort,
      });

      const Products = productFacade.getProducts(products, images);

      connection.release();
      return res.status(200).json(Products);
    } catch (error) {
      connection.release();
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  findProduct: async (req, res) => {
    const connection = await db.promise().getConnection();
    const productRepo = new ProductRepository(connection);
    const role = productFacade.getRole(req.headers.authorization);

    try {
      const { products, images } = await productRepo.searchProducts(
        req.params.product,
        { role }
      );

      const Products = productFacade.getProducts(products, images);

      connection.release();
      return res.status(200).json(Products);
    } catch (error) {
      connection.release();
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
    const productRepo = new ProductRepository(connection);
    const productId = req.params.product_id;

    try {
      if (
        !req.files ||
        (req.files["images"] && req.files["images"].length === 0)
      ) {
        connection.release();
        return res
          .status(400)
          .json({ message: "Vui lòng tải ít nhất một ảnh!" });
      }

      // Create product Factory
      const product = productFacade.create({
        name: req.body.name,
        price: req.body.price,
        category: req.body.category,
        stock: req.body.stock,
        status: req.body.status,
        details: req.body.details,
        discount: req.body.discount,
        mainImage: req.files["mainImage"]?.[0]?.path || null,
        images: req.files["images"]?.map((f) => f.path) || [],
      });

      await productRepo.fullProductUpdate(productId, product, {
        mainImage: product.getMainImage(),
        images: product.getAdditionalImages(),
      });

      connection.release();
      return res.status(200).json({ message: "Cập nhật thành công!" });
    } catch (err) {
      connection.release();
      console.error(err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  edit2: async (req, res) => {
    const connection = await db.promise().getConnection();
    const productRepo = new ProductRepository(connection);
    const productId = req.params.product_id;

    try {
      const product = productFacade.create(req.body);

      const updated = await productRepo.updateProduct(productId, product);
      if (!updated) {
        connection.release();
        return res.status(404).json({ message: "Sản phẩm không tồn tại" });
      }

      connection.release();
      return res.status(200).json({ message: "Cập nhật thành công!" });
    } catch (error) {
      connection.release();
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  delete: async (req, res) => {
    const productId = req.params.product_id;
    const connection = await db.promise().getConnection();
    const productRepo = new ProductRepository(connection);

    try {
      const checkResult = await productRepo.checkDeletePermission(
        productId,
        req.headers.authorization
      );

      if (!checkResult) {
        connection.release();
        return res.status(403).json({
          success: false,
          message: "Không có quyền xóa sản phẩm hoặc sản phẩm đã được bán.",
        });
      }

      const deleted = await productRepo.deleteProduct(productId);

      if (!deleted) {
        connection.release();
        return res.status(404).json({ message: "Sản phẩm không tồn tại" });
      }

      connection.release();
      return res.status(200).json({ message: "Xóa thành công!" });
    } catch (error) {
      connection.release();
      console.error("Lỗi server:", error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  random: async (req, res) => {
    const connection = await db.promise().getConnection();
    const productRepo = new ProductRepository(connection);

    try {
      const product_id = req.params.product_id;

      const products = await productRepo.getRandomProducts(product_id);

      const productIds = products.map((p) => p.product_id);
      const images =
        productIds.length > 0
          ? await productRepo.getImagesForProducts(productIds)
          : [];

      const Products = productFacade.getProducts(products, images);

      return res.status(200).json(Products);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Lỗi server!" });
    } finally {
      connection.release();
    }
  },

  category: async (req, res) => {
    const connection = await db.promise().getConnection();
    const productRepo = new ProductRepository(connection);

    try {
      const category = req.params.category;

      const products = await productRepo.getProductsByCategory(category);

      const productIds = products.map((p) => p.product_id);
      const images =
        productIds.length > 0
          ? await productRepo.getImagesForProducts(productIds)
          : [];

      const Products = productFacade.getProducts(products, images);

      return res.status(200).json(Products);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Lỗi server!" });
    } finally {
      connection.release();
    }
  },

  top: async (req, res) => {
    const connection = await db.promise().getConnection();
    const productRepo = new ProductRepository(connection);

    try {
      const products = await productRepo.getTopProducts();

      const images = await productRepo.getAllProductImages();

      const Products = productFacade.getProducts(products, images);

      return res.status(200).json(Products);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Lỗi server!" });
    } finally {
      connection.release();
    }
  },
  discount: async (req, res) => {
    const connection = await db.promise().getConnection();
    const productRepo = new ProductRepository(connection);
    try {
      const products = await productRepo.getDiscountProducts();
      const images = await productRepo.getAllProductImages();
      const Products = productFacade.getProducts(products, images);
      return res.status(200).json(Products);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Lỗi server!" });
    } finally {
      connection.release();
    }
  },

  orderAdd: async (req, res) => {
    const connection = await db.promise().getConnection();
    const productRepo = new ProductRepository(connection);

    try {
      await connection.beginTransaction();
      await productRepo.processOrder(req.body);
      await connection.commit();
      connection.release();

      res.status(200).json({ message: "Cập nhật tồn kho thành công!" });
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error("Lỗi khi cập nhật tồn kho:", error);
      res.status(500).json({ message: "Server error!" });
    }
  },

  orderAbort: async (req, res) => {
    const connection = await db.promise().getConnection();
    const productRepo = new ProductRepository(connection);

    try {
      await connection.beginTransaction();
      await productRepo.revertOrder(req.body);
      await connection.commit();
      connection.release();

      res.status(200).json({ message: "Cập nhật tồn kho thành công!" });
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error("Lỗi khi cập nhật tồn kho:", error);
      res.status(500).json({ message: "Server error!" });
    }
  },
};
