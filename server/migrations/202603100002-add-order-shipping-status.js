'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_StoreOrders_status" ADD VALUE IF NOT EXISTS 'shipping';`
    );
  },

  async down() {
    // No-op: Postgres does not support removing enum values easily.
  }
};
