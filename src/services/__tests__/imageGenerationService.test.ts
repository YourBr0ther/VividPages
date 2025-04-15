import { ImageGenerationService } from '../imageGenerationService';
import { Scene } from '../imageGenerationService';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ImageGenerationService', () => {
  const mockConfig = {
    stableDiffusionUrl: 'http://localhost:7860',
    steps: 20,
    cfgScale: 7.5,
    width: 512,
    height: 512
  };

  let service: ImageGenerationService;

  beforeEach(() => {
    // Mock environment variables
    vi.stubEnv('VITE_STABLE_DIFFUSION_URL', mockConfig.stableDiffusionUrl);
    vi.stubEnv('VITE_STABLE_DIFFUSION_STEPS', mockConfig.steps.toString());
    vi.stubEnv('VITE_STABLE_DIFFUSION_CFG_SCALE', mockConfig.cfgScale.toString());
    vi.stubEnv('VITE_STABLE_DIFFUSION_WIDTH', mockConfig.width.toString());
    vi.stubEnv('VITE_STABLE_DIFFUSION_HEIGHT', mockConfig.height.toString());

    service = new ImageGenerationService();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('generateImage', () => {
    it('should generate an image from a prompt', async () => {
      const mockResponse = {
        images: ['base64encodedimage']
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const prompt = 'A beautiful sunset over mountains';
      const result = await service.generateImage(prompt);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.stableDiffusionUrl}/sdapi/v1/txt2img`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt,
            negative_prompt: expect.any(String),
            steps: mockConfig.steps,
            cfg_scale: mockConfig.cfgScale,
            width: mockConfig.width,
            height: mockConfig.height
          })
        })
      );

      expect(result).toBe(mockResponse.images[0]);
    });

    it('should throw an error if the API request fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });

      await expect(service.generateImage('test prompt')).rejects.toThrow(
        'Error generating image: Error: Failed to generate image: Internal Server Error'
      );
    });
  });

  describe('generateSceneImage', () => {
    it('should generate an image for a scene', async () => {
      const mockResponse = {
        images: ['base64encodedimage']
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const scene: Scene = {
        description: 'A beautiful sunset',
        prompt: 'A beautiful sunset over mountains, digital art style',
        chapterId: 'chapter1',
        paragraphIndex: 0
      };

      const result = await service.generateSceneImage(scene);

      expect(result).toEqual({
        ...scene,
        imageData: mockResponse.images[0]
      });
    });

    it('should throw an error if image generation fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });

      const scene: Scene = {
        description: 'A beautiful sunset',
        prompt: 'A beautiful sunset over mountains',
        chapterId: 'chapter1',
        paragraphIndex: 0
      };

      await expect(service.generateSceneImage(scene)).rejects.toThrow(
        'Error generating scene image: Error: Failed to generate image: Internal Server Error'
      );
    });
  });
}); 