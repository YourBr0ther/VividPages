import { OllamaClient, Scene } from '../ollama-client';

export interface AnalyzedScene extends Scene {
  visualScore: number; // 0-1 scale for visual appeal
  emotionalIntensity: number; // 0-1 scale
  actionLevel: number; // 0-1 scale
  uniqueness: number; // 0-1 scale for scene uniqueness
  overallScore: number; // Combined score
  tags: string[]; // Scene categorization
}

export interface SceneAnalysisOptions {
  scenesPerChapter?: number;
  minVisualScore?: number;
  preferredTags?: string[];
  avoidTags?: string[];
  model?: string;
}

export class SceneAnalyzer {
  private ollama: OllamaClient;

  constructor(ollamaHost = 'http://localhost:11434', defaultModel = 'llama2') {
    this.ollama = new OllamaClient(ollamaHost, defaultModel);
  }

  async analyzeChapterScenes(
    chapter: { title: string; content: string; order: number },
    options: SceneAnalysisOptions = {}
  ): Promise<AnalyzedScene[]> {
    const {
      scenesPerChapter = 1,
      minVisualScore = 0.3,
      model
    } = options;

    // Step 1: Identify potential scenes
    const candidateScenes = await this.identifyScenes(chapter, model);
    
    if (candidateScenes.length === 0) {
      return [];
    }

    // Step 2: Score each scene for visual potential
    const scoredScenes = await this.scoreScenes(candidateScenes, chapter, model);

    // Step 3: Filter and rank scenes
    const filteredScenes = scoredScenes
      .filter(scene => scene.visualScore >= minVisualScore)
      .sort((a, b) => b.overallScore - a.overallScore);

    // Step 4: Select diverse scenes
    const selectedScenes = this.selectDiverseScenes(
      filteredScenes,
      scenesPerChapter,
      options
    );

    return selectedScenes;
  }

