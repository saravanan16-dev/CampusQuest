const config = require('./config');
const { createApp } = require('./app');

if (config.jwtSecret === 'dev-only-secret-change-me' && process.env.NODE_ENV === 'production') {
  console.error('Refusing to start in production with the default JWT_SECRET.');
  process.exit(1);
}

createApp().listen(config.port, () => {
  console.log(`CampusQuest API listening on http://localhost:${config.port}`);
});
