# E-Office Installation

Use exactly one supported guide:

- [Disposable local demo](INSTALL-DEMO.md)
- [Retained self-hosted / production deployment](INSTALL-PRODUCTION.md)
- [Backup and restore](docs/BACKUP-RESTORE.md)

The only supported installer is `install.sh`:

```bash
# Demo
DEMO_ADMIN_PASSWORD='choose-a-unique-password' ./install.sh demo

# Retained deployment
APP_BASE_URL=https://office.example.com \
CORS_ORIGIN=https://office.example.com \
NEXT_PUBLIC_API_URL=https://office.example.com/api/v1 \
NEXT_PUBLIC_API_BASE_URL=https://office.example.com/api/v1 \
./install.sh production
```

The installer does not install Docker, change the host firewall, configure DNS,
or issue TLS certificates. Host-level operations remain under operator control.

Historical installers and hard-coded container-name commands are unsupported.
