# Enhanced EPUB Chapter Filtering

The enhanced EPUB parser now intelligently filters out non-chapter content to ensure only actual story chapters are processed for character extraction and scene generation.

## What Gets Excluded

### Title/Metadata Patterns
- Title Page, Cover, Front Matter, Back Matter
- Copyright, Dedication, Acknowledgments, About the Author
- Table of Contents, Index, Bibliography, Glossary
- ISBN, Publication info, Legal notices

### Story Structure (Non-Chapter)
- Preface, Foreword, Introduction
- Prologue, Epilogue (can be optionally included)
- Appendix, Notes, References
- "Also by", "Other Books", "More from Author"

### Navigation Elements
- Start, Begin, Go to, Jump to
- Next, Previous, Back, Home

## What Gets Included

### Chapter Identification Patterns
- "Chapter 1", "Chapter One", "Ch. 1", "Ch 1"
- "Part I", "Part 1", "Part One"
- "Section 1", numbered sections like "1.", "2."
- Roman numerals: "I", "II", "III", "IV"

### Content Analysis Scoring System
Each section gets scored based on:

**Pre-filtering**: Sections with less than 100 words are immediately excluded

1. **Title Pattern Match** (+3 points): Looks like "Chapter X"
2. **Substantial Content** (+2 points): More than 200 words
3. **Narrative Content** (+2 points): Contains dialogue, narrative verbs
4. **Character Names** (+1 point): High density of proper nouns (>2%)
5. **Length Bonus** (+1 point): More than 1000 words
6. **Short Title Bonus** (+1 point): Title <20 chars + content >500 words

**Hard Requirements**: 
- Minimum 100 words (absolute cutoff)
- Score 3+ points = Chapter, <3 points = Excluded

## Fallback Protection

If no chapters are detected (over-filtering), the system:
1. Falls back to the 10 longest sections
2. Logs a warning about using fallback mode
3. Ensures users still get processable content

## Processing Feedback

Users see:
- "X chapters available (filtered from Y sections)"
- Console logs showing what was included/excluded
- Processing info with exclusion reasons

## Example Console Output

```
Including chapter: "Chapter 1: The Beginning" (score: 6, words: 1847)
Excluding section: "Copyright" (matches exclude pattern)
Excluding section: "About the Author" (only 67 words, minimum 100)
Excluding section: "Dedication" (score: 1, words: 156) - likely not a chapter
Including chapter: "Chapter 2: The Journey" (score: 5, words: 2134)
Excluding section: "Notes" (too short: 89 words)
```

This ensures clean, story-focused content for AI processing while providing transparency about what was filtered out.