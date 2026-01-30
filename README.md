# Icon Library

A comprehensive, professionally-managed icon library with 1,185+ icons synchronized from Figma and deployed to GitHub Pages.

## 🚀 Quick Start

```bash
# View the icon library
npm run dev
# Opens at http://localhost:8080

# Sync icons from Figma
npm run icons:sync-all

# List available categories
npm run icons:list

# Lint code
npm run lint

# Format code
npm run format
```

## 📖 Documentation

### For Users
- **Main Site**: Visit `docs/` folder for the live icon library

### For Developers
- **[00_START_HERE.md](00_START_HERE.md)** - Start here for orientation
- **[docs/internals/README.md](docs/internals/README.md)** - Complete documentation index
- **[docs/internals/PROFESSIONAL_OPTIMIZATION_SUMMARY.md](docs/internals/PROFESSIONAL_OPTIMIZATION_SUMMARY.md)** - Current improvements

## 🎯 Current Status

✅ **Professional Grade**: 7/10 → Target 9-10/10

### Phase 1: Foundation Setup ✅ COMPLETE
- ESLint and Prettier fully configured
- All code formatting applied
- Documentation organized in `docs/internals/`
- npm scripts updated with lint/format/test

### Phase 2: Code Quality (In Progress)
- Refactoring app.js into modules
- Adding unit tests
- Creating logger utility
- Current lint status: **0 errors** ✅

### Phase 3: Advanced Features (Planned)
- Pre-commit hooks with Husky
- Performance monitoring
- TypeScript migration

## 📊 Features

- **1,185+ Icons** across 28 professional categories
- **5 Sizes**: 16px, 24px, 32px, 40px, 48px (+ 64px, 72px for outline)
- **2 Styles**: Filled and Outline
- **Figma Integration**: Real-time sync from Figma
- **Cache Busting**: Smart multi-layer caching strategy
- **WCAG Compliant**: AA/AAA accessibility standards
- **Dark Theme**: Modern, professional appearance
- **Export Options**: SVG, PNG, JSX, React, Vue, CSS

## 🛠️ Development

### Scripts
- `npm run dev` - Start development server
- `npm run icons:sync-all` - Sync all categories from Figma
- `npm run icons:sync-category <name>` - Sync specific category
- `npm run icons:list` - List available categories
- `npm run icons:validate` - Validate SVG files
- `npm run lint` - ESLint code quality check
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Prettier code formatting
- `npm run format:check` - Check formatting without changes
- `npm run test` - Run tests (coming Phase 2)

### Project Structure
```
icon-library/
├── docs/                          # Frontend application
│   ├── app.js                     # Main frontend (549 lines)
│   ├── index.html
│   ├── styles.css
│   ├── metadata/icons.json        # Complete icon catalog
│   ├── raw-svg/                   # SVG storage
│   │   ├── filled/
│   │   │   ├── 16/, 24/, 32/, 40/, 48/
│   │   └── outline/
│   │       ├── 16/, 24/, 32/, 40/, 48/, 64/, 72/
│   └── internals/                 # Technical documentation
├── scripts/                        # Backend utilities
│   ├── sync-category.mjs          # Figma sync
│   ├── sync-all-categories.mjs
│   ├── detect-icon-changes.mjs
│   ├── validate-svgs.mjs
│   ├── utils.mjs                  # Shared utilities
│   └── config.mjs                 # Centralized config
├── package.json                   # Dependencies & scripts
├── eslint.config.mjs              # Code quality rules
├── .prettierrc.json               # Formatting rules
├── .env.example                   # Environment template
└── README.md                       # This file
```

## 🔐 Environment Setup

1. Copy `.env.example` to `.env`
2. Add your Figma API token and file key:
   ```
   FIGMA_API_TOKEN=your_token_here
   FIGMA_FILE_KEY=your_file_key_here
   ```

## 📱 Deployment

Automatically deployed to GitHub Pages:
- Frontend: https://your-username.github.io/icon-library
- Auto-deploys on push to main branch
- Cache busting ensures fresh SVGs

## 📈 Metrics & Goals

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Professional Grade | 7/10 | 9-10/10 | In Progress |
| Code Quality (ESLint) | 0 errors | 0 errors | ✅ |
| Code Formatting | 100% | 100% | ✅ |
| Unit Tests | 0% | 80%+ | Phase 2 |
| Documentation | Organized | Complete | ✅ |
| Pre-commit Hooks | None | Husky | Phase 3 |

## 🤝 Contributing

All code must:
- Pass ESLint checks: `npm run lint`
- Be properly formatted: `npm run format`
- Include tests for new features
- Have clear documentation

## 📝 License

See LICENSE file for details.

## 🎓 Learning Resources

- [docs/internals/CODE_REVIEW_PROFESSIONAL.md](docs/internals/CODE_REVIEW_PROFESSIONAL.md) - Detailed code analysis
- [docs/internals/IMPLEMENTATION_PLAN.md](docs/internals/IMPLEMENTATION_PLAN.md) - Implementation roadmap
- [docs/internals/MAINTENANCE.md](docs/internals/MAINTENANCE.md) - Maintenance guidelines

---

**Last Updated**: January 30, 2026
**Maintained by**: Design Systems Team
**Professional Grade Target**: 10/10