  private async identifyScenes(
    chapter: { title: string; content: string; order: number },
    model?: string
  ): Promise<Scene[]> {
    // Split chapter into smaller sections for analysis
    const sections = this.splitIntoSections(chapter.content, 2000);
    const allScenes: Scene[] = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      const prompt = `
Identify 2-3 visually compelling scenes from this text section. Focus on:
- Action sequences
- Dramatic moments
- Vivid descriptions
- Character interactions
- Emotional climaxes

For each scene, provide:
- Description of what's happening
- Characters present
- Setting/location
- Mood/atmosphere
- Key actions

Text section:
${section}

Return only a JSON array:
[
  {
    "description": "What's happening in the scene",
    "characters": ["character1", "character2"],
    "setting": "Location and environment",
    "mood": "Emotional tone",
    "keyActions": "Main actions taking place"
  }
]
`;

      try {
        const response = await this.ollama.generate(prompt, model, {
          temperature: 0.6,
          num_predict: 1200,
        });

        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const scenes = JSON.parse(jsonMatch[0]);
          
          scenes.forEach((scene: any, index: number) => {
            allScenes.push({
              id: `scene-${chapter.order}-${i}-${index}`,
              chapterIndex: chapter.order,
              sceneIndex: allScenes.length,
              description: scene.description || '',
              characters: Array.isArray(scene.characters) ? scene.characters : [],
              setting: scene.setting || '',
              mood: scene.mood || '',
              keyActions: scene.keyActions || '',
            });
          });
        }
      } catch (error) {
        console.error(`Error identifying scenes in section ${i}:`, error);
      }
    }

    return allScenes;
  }

  private async scoreScenes(
    scenes: Scene[],
    chapter: { title: string; content: string; order: number },
    model?: string
  ): Promise<AnalyzedScene[]> {
    const scoredScenes: AnalyzedScene[] = [];

    for (const scene of scenes) {
      const prompt = `
Rate this scene on multiple criteria (0-10 scale):

Scene: ${scene.description}
Setting: ${scene.setting}
Characters: ${scene.characters.join(', ')}
Mood: ${scene.mood}
Actions: ${scene.keyActions}

Rate on these criteria:
1. Visual Appeal: How visually interesting/cinematic is this scene?
2. Emotional Intensity: How emotionally engaging is this moment?
3. Action Level: How much action/movement is happening?
4. Uniqueness: How unique/memorable is this scene?

Also categorize with tags (pick 2-3): action, dialogue, romance, conflict, mystery, discovery, travel, indoor, outdoor, crowd, intimate, magical, realistic, dark, bright, peaceful, intense

Return JSON:
{
  "visualScore": 7,
  "emotionalIntensity": 8,
  "actionLevel": 5,
  "uniqueness": 6,
  "tags": ["action", "outdoor", "intense"]
}
`;

      try {
        const response = await this.ollama.generate(prompt, model, {
          temperature: 0.4,
          num_predict: 300,
        });

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const scores = JSON.parse(jsonMatch[0]);
          
          // Normalize scores to 0-1 range
          const visualScore = Math.min(scores.visualScore / 10, 1);
          const emotionalIntensity = Math.min(scores.emotionalIntensity / 10, 1);
          const actionLevel = Math.min(scores.actionLevel / 10, 1);
          const uniqueness = Math.min(scores.uniqueness / 10, 1);

          // Calculate overall score with weights
          const overallScore = (
            visualScore * 0.4 +
            emotionalIntensity * 0.25 +
            actionLevel * 0.2 +
            uniqueness * 0.15
          );

          scoredScenes.push({
            ...scene,
            visualScore,
            emotionalIntensity,
            actionLevel,
            uniqueness,
            overallScore,
            tags: Array.isArray(scores.tags) ? scores.tags : [],
          });
        } else {
          // Fallback scoring if JSON parsing fails
          scoredScenes.push({
            ...scene,
            visualScore: 0.5,
            emotionalIntensity: 0.5,
            actionLevel: 0.5,
            uniqueness: 0.5,
            overallScore: 0.5,
            tags: ['unknown'],
          });
        }
      } catch (error) {
        console.error(`Error scoring scene ${scene.id}:`, error);
        // Add scene with default scores
        scoredScenes.push({
          ...scene,
          visualScore: 0.3,
          emotionalIntensity: 0.3,
          actionLevel: 0.3,
          uniqueness: 0.3,
          overallScore: 0.3,
          tags: ['unknown'],
        });
      }
    }

    return scoredScenes;
  }

  private selectDiverseScenes(
    scenes: AnalyzedScene[],
    count: number,
    options: SceneAnalysisOptions
  ): AnalyzedScene[] {
    if (scenes.length <= count) {
      return scenes;
    }

    const selected: AnalyzedScene[] = [];
    const remaining = [...scenes];

    // Always select the highest-scoring scene first
    selected.push(remaining.shift()!);

    // Select remaining scenes for diversity
    while (selected.length < count && remaining.length > 0) {
      let bestIndex = 0;
      let bestScore = 0;

      for (let i = 0; i < remaining.length; i++) {
        const scene = remaining[i];
        let diversityScore = scene.overallScore;

        // Bonus for different settings
        const hasSimilarSetting = selected.some(s => 
          this.isSettingSimilar(s.setting, scene.setting)
        );
        if (!hasSimilarSetting) {
          diversityScore += 0.2;
        }

        // Bonus for different moods
        const hasSimilarMood = selected.some(s => 
          this.isMoodSimilar(s.mood, scene.mood)
        );
        if (!hasSimilarMood) {
          diversityScore += 0.15;
        }

        // Bonus for different tags
        const tagOverlap = this.calculateTagOverlap(selected, scene);
        diversityScore += (1 - tagOverlap) * 0.1;

        // Apply preferences
        if (options.preferredTags) {
          const hasPreferredTag = scene.tags.some(tag => 
            options.preferredTags!.includes(tag)
          );
          if (hasPreferredTag) {
            diversityScore += 0.1;
          }
        }

        if (options.avoidTags) {
          const hasAvoidedTag = scene.tags.some(tag => 
            options.avoidTags!.includes(tag)
          );
          if (hasAvoidedTag) {
            diversityScore -= 0.2;
          }
        }

        if (diversityScore > bestScore) {
          bestScore = diversityScore;
          bestIndex = i;
        }
      }

      selected.push(remaining.splice(bestIndex, 1)[0]);
    }

    return selected;
  }

  private splitIntoSections(text: string, maxLength: number): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sections: string[] = [];
    let currentSection = '';

    for (const sentence of sentences) {
      if (currentSection.length + sentence.length <= maxLength) {
        currentSection += sentence + '.';
      } else {
        if (currentSection) {
          sections.push(currentSection.trim());
        }
        currentSection = sentence + '.';
      }
    }

    if (currentSection) {
      sections.push(currentSection.trim());
    }

    return sections;
  }

  private isSettingSimilar(setting1: string, setting2: string): boolean {
    const keywords1 = setting1.toLowerCase().split(/\s+/);
    const keywords2 = setting2.toLowerCase().split(/\s+/);
    
    const overlap = keywords1.filter(word => keywords2.includes(word)).length;
    return overlap > 0;
  }

  private isMoodSimilar(mood1: string, mood2: string): boolean {
    const moodGroups = [
      ['happy', 'joyful', 'cheerful', 'bright'],
      ['sad', 'melancholy', 'depressed', 'somber'],
      ['tense', 'suspenseful', 'anxious', 'nervous'],
      ['calm', 'peaceful', 'serene', 'tranquil'],
      ['angry', 'furious', 'hostile', 'aggressive'],
      ['mysterious', 'enigmatic', 'puzzling', 'secretive'],
    ];

    const normalize = (mood: string) => mood.toLowerCase().trim();
    const m1 = normalize(mood1);
    const m2 = normalize(mood2);

    // Check if both moods belong to the same group
    return moodGroups.some(group => 
      group.some(word => m1.includes(word)) &&
      group.some(word => m2.includes(word))
    );
  }

  private calculateTagOverlap(selected: AnalyzedScene[], candidate: AnalyzedScene): number {
    const selectedTags = new Set(selected.flatMap(s => s.tags));
    const candidateTags = candidate.tags;
    
    if (candidateTags.length === 0) return 0;
    
    const overlap = candidateTags.filter(tag => selectedTags.has(tag)).length;
    return overlap / candidateTags.length;
  }

  async generateImagePrompts(scenes: AnalyzedScene[], model?: string): Promise<AnalyzedScene[]> {
    const scenesWithPrompts: AnalyzedScene[] = [];

    for (const scene of scenes) {
      const prompt = `
Create a detailed image generation prompt for this scene:

Scene: ${scene.description}
Setting: ${scene.setting}
Characters: ${scene.characters.join(', ')}
Mood: ${scene.mood}
Key Actions: ${scene.keyActions}
Tags: ${scene.tags.join(', ')}

Generate a concise but detailed prompt for AI image generation that captures:
- The visual essence of the scene
- Key characters and their actions
- The setting and atmosphere
- The emotional tone

Keep it under 200 words and focus on visual elements.
`;

      try {
        const imagePrompt = await this.ollama.generate(prompt, model, {
          temperature: 0.7,
          num_predict: 250,
        });

        scenesWithPrompts.push({
          ...scene,
          imagePrompt: imagePrompt.trim(),
        });
      } catch (error) {
        console.error(`Error generating image prompt for scene ${scene.id}:`, error);
        scenesWithPrompts.push({
          ...scene,
          imagePrompt: `${scene.description} in ${scene.setting}, ${scene.mood} atmosphere`,
        });
      }
    }

    return scenesWithPrompts;
  }
}