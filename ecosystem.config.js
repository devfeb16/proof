module.exports = {
  apps: [
    {
      name: 'proof-server',
      script: 'npm',
      args: 'start',
      cwd: '/root/proof',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/root/.pm2/logs/proof-server-error.log',
      out_file: '/root/.pm2/logs/proof-server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
    },
  ],
};

