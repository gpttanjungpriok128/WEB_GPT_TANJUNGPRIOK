const app = require('./app');
const bcrypt = require('bcrypt');
const { spawn } = require('child_process');
const { sequelize, LiveStreamSetting, User, Schedule } = require('./models');
const { isCloudinaryConfigured } = require('./services/cloudinaryService');

const DEFAULT_PORT = Number(process.env.PORT || 5000);

function isTrue(value) {
  return ['true', '1', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

async function runPendingMigrations() {
  if (isTrue(process.env.SKIP_AUTO_MIGRATE)) {
    return;
  }

  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  await new Promise((resolve, reject) => {
    const child = spawn(command, ['run', 'migrate'], {
      cwd: __dirname,
      stdio: 'inherit',
      env: process.env
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Automatic migration failed with exit code ${code}`));
    });
  });
}

function startHttpServer(preferredPort, retries = 1) {
  const server = app.listen(preferredPort, () => {
    console.log(`Server running on port ${preferredPort}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && retries > 0) {
      const nextPort = preferredPort + 1;
      console.warn(`Port ${preferredPort} is in use. Trying ${nextPort}...`);
      startHttpServer(nextPort, retries - 1);
      return;
    }

    console.error('Failed to bind server port:', error.message);
    process.exit(1);
  });
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function getNextWeekdayDate(targetDay, weekOffset = 0) {
  const date = new Date();
  const diff = (targetDay - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + diff + (weekOffset * 7));
  return toIsoDate(date);
}

function getDefaultSchedules() {
  return [
    {
      title: 'Ibadah Minggu Raya (Sunday Service)',
      date: getNextWeekdayDate(0, 0),
      time: '09:00 WIB',
      description: 'Setiap hari Minggu jam 09.00 WIB.'
    },
    {
      title: 'Ibadah Minggu Raya di GPT Volker',
      date: getNextWeekdayDate(0, 1),
      time: '16:00 WIB',
      description: 'Dilaksanakan pada minggu ke-2 dan ke-4 setiap bulan di GPT Volker.'
    },
    {
      title: 'Ibadah Doa Penyembahan',
      date: getNextWeekdayDate(2, 0),
      time: '18:30 WIB',
      description: 'Setiap hari Selasa jam 18.30 WIB.'
    },
    {
      title: 'Ibadah Pendalaman Alkitab',
      date: getNextWeekdayDate(4, 0),
      time: '18:30 WIB',
      description: 'Setiap hari Kamis jam 18.30 WIB.'
    },
    {
      title: 'Sekolah Minggu (Sunday School)',
      date: getNextWeekdayDate(0, 0),
      time: '07:30 WIB',
      description: 'Ibadah kategorial untuk anak-anak, setiap hari Minggu jam 07.30 WIB.'
    },
    {
      title: 'Ibadah Kaum Muda Remaja (Faithfull Generation Church Community)',
      date: getNextWeekdayDate(6, 1),
      time: '17:00 WIB',
      description: 'Ibadah kategorial, setiap hari Sabtu pada minggu ke-2 dan ke-4.'
    },
    {
      title: 'Ibadah Kaum Wanita',
      date: getNextWeekdayDate(6, 0),
      time: '10:00 WIB',
      description: 'Ibadah kategorial, setiap hari Sabtu pada minggu ke-1 dan ke-3.'
    },
    {
      title: 'Ibadah Kaum Pria',
      date: getNextWeekdayDate(6, 3),
      time: '10:00 WIB',
      description: 'Ibadah kategorial, setiap hari Sabtu pada minggu ke-4.'
    }
  ];
}

async function ensureDefaultUsers() {
  const defaults = [
    {
      name: process.env.DEFAULT_ADMIN_NAME || 'Super Admin',
      email: (process.env.DEFAULT_ADMIN_EMAIL || 'admin@church.local').toLowerCase(),
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!',
      role: 'admin'
    },
    {
      name: process.env.DEFAULT_MULTIMEDIA_NAME || 'Multimedia Team',
      email: (process.env.DEFAULT_MULTIMEDIA_EMAIL || 'multimedia@church.local').toLowerCase(),
      password: process.env.DEFAULT_MULTIMEDIA_PASSWORD || 'Multi123!',
      role: 'multimedia'
    }
  ];

  for (const account of defaults) {
    const existing = await User.findOne({ where: { email: account.email } });
    const hashedPassword = await bcrypt.hash(account.password, 10);

    if (!existing) {
      await User.create({
        name: account.name,
        email: account.email,
        password: hashedPassword,
        role: account.role
      });
    } else {
      await existing.update({
        name: account.name,
        password: hashedPassword,
        role: account.role
      });
    }
  }
}

async function ensureDefaultSchedules(forceUpdate = false) {
  const schedules = getDefaultSchedules();
  const existingCount = await Schedule.count();
  if (existingCount > 0 && !forceUpdate) {
    return;
  }

  for (const entry of schedules) {
    const existing = await Schedule.findOne({ where: { title: entry.title } });
    if (!existing) {
      await Schedule.create(entry);
      continue;
    }

    if (forceUpdate) {
      await existing.update(entry);
    }
  }
}

async function bootstrap() {
  try {
    await runPendingMigrations();
    await sequelize.authenticate();

    await LiveStreamSetting.findOrCreate({
      where: { id: 1 },
      defaults: { youtubeUrl: 'https://www.youtube.com/embed/live_stream?channel=YOUR_CHANNEL_ID' }
    });

    const shouldSeedDefaultUsers = process.env.NODE_ENV !== 'production' || isTrue(process.env.SEED_DEFAULT_USERS);
    if (shouldSeedDefaultUsers) {
      await ensureDefaultUsers();
    }

    if (process.env.NODE_ENV === 'production' && !isCloudinaryConfigured()) {
      console.warn('Cloudinary belum dikonfigurasi. Endpoint upload multipart akan menolak request di production.');
    }

    await ensureDefaultSchedules(isTrue(process.env.SEED_DEFAULT_SCHEDULES));

    startHttpServer(DEFAULT_PORT, 2);
  } catch (error) {
    if (String(error.message).toLowerCase().includes('password authentication failed')) {
      console.error('Failed to start server: database authentication failed. Check DB_USER/DB_PASSWORD in server/.env');
    } else {
      console.error('Failed to start server:', error.message);
    }
    process.exit(1);
  }
}

bootstrap();
