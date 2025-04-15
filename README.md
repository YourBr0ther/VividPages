# VividPages - Enhanced eBook Reader with AI-Generated Imagery

![VividPages Logo](icon.png)

VividPages is an innovative eBook reader that brings stories to life by combining text, audio narration, and AI-generated imagery. It transforms your reading experience by automatically generating visual scenes and character representations as you progress through the book.

## Features

- **ePUB Support**: Upload and read your ePUB files with ease
- **AI-Generated Imagery**: Automatic scene generation for each chapter
- **Character Visualization**: Dynamic character image updates based on text descriptions
- **Audio Synchronization**: Synchronized text highlighting with audio narration
- **Responsive Design**: Beautiful interface that works across all devices
- **Accessibility**: WCAG-compliant with screen reader support and keyboard navigation
- **Customization**: Adjust reading preferences, image styles, and audio settings

## Technical Stack

- **Frontend**: React with TypeScript
- **ePUB Handling**: epub.js / @gxl/epub-parser
- **Audio Playback**: Web Audio API with wavesurfer.js
- **Image Generation**: Flux AI via fal.ai API
- **Storage**: IndexedDB for client-side storage

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YourBr0ther/VividPages.git
cd VividPages
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Build for production:
```bash
npm run build
# or
yarn build
```

5. Preview production build:
```bash
npm run preview
# or
yarn preview
```

## Project Structure

- `src/` - Source code
  - `components/` - React components
  - `services/` - Business logic and API integrations
  - `utils/` - Helper functions and utilities
  - `styles/` - CSS and styling
  - `assets/` - Static assets
  - `types/` - TypeScript type definitions
  - `tests/` - Test files

## Documentation

- [Tasks](TASKS.md) - Implementation tasks and timeline
- [Planning](PLANNING.md) - Project overview and technical specifications
- [Design](DESIGN.md) - UI/UX design specifications

## Contributing

We welcome contributions! Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Flux AI for image generation capabilities
- The open-source community for various libraries and tools used in this project

## Contact

For questions or support, please open an issue in the GitHub repository. 