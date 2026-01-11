# JaCode Offline Deployment Guide

This directory contains scripts to deploy JaCode in an offline environment using Docker.

## Prerequisites

- **Source Machine (Online)**:
  - Docker Installed
  - Git Bash (Windows) or Terminal (Linux/Mac)
  - Internet access to pull base images and build dependencies

- **Target Machine (Offline)**:
  - Docker Installed
  - Docker Compose

## 1. Export Images (Online)

Run the export script on your online machine to build and package everything.

```bash
cd scripts/offline
./export-images.sh
```

This will create a directory named `jacode-offline-pack` containing:

- `images.tar.gz`: All docker images (Backend, Frontend, Postgres, Redis)
- `docker-compose.prod.yml`: Production orchestration file
- `.env.example`: Configuration template
- `install.sh`: One-click installation script

## 2. Transfer

Copy the entire `jacode-offline-pack` directory to your offline server (via USB, SCP, etc.).

## 3. Install & Run (Offline)

On the offline machine, navigate to the folder and run the install script:

```bash
cd jacode-offline-pack
./install.sh
```

This script will:

1. Load all Docker images.
2. Create a `.env` file if verifying.
3. Start the services using `docker-compose`.

## Manual Steps

If you prefer to run steps manually:

1. **Load Images**:

   ```bash
   gunzip -c images.tar.gz | docker load
   ```

2. **Configure**:
   Copy `.env.example` to `.env` and edit it.

3. **Start**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Nginx & SSL

This deployment uses Nginx as a reverse proxy to serve the application over HTTPS at `https://jacode.koreacb.com`.
The `export-images.sh` script generates self-signed certificates for testing in `jacode-offline-pack/certs`.

**For Production:**
Replace the files in the `certs` directory with your valid SSL certificates before running `install.sh`:

- `fullchain.pem`: Your certificate (and chain)
- `privkey.pem`: Your private key

## Troubleshooting

- **Ports**: Ensure ports 80 (HTTP) and 443 (HTTPS) are free, as Nginx binds to them.
- **Permissions**: You might need `sudo` for docker commands on Linux.
- **Database**: Data is persisted in docker volumes (`postgres_data`, `redis_data`).
