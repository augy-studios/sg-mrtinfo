# Singapore MRT Info — Admin Panel

The definitive Singapore MRT Info admin panel for managing stations, platforms, facilities, art pieces, and transfers.

## Features

- Secure login with session management
- Manage stations, platforms, facilities, art pieces, transfers, and API keys
- Installable PWA (works on desktop and mobile)
- Serverless API routes (deployed via Vercel)

## Pages

| Page | Description |
| --- | --- |
| `/` | Login |
| `/dashboard.html` | Overview dashboard |
| `/pages/stations.html` | Stations management |
| `/pages/platforms.html` | Platforms management |
| `/pages/facilities.html` | Facilities management |
| `/pages/artpieces.html` | Art pieces management |
| `/pages/transfers.html` | Transfers management |
| `/pages/apikeys.html` | API keys management |

## Project Structure

```text
admin-panel/
├── api/
│   ├── auth/          # Authentication endpoints
│   └── db/            # Database endpoints
├── pages/             # Page HTML + JS for each data section
├── shared/            # Shared components and styles
├── *.html             # Top-level pages
├── *.css              # Stylesheets
└── *.js               # Page scripts
```

## Deployment

This project is deployed on [Vercel](https://vercel.com). The `api/` folder contains serverless functions that are automatically picked up by Vercel on deploy.

## Requirements

- Node.js >= 18
- A Vercel account for deployment
- Environment variables configured in the Vercel project dashboard

## License

See [LICENSE](LICENSE).
