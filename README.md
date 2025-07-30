# VividPages

Transform your EPUB books into stunning visual experiences with AI-powered scene and character generation.

![VividPages Logo](public/icon.png)

## Overview

VividPages is a Progressive Web Application (PWA) that analyzes EPUB books using local AI and generates beautiful images for key scenes and characters. Create visual storybooks, character portraits, and professional exports from your favorite novels.

## ✨ Features

### 📚 EPUB Processing
- **Drag & Drop Upload**: Easy EPUB file processing
- **Chapter Analysis**: Intelligent chapter parsing and content extraction
- **Progress Tracking**: Real-time processing feedback

### 🤖 AI-Powered Analysis
- **Character Extraction**: Automatic character identification with importance scoring
- **Scene Selection**: Visual appeal analysis to find the most compelling scenes
- **Local Processing**: Privacy-first AI processing with Ollama
- **Image Generation**: High-quality images via OpenAI DALL-E

### 🎨 Visual Gallery
- **Advanced Search**: Find images by title, description, or tags
- **Smart Filtering**: Filter by chapter, tags, and creation date
- **Batch Operations**: Select multiple images for bulk actions
- **Lightbox View**: Full-screen image viewing

### 📤 Export & Sharing
- **PDF Generation**: Professional PDFs with embedded images and descriptions
- **ZIP Downloads**: Bulk image downloads with metadata
- **Project Backup**: Save and restore complete projects
- **Social Sharing**: Share individual scenes on social media

### 📱 Progressive Web App
- **Install Anywhere**: Works on desktop, mobile, and tablet
- **Offline Access**: View generated content without internet
- **Mobile Optimized**: Touch-friendly responsive design

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- Docker & Docker Compose (recommended)
- OpenAI API key for image generation

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/vividpages.git
   cd vividpages
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key
   ```

3. **Start with Docker**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Ollama will be available at [http://localhost:11434](http://localhost:11434)

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Ollama**
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Pull recommended model
   ollama pull llama2
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Add your OpenAI API key and configure Ollama host
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

```env
# OpenAI Configuration (Required for image generation)
OPENAI_API_KEY=your_openai_api_key_here

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama2

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Supported Models

**Ollama Models** (for text analysis):
- `llama2` (recommended)
- `mistral`
- `codellama`
- `vicuna`

**Image Models** (OpenAI):
- DALL-E 2 (cost-effective)
- DALL-E 3 (highest quality)

## 📖 How to Use

1. **Upload Your EPUB**
   - Visit the workshop page
   - Drag and drop your EPUB file
   - Wait for parsing to complete

2. **Configure Processing**
   - Select number of chapters to process
   - Choose scenes per chapter
   - Select AI model and quality settings

3. **AI Processing**
   - Characters are automatically extracted
   - Scene analysis identifies visual moments
   - Portrait generation for main characters

4. **Review & Generate**
   - Browse extracted characters
   - Generate additional character portraits
   - View the complete visual gallery

5. **Export & Share**
   - Download images as ZIP
   - Generate professional PDF reports
   - Share individual scenes socially
   - Backup entire projects

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with custom design system
- **AI Integration**: Ollama (local) + OpenAI (cloud)
- **Storage**: IndexedDB for local-first data
- **PWA**: Service Workers with offline support
- **Deployment**: Docker with multi-service orchestration

### Project Structure
```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── workshop/             # Main application
│   ├── api/                  # API routes (9 endpoints)
│   └── globals.css           # Global styles
├── components/
│   ├── upload/               # EPUB file handling
│   ├── configuration/        # AI settings
│   ├── character-viewer/     # Character management
│   ├── gallery/              # Image gallery
│   ├── export/               # Export controls
│   └── sharing/              # Social sharing
├── lib/
│   ├── epub-parser/          # EPUB processing
│   ├── ollama-client/        # AI integration
│   ├── image-generator/      # DALL-E integration
│   ├── storage/              # IndexedDB wrapper
│   ├── pdf/                  # PDF generation
│   └── types/                # TypeScript definitions
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint

# Docker
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose logs vividpages    # View app logs
docker-compose logs ollama        # View Ollama logs
```

### API Endpoints

```
POST /api/process-epub     # EPUB file processing
POST /api/characters       # Character extraction
POST /api/generate-image   # Image generation
POST /api/analyze-text     # Text analysis
GET  /api/health          # Health check

# Export endpoints
POST /api/export/images    # ZIP download
POST /api/export/pdf       # PDF generation
POST /api/export/project   # Project backup
POST /api/import/project   # Project restore
```

## 🎨 Design System

### Brand Colors
- **Primary Navy**: `#1a3a52`
- **Primary Gold**: `#f5b342`
- **Accent Gold**: `#ffd700`
- **Background Dark**: `#0f1e2e`

### Typography
- **Headings**: Playfair Display (serif)
- **Body**: Inter (sans-serif)

## 🔒 Privacy & Security

- **Local-First**: Books are processed locally with Ollama
- **No Data Transmission**: EPUB content never leaves your device
- **API Key Security**: OpenAI keys are server-side only
- **Content Security**: CSP headers and input validation

## 📊 Performance

- **Bundle Size**: ~130KB for main application
- **Image Optimization**: Next.js Image component with lazy loading
- **Caching**: Service worker caching for offline access
- **Database**: IndexedDB for efficient local storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai/) for local AI processing
- [OpenAI](https://openai.com/) for DALL-E image generation
- [epub.js](https://github.com/futurepress/epub.js/) for EPUB parsing
- [jsPDF](https://github.com/parallax/jsPDF) for PDF generation
- [Next.js](https://nextjs.org/) for the React framework

## 📞 Support

- 📖 [Documentation](https://github.com/your-username/vividpages/wiki)
- 🐛 [Report Issues](https://github.com/your-username/vividpages/issues)
- 💬 [Discussions](https://github.com/your-username/vividpages/discussions)

---

**Transform your reading experience with VividPages!** 📚✨