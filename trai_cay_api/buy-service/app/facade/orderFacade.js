const Order = require("../models/order");
const OrderItem = require("../models/orderItem");

const OrderFacade = {
  createOrder: (data) => {
    return new Order({
      order_id: data.order_id,
      account_id: data.account_id,
      total_price: data.total_price,
      status: data.status || "cho-xac-nhan",
      created_at: data.created_at || new Date(),
    });
  },

  createOrderItem: (data) => {
    return new OrderItem({
      order_item_id: data.order_item_id,
      order_id: data.order_id,
      product_id: data.product_id,
      quantity: data.quantity,
      price: data.price,
      status: data.status || "cho-xac-nhan",
    });
  },

  fromDBOrder: (dbData) => {
    return OrderFacade.createOrder(dbData);
  },

  fromDBOrderItem: (dbData) => {
    return OrderFacade.createOrderItem(dbData);
  },

  createOrderWithItems(order, items) {
    return {
      ...order,
      items: items.map((item) => ({
        ...item,
        order_id: order.order_id,
        account_id: order.account_id,
      })),
    };
  },

  enrichOrderItems: (orderItems, products, accounts) => {
    const productMap = new Map(
      products.map((p) => [p.product_id, { mainImg: p.mainImg, name: p.name }])
    );

    const accountMap = new Map(
      accounts.map((a) => [
        a.account_id,
        Object.fromEntries(
          Object.entries(a).filter(
            ([key]) => key !== "password" && key !== "role"
          )
        ),
      ])
    );

    return orderItems.map((item) => ({
      ...item,
      mainImg: productMap.get(item.product_id)?.mainImg || "",
      name: productMap.get(item.product_id)?.name || "Sản phẩm không xác định",
      ...accountMap.get(item.account_id),
    }));
  },
};

module.exports = OrderFacade;
