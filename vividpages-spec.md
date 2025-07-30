# VividPages - AI-Powered Visual Book Experience

## Project Overview

VividPages is a Progressive Web Application (PWA) that transforms EPUB books into visual experiences by generating AI-powered images for key scenes and characters. The app processes books locally using Ollama for text analysis and connects to online APIs for high-quality image generation.

## Technology Stack

- **Frontend**: Next.js 14+ (App Router)
- **Deployment**: Docker
- **PWA**: Service Workers, Web App Manifest
- **Local AI**: Ollama (for text processing)
- **Image Generation**: OpenAI DALL-E API or similar
- **File Processing**: epub.js or similar library
- **Styling**: Tailwind CSS
- **State Management**: Zustand or React Context
- **Database**: Local IndexedDB for caching

## Design System

### Brand Colors (Extracted from Logo)
```css
--primary-navy: #1a3a52;
--primary-gold: #f5b342;
--accent-gold: #ffd700;
--background-dark: #0f1e2e;
--text-light: #ffffff;
--text-muted: #94a3b8;
```

### Typography
- **Headings**: Serif font (Playfair Display or similar)
- **Body**: Sans-serif (Inter or similar)
- **Logo Font**: Custom serif style as shown in logo

## Core Features

### 1. EPUB Upload & Processing
- Drag-and-drop interface for EPUB files
- Parse EPUB structure and extract chapters
- Store chapter text in JSON format for future reference
- Progress indicator during processing

### 2. Configuration Interface
- **Chapter Selection**: Slider/input to select number of chapters (X)
- **Scenes per Chapter**: Slider/input for scenes per chapter (Y)
- **Default Values**: 1 chapter, 1 scene
- **Advanced Settings**: 
  - LLM model selection for Ollama
  - Image generation quality settings
  - Character extraction sensitivity

### 3. Character Extraction
- Use Ollama to analyze entire book for character descriptions
- Generate structured JSON with:
  ```json
  {
    "characters": [
      {
        "name": "Character Name",
        "description": "Physical description",
        "personality": "Key traits",
        "imagePrompt": "Detailed prompt for image generation"
      }
    ]
  }
  ```
- Generate character portraits using online AI
- Cache character images for scene generation

### 4. Scene Selection & Analysis
- Process selected chapters through Ollama
- Identify Z most visually compelling scenes
- Extract:
  - Scene description
  - Characters present
  - Setting details
  - Mood/atmosphere
  - Key actions

### 5. Image Generation Pipeline
- Combine scene data with character images
- Create detailed prompts including:
  - Scene description
  - Character references
  - Artistic style preferences
- Send to image generation API
- Handle rate limiting and errors gracefully

### 6. Gallery View
- Grid layout of generated images
- Each image card includes:
  - Generated image
  - 1-2 sentence scene description
  - Chapter and scene reference
  - Options to regenerate or edit
- Filtering by chapter
- Lightbox view for full-size images

### 7. Export & Sharing
- Download all images as ZIP
- Generate PDF with images and descriptions
- Share individual scenes
- Save project for later editing

## Technical Architecture

### Frontend Structure
```
/app
  /api
    /generate-image
    /process-epub
    /analyze-text
  /components
    /upload
    /configuration
    /gallery
    /character-viewer
  /lib
    /epub-parser
    /ollama-client
    /image-generator
    /storage
  /hooks
  /store
  /styles
```

### API Routes
- `/api/process-epub`: Handle EPUB parsing
- `/api/analyze-text`: Ollama integration for text analysis
- `/api/generate-image`: Proxy for image generation APIs
- `/api/characters`: Character extraction and management

### Data Flow
1. User uploads EPUB → Parse and store chapters
2. Extract characters → Generate character images
3. Select chapters/scenes → Analyze with Ollama
4. Generate scene prompts → Create images via API
5. Display in gallery → Allow export/sharing

## PWA Requirements

### Web App Manifest
```json
{
  "name": "VividPages",
  "short_name": "VividPages",
  "description": "Transform books into visual experiences",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f1e2e",
  "theme_color": "#1a3a52",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker Features
- Offline capability for viewing generated content
- Background sync for image generation
- Cache strategies for assets and API responses

## Docker Configuration

### Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  vividpages:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OLLAMA_HOST=http://ollama:11434
    depends_on:
      - ollama
  
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  ollama_data:
```

## Environment Variables
```env
OPENAI_API_KEY=your_api_key
OLLAMA_HOST=http://localhost:11434
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## UI/UX Considerations

### Mobile-First Design
- Responsive grid layouts
- Touch-friendly controls
- Optimized image loading
- Progressive enhancement

### Accessibility
- ARIA labels for all interactive elements
- Keyboard navigation support
- High contrast mode
- Screen reader compatibility

### Performance
- Lazy loading for images
- Virtual scrolling for large galleries
- Web Workers for heavy processing
- Optimistic UI updates

## Security Considerations
- API key encryption
- Rate limiting on API routes
- Input validation for EPUB files
- Content Security Policy headers
- CORS configuration

## Future Enhancements
- Multiple book projects
- Collaborative features
- Custom artistic styles
- Animation between scenes
- Audio narration integration
- Social sharing features

## Development Phases

### Phase 1: Core Infrastructure
- Next.js setup with PWA configuration
- Docker environment
- Basic UI components
- EPUB parsing functionality

### Phase 2: AI Integration
- Ollama setup and integration
- Character extraction logic
- Scene selection algorithm
- Basic image generation

### Phase 3: User Experience
- Gallery interface
- Configuration controls
- Export functionality
- Polish and optimization

### Phase 4: Production Ready
- Error handling
- Performance optimization
- Documentation
- Deployment setup