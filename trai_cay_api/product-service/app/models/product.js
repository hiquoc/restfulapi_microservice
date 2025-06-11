class Product {
  constructor({
    name,
    price,
    category,
    stock,
    status,
    details,
    mainImage,
    images,
    discount,
    sold = 0,
  }) {
    this.name = name;
    this.price = price;
    this.category = category;
    this.stock = stock;
    this.status = status;
    this.details = details;
    this.mainImage = mainImage;
    this.images = images;
    this.discount=discount;
    this.sold = sold;
  }
  getMainImage() {
    return this.mainImage;
  }
  getAdditionalImages() {
    return this.images;
  }
  getAllImages() {
    // mainImage + images phụ (đã xử lý đúng thứ tự)
    const allImages = this.images || [];
    if (this.mainImage) {
      allImages.unshift(this.mainImage);
    }
    return allImages;
  }
  createProduct(){}
  
}
module.exports = Product;