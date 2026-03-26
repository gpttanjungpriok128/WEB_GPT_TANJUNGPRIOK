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
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ContactMessages', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false },
      subject: { type: Sequelize.STRING, allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      isRead: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await addIndexIfMissing(queryInterface, 'ContactMessages', ['isRead', 'createdAt'], {
      name: 'idx_contact_messages_status_created_at'
    });
  },

  async down(queryInterface) {
    await removeIndexIfExists(queryInterface, 'ContactMessages', 'idx_contact_messages_status_created_at');
    await queryInterface.dropTable('ContactMessages');
  }
};
