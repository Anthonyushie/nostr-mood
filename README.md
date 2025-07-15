# NostrMood - Sentiment Analysis for Nostr Posts

NostrMood is a web application that provides AI-powered sentiment analysis for Nostr posts. It allows users to analyze the emotional tone of any Nostr post by simply entering the post ID, providing insights into positive, negative, and neutral sentiments in decentralized social media.

## 🌟 Features

- **Real-time Sentiment Analysis**: Analyze any Nostr post's emotional tone using advanced NLP
- **Multiple Input Formats**: Supports various Nostr ID formats (hex, nevent1, note1)
- **Comprehensive Results**: Detailed sentiment breakdown with scores and word analysis
- **Multi-relay Support**: Fetches posts from multiple Nostr relays for better coverage
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Theme**: Modern dark UI with purple accent colors
- **Widget Support**: Can be embedded as a widget in other applications

## 🚀 Live Demo

Visit [NostrMood](https://nostrmood.app) to try the application.

## 🛠 Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Nostr Integration**: nostr-tools library
- **Sentiment Analysis**: sentiment.js library
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router DOM
- **Icons**: Lucide React

## 📦 Installation

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Setup

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:8080` to view the application.

## 🎯 Usage

### Analyzing a Nostr Post

1. **Enter Post ID**: Paste any of the following formats:
   - **Hex ID**: 64-character hexadecimal string (e.g., `abc123...`)
   - **nevent**: Nostr event identifier (e.g., `nevent1...`)
   - **note**: Nostr note identifier (e.g., `note1...`)

2. **Click Analyze**: The application will:
   - Validate the input format
   - Query multiple Nostr relays
   - Fetch the post content
   - Perform sentiment analysis
   - Display comprehensive results

3. **View Results**: The analysis includes:
   - **Sentiment Label**: Positive, Negative, or Neutral
   - **Sentiment Score**: Numerical score indicating sentiment strength
   - **Comparative Score**: Normalized score for comparison
   - **Post Content**: Full text of the analyzed post
   - **Author Information**: Truncated public key of the post author
   - **Word Analysis**: Highlighted positive and negative words

### Supported Input Formats

```
# Hex format (64 characters)
a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890

# nevent format
nevent1qqsxyz123...

# note format
note1abc456...
```

## 🔧 Configuration

### Nostr Relays

The application connects to multiple Nostr relays for better post coverage:

- `wss://relay.damus.io`
- `wss://nos.lol`
- `wss://relay.nostr.band`
- `wss://nostr-pub.wellorder.net`
- `wss://relay.current.fyi`

### Sentiment Analysis

The sentiment analysis uses the `sentiment` library with the following metrics:

- **Score**: Sum of sentiment values for all words
- **Comparative**: Score normalized by the number of words
- **Positive/Negative Words**: Arrays of words contributing to sentiment

## 🎨 Design System

### Color Palette

The application uses a custom dark theme with the following color tokens:

```css
/* Primary Colors */
--primary: 262 83% 58% (Purple)
--background: 240 10% 3.9% (Dark Gray)
--foreground: 0 0% 98% (Light Gray)

/* Sentiment Colors */
--positive: 142 76% 36% (Green)
--negative: 0 84% 60% (Red)
--neutral: 240 5% 64.9% (Gray)
```

### Typography

- **Headings**: System font stack with gradient text effects
- **Body**: Clean, readable typography optimized for mobile
- **Code**: Monospace font for technical content

## 📱 Widget Integration

NostrMood can be embedded as a widget in other applications:

### HTML Embed
```html
<iframe 
  src="https://nostrmood.app" 
  width="600" 
  height="400" 
  frameborder="0" 
  allowtransparency="true" 
  scrolling="no">
</iframe>
```

### Widget Configuration

The widget supports the following configuration in `public/.well-known/widget.json`:

- **Type**: sentiment-analyzer
- **Category**: social
- **Tags**: nostr, sentiment, analysis, mood, nlp
- **API Endpoints**: POST /api/analyze

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist` directory.

### Deployment Options

The application can be deployed to:

- **Netlify**: Automatic deployment from Git repository
- **Vercel**: Zero-configuration deployment
- **Static Hosting**: Any static file hosting service

### Environment Variables

No environment variables are required for basic functionality. All configuration is handled client-side.

## 🧪 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Project Structure

```
src/
├── components/
│   ├── ui/                 # Reusable UI components
│   └── NostrMoodAnalyzer.tsx # Main analyzer component
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
├── pages/                  # Page components
└── index.css              # Global styles and design tokens
```

### Key Components

- **NostrMoodAnalyzer**: Main component handling input, analysis, and results
- **UI Components**: shadcn/ui components for consistent design
- **Toast System**: User feedback and error handling

## 🔍 API Reference

### Nostr Integration

The application uses the following Nostr operations:

```typescript
// Query posts by ID
const events = await pool.querySync(relays, {
  ids: [eventId],
  kinds: [1] // Text notes only
});

// Decode Nostr identifiers
const decoded = nip19.decode(identifier);
```

### Sentiment Analysis

```typescript
// Analyze text sentiment
const result = sentiment.analyze(text);

// Result structure
interface SentimentResult {
  score: number;           // Overall sentiment score
  comparative: number;     // Normalized score
  tokens: string[];        // All words
  words: string[];         // Sentiment-bearing words
  positive: string[];      // Positive words
  negative: string[];      // Negative words
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use existing UI components from shadcn/ui
- Maintain responsive design principles
- Add proper error handling
- Write meaningful commit messages

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **Nostr Protocol**: For providing a decentralized social media foundation
- **shadcn/ui**: For the excellent UI component library
- **Tailwind CSS**: For the utility-first CSS framework
- **Sentiment.js**: For the sentiment analysis capabilities

## 📞 Support

For support, questions, or feature requests:

- Open an issue on GitHub
- Visit the [project homepage](https://nostrmood.app)
- Check the widget documentation at `/public/.well-known/widget.json`

## 🔮 Roadmap

- [ ] Advanced sentiment analysis with custom models
- [ ] Batch analysis for multiple posts
- [ ] Historical sentiment tracking
- [ ] Export functionality for analysis results
- [ ] Integration with more Nostr clients
- [ ] Real-time sentiment monitoring
- [ ] Multi-language support

---

**NostrMood** - Bringing emotional intelligence to the decentralized web 🚀