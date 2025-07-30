import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <div className="mb-8">
        <Image
          src="/icon.png"
          alt="VividPages Logo"
          width={200}
          height={200}
          priority
          className="mx-auto mb-6"
        />
        <h1 className="text-5xl font-serif font-bold text-primary-gold mb-4">
          VividPages
        </h1>
        <p className="text-xl text-text-muted mb-8 max-w-2xl">
          Transform your EPUB books into visual experiences with AI-powered scene and character generation
        </p>
      </div>
      
      <div className="bg-primary-navy/50 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-serif font-semibold mb-6 text-primary-gold">
          Get Started
        </h2>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-primary-gold/30 rounded-lg p-6 hover:border-primary-gold/60 transition-colors">
            <div className="text-primary-gold mb-2">📚</div>
            <p className="text-text-light">
              Upload your EPUB file to begin creating visual stories
            </p>
          </div>
          <a 
            href="/workshop"
            className="block w-full bg-primary-gold hover:bg-accent-gold text-primary-navy font-semibold py-3 px-6 rounded-lg transition-colors text-center"
          >
            Start Creating
          </a>
        </div>
      </div>
      
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mx-4">
        <div className="text-center p-6">
          <div className="text-3xl mb-3">🎨</div>
          <h3 className="text-lg font-serif font-semibold text-primary-gold mb-2">
            AI Visualization
          </h3>
          <p className="text-text-muted text-sm">
            Generate stunning images for key scenes and characters using advanced AI
          </p>
        </div>
        <div className="text-center p-6">
          <div className="text-3xl mb-3">⚡</div>
          <h3 className="text-lg font-serif font-semibold text-primary-gold mb-2">
            Local Processing
          </h3>
          <p className="text-text-muted text-sm">
            Process your books locally with Ollama for privacy and speed
          </p>
        </div>
        <div className="text-center p-6">
          <div className="text-3xl mb-3">📱</div>
          <h3 className="text-lg font-serif font-semibold text-primary-gold mb-2">
            Progressive Web App
          </h3>
          <p className="text-text-muted text-sm">
            Install on any device and enjoy offline access to your visual stories
          </p>
        </div>
      </div>
    </div>
  );
}
