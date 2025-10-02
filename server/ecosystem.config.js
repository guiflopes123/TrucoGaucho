module.exports = {
  apps: [{
    name: "truco-gaucho-server",
    script: "./index.js",
    env: {
      NODE_ENV: "production",
      PORT: 5000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G"
  }]
}
