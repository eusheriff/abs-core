# Google Cloud VPS Deployment Guide

## Overview
This guide documents the setup and access for the **Free Tier** Google Cloud VM used in the ABS Hybrid Fleet.

## 🖥️ VM Specifications (Free Tier)
- **Name:** `abs-worker-gcp-01`
- **Region:** `us-central1-a` (Iowa)
- **Machine Type:** `e2-micro` (2 vCPU, 1GB RAM)
- **Storage:** 30GB Standard Persistent Disk
- **Public IP:** `130.211.119.131`
- **Internal IP:** `10.128.0.2`
- **OS:** Ubuntu 22.04 LTS

## 🚀 Access (SSH)
The VM uses the same SSH key as the Oracle fleet (`~/.ssh/abs_mcp_key`).

### Command Line
```bash
ssh -i ~/.ssh/abs_mcp_key ubuntu@130.211.119.131
```

### Config (`~/.ssh/config`)
Add this to your local SSH config for easier access:
```ssh
Host abs-gcp
    HostName 130.211.119.131
    User ubuntu
    IdentityFile ~/.ssh/abs_mcp_key
    StrictHostKeyChecking no
```
Then connect with: `ssh abs-gcp`

## 🧠 Memory Optimization
Since `e2-micro` has only **1GB physical RAM**, we have configured **6GB of Swap** to prevent OOM kills.

- **Physical RAM:** 1GB
- **Swap File:** 6GB (`/swapfile`)
- **Total Virtual Memory:** ~7GB

Check status:
```bash
free -h
```

## 🛠️ Management Commands

### Start/Stop via `gcloud`
```bash
# Stop to save costs (if not free tier) or maintenance
gcloud compute instances stop abs-worker-gcp-01 --zone=us-central1-a

# Start
gcloud compute instances start abs-worker-gcp-01 --zone=us-central1-a
```

### Firewall Rules
- **SSH (22):** Open globally (Default)
- **HTTP/HTTPS (80/443):** Open (Tag: `http-server`, `https-server`)

## ⚠️ Important Notes
1. **Egress Fees:** Google charges for network egress (traffic OUT) to the internet, except for the first 1GB/month (Standard Tier) or specific Free Tier limits. Keep an eye on bandwidth.
2. **CPU Bursting:** `e2-micro` uses shared cores. Sustained 100% CPU usage might be throttled. Ideally suited for bursty workloads like API handling or intermittent background jobs.
