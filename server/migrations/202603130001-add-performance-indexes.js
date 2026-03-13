'use strict';

async function addIndexIfMissing(queryInterface, table, fields, options) {
  const indexes = await queryInterface.showIndex(table);
  const exists = indexes.some((index) => index.name === options.name);
  if (exists) return;
  await queryInterface.addIndex(table, fields, options);
}

async function removeIndexIfExists(queryInterface, table, indexName) {
  const indexes = await queryInterface.showIndex(table);
  const exists = indexes.some((index) => index.name === indexName);
  if (!exists) return;
  await queryInterface.removeIndex(table, indexName);
}

module.exports = {
  async up(queryInterface) {
    await addIndexIfMissing(queryInterface, 'Articles', ['status', 'createdAt'], {
      name: 'idx_articles_status_created_at'
    });
    await addIndexIfMissing(queryInterface, 'Articles', ['authorId'], {
      name: 'idx_articles_author'
    });

    await addIndexIfMissing(queryInterface, 'Schedules', ['date'], {
      name: 'idx_schedules_date'
    });

    await addIndexIfMissing(queryInterface, 'Galleries', ['createdAt'], {
      name: 'idx_galleries_created_at'
    });

    await addIndexIfMissing(queryInterface, 'PrayerRequests', ['isRead', 'createdAt'], {
      name: 'idx_prayer_requests_status_created_at'
    });

    await addIndexIfMissing(queryInterface, 'StoreProducts', ['isActive', 'createdAt'], {
      name: 'idx_store_products_active_created_at'
    });

    await addIndexIfMissing(queryInterface, 'StoreOrders', ['status', 'createdAt'], {
      name: 'idx_store_orders_status_created_at'
    });
    await addIndexIfMissing(queryInterface, 'StoreOrders', ['userId', 'createdAt'], {
      name: 'idx_store_orders_user_created_at'
    });

    await addIndexIfMissing(queryInterface, 'StoreOrderItems', ['orderId'], {
      name: 'idx_store_order_items_order'
    });
    await addIndexIfMissing(queryInterface, 'StoreOrderItems', ['productId'], {
      name: 'idx_store_order_items_product'
    });

    await addIndexIfMissing(queryInterface, 'StoreProductReviews', ['productId', 'createdAt'], {
      name: 'idx_store_reviews_product_created_at'
    });
    await addIndexIfMissing(queryInterface, 'StoreProductReviews', ['isApproved'], {
      name: 'idx_store_reviews_status'
    });
  },

  async down(queryInterface) {
    await removeIndexIfExists(queryInterface, 'StoreProductReviews', 'idx_store_reviews_status');
    await removeIndexIfExists(queryInterface, 'StoreProductReviews', 'idx_store_reviews_product_created_at');
    await removeIndexIfExists(queryInterface, 'StoreOrderItems', 'idx_store_order_items_product');
    await removeIndexIfExists(queryInterface, 'StoreOrderItems', 'idx_store_order_items_order');
    await removeIndexIfExists(queryInterface, 'StoreOrders', 'idx_store_orders_user_created_at');
    await removeIndexIfExists(queryInterface, 'StoreOrders', 'idx_store_orders_status_created_at');
    await removeIndexIfExists(queryInterface, 'StoreProducts', 'idx_store_products_active_created_at');
    await removeIndexIfExists(queryInterface, 'PrayerRequests', 'idx_prayer_requests_status_created_at');
    await removeIndexIfExists(queryInterface, 'Galleries', 'idx_galleries_created_at');
    await removeIndexIfExists(queryInterface, 'Schedules', 'idx_schedules_date');
    await removeIndexIfExists(queryInterface, 'Articles', 'idx_articles_author');
    await removeIndexIfExists(queryInterface, 'Articles', 'idx_articles_status_created_at');
  }
};
