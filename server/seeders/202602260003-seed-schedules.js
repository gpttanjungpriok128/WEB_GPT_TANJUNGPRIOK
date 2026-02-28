'use strict';

const scheduleTitles = [
  'Ibadah Minggu Raya (Sunday Service)',
  'Ibadah Minggu Raya di GPT Volker',
  'Ibadah Doa Penyembahan',
  'Ibadah Pendalaman Alkitab',
  'Sekolah Minggu (Sunday School)',
  'Ibadah Kaum Muda Remaja (Faithfull Generation Church Community)',
  'Ibadah Kaum Wanita',
  'Ibadah Kaum Pria'
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkDelete('Schedules', { title: scheduleTitles }, {});

    await queryInterface.bulkInsert('Schedules', [
      {
        title: 'Ibadah Minggu Raya (Sunday Service)',
        date: '2026-03-01',
        time: '09:00 WIB',
        description: 'Setiap hari Minggu jam 09.00 WIB.',
        createdAt: now,
        updatedAt: now
      },
      {
        title: 'Ibadah Minggu Raya di GPT Volker',
        date: '2026-03-08',
        time: '16:00 WIB',
        description: 'Dilaksanakan pada minggu ke-2 dan ke-4 setiap bulan di GPT Volker.',
        createdAt: now,
        updatedAt: now
      },
      {
        title: 'Ibadah Doa Penyembahan',
        date: '2026-03-03',
        time: '18:30 WIB',
        description: 'Setiap hari Selasa jam 18.30 WIB.',
        createdAt: now,
        updatedAt: now
      },
      {
        title: 'Ibadah Pendalaman Alkitab',
        date: '2026-03-05',
        time: '18:30 WIB',
        description: 'Setiap hari Kamis jam 18.30 WIB.',
        createdAt: now,
        updatedAt: now
      },
      {
        title: 'Sekolah Minggu (Sunday School)',
        date: '2026-03-01',
        time: '07:30 WIB',
        description: 'Ibadah kategorial untuk anak-anak, setiap hari Minggu jam 07.30 WIB.',
        createdAt: now,
        updatedAt: now
      },
      {
        title: 'Ibadah Kaum Muda Remaja (Faithfull Generation Church Community)',
        date: '2026-03-14',
        time: '17:00 WIB',
        description: 'Ibadah kategorial, setiap hari Sabtu pada minggu ke-2 dan ke-4.',
        createdAt: now,
        updatedAt: now
      },
      {
        title: 'Ibadah Kaum Wanita',
        date: '2026-03-07',
        time: '10:00 WIB',
        description: 'Ibadah kategorial, setiap hari Sabtu pada minggu ke-1 dan ke-3.',
        createdAt: now,
        updatedAt: now
      },
      {
        title: 'Ibadah Kaum Pria',
        date: '2026-03-28',
        time: '10:00 WIB',
        description: 'Ibadah kategorial, setiap hari Sabtu pada minggu ke-4.',
        createdAt: now,
        updatedAt: now
      }
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Schedules', { title: scheduleTitles }, {});
  }
};
