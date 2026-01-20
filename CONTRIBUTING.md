# Contributing to ABS Core

First off, thank you for considering contributing to ABS Core!

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

- Check if the issue already exists
- Use the bug report template
- Include reproduction steps

### Suggesting Features

- Check the roadmap first
- Open a discussion before a PR

### Pull Requests

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit with conventional commits: `feat: add new feature`
6. Push and open a PR

## Development Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/abs-core.git
cd abs-core

# Install
npm install

# Setup Cloudflare D1
cp packages/core/wrangler.toml.example packages/core/wrangler.toml
npx wrangler d1 create abs-core-db
# Update wrangler.toml with your database_id

# Run migrations
npx wrangler d1 migrations apply abs-core-db --local

# Dev server
npm run dev
```

## Architecture

- `packages/core/src/api/` - HTTP handlers (Hono)
- `packages/core/src/core/` - Business logic, policies, LLM providers
- `packages/core/src/infra/` - Database, migrations

## License

By contributing, you agree that your contributions will be licensed under Apache 2.0.
