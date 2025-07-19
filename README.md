# NostrMood - Sentiment Analysis for Nostr Posts

A YakiHonne-compatible smart widget that analyzes the sentiment of Nostr posts. Built with React, TypeScript, and the Nostr protocol.

## Features

- **Sentiment Analysis**: Analyze the emotional tone of any Nostr post
- **Multiple ID Formats**: Support for hex IDs, nevent1, and note1 formats
- **YakiHonne Integration**: Works as a smart widget within the YakiHonne ecosystem
- **Real-time Analysis**: Connects to multiple Nostr relays for post retrieval
- **Share Results**: Share analysis results directly to Nostr (when used in YakiHonne)

## YakiHonne Smart Widget

This application is built using the official YakiHonne Smart Widget Handler SDK, making it compatible with the YakiHonne smart widget infrastructure. When embedded in YakiHonne:

- Automatically detects user context
- Displays connected user information
- Allows sharing analysis results to Nostr
- Seamless integration without extra login steps

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui components
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Nostr**: nostr-tools
- **Sentiment Analysis**: sentiment.js
- **Smart Widget**: smart-widget-handler SDK

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nostr-mood-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

## Usage

### Standalone Mode

1. Enter a Nostr post ID in any supported format:
   - 64-character hex ID
   - nevent1... format
   - note1... format

2. Click "Analyze" to perform sentiment analysis

3. View results including:
   - Sentiment score and classification
   - Positive/negative words identified
   - Post content and metadata

### YakiHonne Widget Mode

When embedded in YakiHonne, the widget automatically:
- Connects to the parent application
- Displays user information
- Provides a "Share Analysis" button to post results to Nostr

## Supported Nostr Relays

- wss://relay.damus.io
- wss://nos.lol
- wss://relay.nostr.band
- wss://nostr-pub.wellorder.net
- wss://relay.current.fyi

## API

The application includes a minimal Express.js backend for:
- Serving the frontend in production
- Future API endpoints (currently uses in-memory storage)

## Development

### Project Structure

```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Route pages
│   │   └── lib/          # Utilities
├── server/           # Express backend
├── shared/           # Shared types and schemas
└── dist/             # Production build
```

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## YakiHonne Hackathon

This project was built for the YakiHonne hackathon and complies with the requirement to use the official YakiHonne SDK for smart widget development.