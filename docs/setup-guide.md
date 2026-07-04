# Taro Setup Guide

## Finding Your Local IP Address

Before deploying Taro, you need to know the LAN IP addresses of both machines.

### Linux (Ubuntu 24.04 / Debian)

```bash
# Method 1: ip command (recommended)
ip -4 addr show | grep -oP '(?<=inet\s)192\.168\.\d+\.\d+'

# Method 2: hostname command
hostname -I | awk '{print $1}'

# Method 3: Detailed view
ip addr show | grep "inet " | grep -v 127.0.0.1
```

### macOS

```bash
# Method 1: ifconfig
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'

# Method 2: System Preferences
# Go to System Settings → Network → Select your connection → IP Address
```

### Windows (or WSL2)

```powershell
# PowerShell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.*" }).IPAddress

# Command Prompt
ipconfig | findstr /i "IPv4"

# WSL2 (from inside WSL)
ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d/ -f1
```

> **Note for WSL2 users**: WSL2 uses a virtual network adapter. If you're running Taro services inside WSL2, you may need to use the Windows host IP and configure port forwarding. For simplicity, running Docker Desktop on Windows and using the Windows IP is recommended.

## Initial Setup

### 1. Prerequisites

Ensure both machines have:

- **Docker Engine** ≥ 24.0 ([Install guide](https://docs.docker.com/engine/install/ubuntu/))
- **Docker Compose** v2 (included with Docker Engine)
- **Git**

Optional (for GPU acceleration on Node 1):
- **NVIDIA GPU** with drivers installed
- **NVIDIA Container Toolkit** ([Install guide](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html))

### 2. Clone the Repository

On **both machines**:

```bash
git clone <your-repo-url> ~/Taro
cd ~/Taro
```

### 3. Configure Environment Variables

#### Node 1 (AI Compute)

```bash
cd ~/Taro/docker/node1-ai-compute
cp .env.example .env

# Edit .env — set NODE1_HOST to this machine's IP, NODE2_HOST to the other
nano .env
```

#### Node 2 (Core Services)

```bash
cd ~/Taro/docker/node2-core-services
cp .env.example .env

# Edit .env — set NODE2_HOST to this machine's IP, NODE1_HOST to the other
# IMPORTANT: Change JWT_SECRET to a random string!
nano .env
```

**Generate a secure JWT secret:**

```bash
openssl rand -hex 32
```

### 4. Start Services

**Start Node 2 first** (it runs the NATS server and database):

```bash
cd ~/Taro/docker/node2-core-services
docker compose up -d
```

Wait for all services to be healthy:

```bash
docker compose ps
```

**Then start Node 1:**

```bash
cd ~/Taro/docker/node1-ai-compute
docker compose up -d
```

### 5. Pull AI Models

```bash
# On Node 1
docker compose exec ollama ollama pull qwen2.5:7b
docker compose exec ollama ollama pull nomic-embed-text
```

This may take several minutes depending on your internet speed.

### 6. Open Taro

Navigate to `http://<NODE2_IP>:3000` in your browser.

You'll be greeted with the onboarding wizard on first launch.

## Single-Machine Development

For development or testing on a single machine:

1. Set both `NODE1_HOST` and `NODE2_HOST` to `127.0.0.1` in both `.env` files
2. Start Node 2: `cd docker/node2-core-services && docker compose up -d`
3. Start Node 1: `cd docker/node1-ai-compute && docker compose up -d`

## Verifying the Setup

```bash
# Check Node 2 services
curl http://<NODE2_IP>:8000/health      # Taro API
curl http://<NODE2_IP>:3000             # Dashboard
curl http://<NODE2_IP>:8222/healthz     # NATS

# Check Node 1 services
curl http://<NODE1_IP>:8100/health      # AI Gateway
curl http://<NODE1_IP>:6333/healthz     # Qdrant
curl http://<NODE1_IP>:11434/api/tags   # Ollama
```

## GPU Support (Optional)

If Node 1 has an NVIDIA GPU:

1. Install [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
2. Edit `docker/node1-ai-compute/docker-compose.yml`
3. Uncomment the `deploy:` section under the `ollama` service
4. Restart: `docker compose up -d`

Verify GPU is detected:

```bash
docker compose exec ollama nvidia-smi
```

## Troubleshooting

### Services can't connect across nodes

- Verify both machines can ping each other: `ping <OTHER_NODE_IP>`
- Check firewall rules allow the required ports (4222, 6333, 8100, etc.)
- On Ubuntu: `sudo ufw allow from 192.168.1.0/24`

### Ollama is slow

- Without GPU, inference will be CPU-only and slower
- Use smaller models (e.g., `qwen2.5:3b` instead of `7b`)
- Ensure sufficient RAM (8GB+ recommended for 7B models)

### Database connection issues

- Check PostgreSQL logs: `docker compose logs postgres`
- Ensure the database was created: `docker compose exec postgres psql -U taro -c '\l'`
