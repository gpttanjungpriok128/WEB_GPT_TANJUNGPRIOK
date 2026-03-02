const app = require('./app');
const bcrypt = require('bcrypt');
const { sequelize, LiveStreamSetting, User } = require('./models');

const DEFAULT_PORT = Number(process.env.PORT || 5000);

function isTrue(value) {
  return ['true', '1', 'yes', 'on'].includes(String(value || '').toLowerCase());
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
      console.log(`Default ${account.role} account created: ${account.email}`);
    } else {
      await existing.update({
        name: account.name,
        password: hashedPassword,
        role: account.role
      });
    }
  }
}

async function bootstrap() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    await LiveStreamSetting.findOrCreate({
      where: { id: 1 },
      defaults: { youtubeUrl: 'https://www.youtube.com/embed/live_stream?channel=YOUR_CHANNEL_ID' }
    });

    const shouldSeedDefaultUsers = process.env.NODE_ENV !== 'production' || isTrue(process.env.SEED_DEFAULT_USERS);
    if (shouldSeedDefaultUsers) {
      await ensureDefaultUsers();
    }

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
