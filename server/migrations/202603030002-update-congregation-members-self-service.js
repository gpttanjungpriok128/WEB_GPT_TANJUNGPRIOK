'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('CongregationMembers');

    if (!table.category) {
      await queryInterface.addColumn('CongregationMembers', 'category', {
        type: Sequelize.ENUM('kaum_pria', 'kaum_wanita', 'kaum_muda', 'sekolah_minggu'),
        allowNull: true
      });
    }

    if (!table.submittedByUserId) {
      await queryInterface.addColumn('CongregationMembers', 'submittedByUserId', {
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE "CongregationMembers"
      SET "category" = CASE
        WHEN "gender" = 'pria' THEN 'kaum_pria'::"enum_CongregationMembers_category"
        WHEN "gender" = 'wanita' THEN 'kaum_wanita'::"enum_CongregationMembers_category"
        ELSE 'kaum_muda'::"enum_CongregationMembers_category"
      END
      WHERE "category" IS NULL
    `);

    await queryInterface.changeColumn('CongregationMembers', 'category', {
      type: Sequelize.ENUM('kaum_pria', 'kaum_wanita', 'kaum_muda', 'sekolah_minggu'),
      allowNull: false
    });

    const refreshedTable = await queryInterface.describeTable('CongregationMembers');
    if (refreshedTable.gender) {
      await queryInterface.changeColumn('CongregationMembers', 'gender', {
        type: Sequelize.ENUM('pria', 'wanita'),
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('CongregationMembers');

    if (table.gender) {
      await queryInterface.sequelize.query(`
        UPDATE "CongregationMembers"
        SET "gender" = 'pria'
        WHERE "gender" IS NULL
      `);

      await queryInterface.changeColumn('CongregationMembers', 'gender', {
        type: Sequelize.ENUM('pria', 'wanita'),
        allowNull: false
      });
    }

    if (table.submittedByUserId) {
      await queryInterface.removeColumn('CongregationMembers', 'submittedByUserId');
    }
    if (table.category) {
      await queryInterface.removeColumn('CongregationMembers', 'category');
    }
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_CongregationMembers_category";');
  }
};
