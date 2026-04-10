# Mouva — Application

This is the main Mouva application — an AI-powered document and presentation designer built with React + Vite.

## Quick Start

### Frontend

```bash
cd playground
cp .env.example .env    # Fill in your API keys
npm install
npm run dev             # http://localhost:5173
```

### Backend (optional)

The backend provides authentication, session storage, and payment processing.

```bash
cd playground/server
cp .env.example .env    # Fill in database, auth, and storage config
npm install
npm run dev             # http://localhost:5800
```

See [server/README.md](server/README.md) for full backend setup including database initialization.

## Project Structure

```
playground/
├── src/
│   ├── routes/          # Page components (AiDesigner, Landing, Auth, etc.)
│   ├── components/      # Shared UI components (Header, NavBar, etc.)
│   ├── plugins/         # Custom pdfme schema plugins
│   ├── api/             # API client
│   └── utils/           # Helpers (image gen, PPT gen, SVG gen, etc.)
├── public/
│   ├── fonts/           # 80+ bundled fonts
│   ├── emojis/          # OpenMoji SVG emojis
│   ├── template-assets/ # Template definitions and thumbnails
│   └── onboarding/      # Onboarding flow images
├── server/              # Express backend
│   ├── routes/          # API endpoints (auth, sessions, payments)
│   ├── services/        # Business logic (email)
│   ├── models/          # SQL schemas and migrations
│   └── config/          # Database and R2 configuration
├── scripts/             # Template asset generation
└── e2e/                 # End-to-end tests
```

## Environment Variables

See `.env.example` for required frontend configuration.
See `server/.env.example` for backend configuration.

## Building for Production

```bash
npm run build           # Output in dist/
npm run preview         # Preview production build
```

## Adding Templates

1. Create a directory with a kebab-case name inside `public/template-assets/`
2. Place a `template.json` file inside the directory
3. Run `npm run generate-template-assets` to generate thumbnails and index