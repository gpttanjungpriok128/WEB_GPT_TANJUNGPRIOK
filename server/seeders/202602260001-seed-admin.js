'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    await queryInterface.bulkInsert('Users', [{
      name: 'Super Admin',
      email: 'admin@church.local',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});

    await queryInterface.bulkInsert('LiveStreamSettings', [{
      youtubeUrl: 'https://www.youtube.com/embed/live_stream?channel=YOUR_CHANNEL_ID',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('LiveStreamSettings', null, {});
    await queryInterface.bulkDelete('Users', { email: 'admin@church.local' }, {});
  }
};
