# GitHub Actions deployment

The production pipeline deploys only a commit that completed the `CI` and
`Docker Storage E2E` workflow chain. A manual `workflow_dispatch` remains
available for an operator-approved deployment.

## Trust boundary

- Application secrets stay on the VPS in `/etc/eoffice/eoffice.env`.
- GitHub stores a dedicated SSH private key, never a root or operator key.
- The corresponding VPS key is restricted to
  `/usr/local/sbin/eoffice-deploy`.
- The deploy command accepts only a 40-character commit SHA that is reachable
  from `origin/main`.
- SSH host verification uses a pinned `known_hosts` entry. The workflow never
  uses `StrictHostKeyChecking=no`.
- Backups are written to `/var/backups/eoffice`, outside the Git checkout.

## GitHub production secrets

Configure these repository or `production` environment secrets:

| Secret | Value |
| --- | --- |
| `VPS_HOST` | VPS IP address or hostname |
| `VPS_PORT` | SSH port, normally `22` |
| `VPS_SSH_KEY` | Dedicated unencrypted CI private key |
| `VPS_KNOWN_HOSTS` | Pinned OpenSSH `known_hosts` line for the VPS |

The SSH username is intentionally fixed to `eoffice-deploy`.

## VPS layout

| Path | Purpose |
| --- | --- |
| `/usr/local/sbin/eoffice-deploy` | Root-owned forced deployment command |
| `/etc/eoffice/eoffice.env` | Production Compose configuration, mode `600` |
| `/opt/e-office` | Managed Git checkout |
| `/var/backups/eoffice` | Pre-update database and storage backups |

Do not edit `/opt/e-office` manually. Every deployment hard-resets and cleans
that checkout before selecting the tested commit.

For Nginx Proxy Manager, set `PROXY_NETWORK_NAME` in the production env. The
deploy command creates that network, connects the existing `nginx-proxy`
container, and exposes the aliases `eoffice-frontend` and `eoffice-backend`.
Configure the public host to route the main application to
`eoffice-frontend:3000` and `/api/` to `eoffice-backend:4000`.
