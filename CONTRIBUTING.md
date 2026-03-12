# Contributing to opencode-timeout-continuer

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or bun

### Installation

```bash
git clone https://github.com/harshpreet931/opencode-timeout-continuer.git
cd opencode-timeout-continuer
npm install
```

### Build

```bash
npm run build
```

### Testing the Plugin Locally

```bash
npm pack
npm install -g opencode-timeout-continuer-*.tgz
```

Then add to your `opencode.json`:

```json
{
  "plugin": ["opencode-timeout-continuer"]
}
```

## Development Workflow

1. **Fork** the repository
2. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** and ensure the build passes:
   ```bash
   npm run build
   ```
4. **Commit** your changes with a clear message:
   ```bash
   git commit -m "feat: description of your change"
   ```
5. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request**

## Commit Message Guidelines

Use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## Pull Request Guidelines

1. **One feature per PR** - Keep changes focused
2. **Update documentation** if you change behavior
3. **Test manually** - Verify the plugin works in OpenCode
4. **Link issues** - Reference any related issues

## Code Style

- TypeScript with strict mode enabled
- Use meaningful variable names
- Add JSDoc comments for public APIs
- No console.log in production code (use client.app.log())

## Questions?

Open an issue for any questions or suggestions!
