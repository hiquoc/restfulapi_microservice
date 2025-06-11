const productFacade = require("../facade/productFacade");
const cloudinary = require("cloudinary").v2;

class ProductRepository {
  constructor(connection) {
    this.connection = connection;
  }

  async createProduct(productData) {
    const sql = `
      INSERT INTO products 
        (name, description, price, stock, category, status) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await this.connection.query(sql, [
      productData.name,
      productData.details,
      productData.price,
      productData.stock,
      productData.category,
      productData.status,
    ]);
    return result.insertId;
  }

  async addProductImages(productId, imageUrls) {
    if (imageUrls.length === 0) return;

    const values = imageUrls.map((url) => [productId, url]);
    const sql = `
      INSERT INTO product_images 
        (product_id, image_url) 
      VALUES ?
    `;
    await this.connection.query(sql, [values]);
  }

  async getProductById(productId) {
    const sql = "SELECT * FROM products WHERE product_id = ?";
    const [rows] = await this.connection.query(sql, [productId]);
    return rows[0] || null;
  }

  async getProductImages(productId) {
    const sql = "SELECT * FROM product_images WHERE product_id = ?";
    const [rows] = await this.connection.query(sql, [productId]);
    return rows;
  }

  async getProductWithImages(productId) {
    const product = await this.getProductById(productId);
    if (!product) return null;
    const images = await this.getProductImages(productId);
    return { ...product, images };
  }

  async getProducts({ role, sort } = {}) {
    let sql = "SELECT product_id, name, price, discount FROM products";
    const conditions = [];

    if (role === "user") {
      conditions.push("status = 'con-hang'");
    }

    if (sort) {
      const categoryMap = {
        "gio-trai-cay": 1,
        "trai-cay": 2,
        "rau-cu": 3,
      };

      if (categoryMap[sort]) {
        conditions.push(`category = ${categoryMap[sort]}`);
      }
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += " ORDER BY product_id DESC";
    const [products] = await this.connection.query(sql);
    return products;
  }

  async getAllProductImages() {
    const sql = "SELECT product_id, image_url FROM product_images";
    const [images] = await this.connection.query(sql);
    return images;
  }
  async getProductsWithImages(options = {}) {
    const products = await this.getProducts(options);
    const images = await this.getAllProductImages();
    return { products, images };
  }
  async getImagesForProducts(productIds) {
    if (productIds.length === 0) return [];
    const [images] = await this.connection.query(
      "SELECT * FROM product_images WHERE product_id IN (?)",
      [productIds]
    );
    return images;
  }

  async getAllProductsDetailed({ sort } = {}) {
    let sql =
      "SELECT product_id, name, price, stock, discount, sold FROM products";
    const conditions = [];

    if (sort) {
      const categoryMap = {
        "gio-trai-cay": 1,
        "trai-cay": 2,
        "rau-cu": 3,
      };

      if (categoryMap[sort]) {
        conditions.push(`category = ${categoryMap[sort]}`);
      }
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += " ORDER BY product_id DESC";
    const [products] = await this.connection.query(sql);
    const images = await this.getAllProductImages();

    return { products, images };
  }

  async searchProducts(searchTerm, { role } = {}) {
    let sql = "SELECT * FROM products WHERE name LIKE ?";
    const params = [`%${searchTerm}%`];

    if (role === "user") {
      sql += " AND status = 'con-hang'";
    }

    sql += " ORDER BY product_id DESC";
    const [products] = await this.connection.query(sql, params);
    const images = await this.getAllProductImages();

    return { products, images };
  }
  async updateProduct(productId, productData) {
    const sql = `
      UPDATE products 
      SET name=?, description=?, price=?, stock=?, 
          category=?, status=?, discount=?
      WHERE product_id=?
    `;
    const [result] = await this.connection.query(sql, [
      productData.name,
      productData.details,
      productData.price,
      productData.stock,
      productData.category,
      productData.status,
      productData.discount,
      productId,
    ]);
    return result.affectedRows > 0;
  }

  async getProductImages(productId) {
    const sql = "SELECT image_url FROM product_images WHERE product_id = ?";
    const [rows] = await this.connection.query(sql, [productId]);
    return rows;
  }

  async deleteProductImages(productId) {
    await this.connection.query(
      "DELETE FROM product_images WHERE product_id = ?",
      [productId]
    );
  }

  async addProductImages(productId, imageUrls) {
    if (imageUrls.length === 0) return;

    const values = imageUrls.map((url) => [productId, url]);
    await this.connection.query(
      "INSERT INTO product_images (product_id, image_url) VALUES ?",
      [values]
    );
  }

  async fullProductUpdate(productId, productData, fileData) {
    await this.connection.beginTransaction();
    try {
      // Update product info
      await this.updateProduct(productId, productData);

      // Handle images if files were uploaded
      if (fileData) {
        // Get old images
        const oldImages = await this.getProductImages(productId);

        // Delete old images from Cloudinary
        for (const img of oldImages) {
          const publicId = productFacade.extractPublicIdFromUrl(img.image_url);
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (error) {
            console.error("Cloudinary delete error:", error);
          }
        }

        // Delete old images from DB
        await this.deleteProductImages(productId);

        // Add new images
        const allImages = [
          ...(fileData.mainImage ? [fileData.mainImage] : []),
          ...(fileData.images || []),
        ];
        await this.addProductImages(productId, allImages);
      }

      await this.connection.commit();
    } catch (error) {
      await this.connection.rollback();
      throw error;
    }
  }
  async checkDeletePermission(productId, token) {
    const product = await this.getProductById(productId);
    if (!product) return false;

    if (Number(product.sold) > 0) {
      return false;
    }

    const role = await productFacade.getRole(token);
    return role === "admin";
  }

  async deleteProduct(productId) {
    await this.connection.beginTransaction();
    try {
      // Lấy thông tin ảnh từ DB
      const oldImages = await this.getProductImages(productId);

      // Xóa ảnh trên Cloudinary
      for (const img of oldImages) {
        const publicId = productFacade.extractPublicIdFromUrl(img.image_url);
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error(`Error deleting image ${publicId}:`, error);
        }
      }

      // Xóa ảnh trên database
      await this.connection.query(
        "DELETE FROM product_images WHERE product_id = ?",
        [productId]
      );

      const [result] = await this.connection.query(
        "DELETE FROM products WHERE product_id = ?",
        [productId]
      );

      await this.connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await this.connection.rollback();
      throw error;
    }
  }
  async processOrder(stockChanges) {
    if (!stockChanges.length) return;

    const updateSql = `
      UPDATE products
      SET 
        stock = CASE 
          ${stockChanges
            .map(([id, qty]) => `WHEN product_id = ${id} THEN stock - ${qty}`)
            .join(" ")}
        END,
        sold = CASE 
          ${stockChanges
            .map(([id, qty]) => `WHEN product_id = ${id} THEN sold + ${qty}`)
            .join(" ")}
        END,
        status = CASE 
          ${stockChanges
            .map(([id]) => {
              const qty = stockChanges.find((v) => v[0] === id)[1];
              return `WHEN product_id = ${id} AND stock - ${qty} <= 0 THEN 'het-hang'`;
            })
            .join(" ")}
          ELSE status
        END
      WHERE product_id IN (${stockChanges.map(([id]) => id).join(",")})
    `;

    await this.connection.query(updateSql);
  }

  async revertOrder(stockChanges) {
    if (!stockChanges.length) return;

    const updateSql = `
      UPDATE products
      SET 
        stock = CASE 
          ${stockChanges
            .map(([id, qty]) => `WHEN product_id = ${id} THEN stock + ${qty}`)
            .join(" ")}
        END,
        sold = CASE 
          ${stockChanges
            .map(([id, qty]) => `WHEN product_id = ${id} THEN sold - ${qty}`)
            .join(" ")}
        END,
        status = CASE 
          ${stockChanges
            .map(([id]) => {
              const qty = stockChanges.find((v) => v[0] === id)[1];
              return `WHEN product_id = ${id} AND stock + ${qty} > 0 THEN 'con-hang'`;
            })
            .join(" ")}
          ELSE status
        END
      WHERE product_id IN (${stockChanges.map(([id]) => id).join(",")})
    `;

    await this.connection.query(updateSql);
  }
  async getRandomProducts(excludeProductId, limit = 10) {
    const [products] = await this.connection.query(
      "SELECT * FROM products WHERE product_id != ? AND status='con-hang' ORDER BY RAND() LIMIT ?",
      [excludeProductId, limit]
    );
    return products;
  }

  async getProductsByCategory(categoryId) {
    const [products] = await this.connection.query(
      "SELECT * FROM products WHERE status='con-hang' AND category=?",
      [categoryId]
    );
    return products;
  }

  async getTopProducts(limit) {
    let sql =
      "SELECT * FROM products WHERE status='con-hang' ORDER BY sold DESC";
    if (limit) {
      sql += " LIMIT ?";
      const [products] = await this.connection.query(sql, [limit]);
      return products;
    }
    const [products] = await this.connection.query(sql);
    return products;
  }
  async getDiscountProducts(limit) {
    let sql = "SELECT * FROM products WHERE discount!=0 ORDER BY sold DESC";
    if (limit) {
      sql += " LIMIT ?";
      const [products] = await this.connection.query(sql, [limit]);
      return products;
    }
    const [products] = await this.connection.query(sql);
    return products;
  }
}

module.exports = ProductRepository;
