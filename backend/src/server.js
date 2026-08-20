const app = require('./app');
const env = require('./config/env');
const { startJobs } = require('./jobs');

app.listen(env.port, () => {
  console.log(`HCA backend listening on port ${env.port}`);
  startJobs();
});
