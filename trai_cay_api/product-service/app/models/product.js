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
  }
  getAllImages() {
    // mainImage + images phụ (đã xử lý đúng thứ tự)
    const allImages = this.images || [];
    if (this.mainImage) {
      allImages.unshift(this.mainImage);
    }
    return allImages;
  }
}
module.exports = Product;