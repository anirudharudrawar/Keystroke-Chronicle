
'use server';
/**
 * @fileOverview Analyzes a sequence of keystrokes to provide insights.
 *
 * - analyzeKeystrokes - Function to trigger the keystroke analysis flow.
 * - AnalyzeKeystrokesInput - Input type for the analysis function.
 * - AnalyzeKeystrokesOutput - Return type for the analysis function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod'; // Use lowercase 'z' for zod import

// Define Input Schema
const AnalyzeKeystrokesInputSchema = z.object({
  keystrokeSequence: z
    .string()
    .min(1, { message: 'Keystroke sequence cannot be empty.' })
    .describe(
      'A string representing the sequence of keys pressed, including special keys like [Enter], [Backspace], [Space]. Example: "H e l l o [Space] W o r l d [Enter]"'
    ),
});
export type AnalyzeKeystrokesInput = z.infer<typeof AnalyzeKeystrokesInputSchema>;

// Define Output Schema
const AnalyzeKeystrokesOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A brief qualitative summary of the typing patterns observed in the sequence.'
    ),
  identifiedPatterns: z
    .array(z.string())
    .describe(
      'Specific patterns identified, e.g., frequent backspaces, use of shortcuts, repetitive sequences, common programming symbols.'
    ),
});
export type AnalyzeKeystrokesOutput = z.infer<typeof AnalyzeKeystrokesOutputSchema>;

// Define the Prompt
const analyzePrompt = ai.definePrompt({
  name: 'analyzeKeystrokesPrompt',
  input: { schema: AnalyzeKeystrokesInputSchema },
  output: { schema: AnalyzeKeystrokesOutputSchema },
  prompt: `You are a typing analysis assistant. Your task is to analyze the following sequence of keystrokes captured from a user session.

Provide a brief, insightful summary (1-2 sentences) of the observed typing style or notable patterns.

Also, list any specific, interesting patterns you identify. Focus on behavioral patterns rather than the content typed. Examples include:
- Frequent error corrections (e.g., many '[Backspace]' keys).
- Use of common keyboard shortcuts (e.g., '[Ctrl] c', '[Ctrl] v', '[Alt] [Tab]').
- Potential repetitive strain risks (e.g., long sequences of the same key or very simple alternations).
- Indications of specific activities (e.g., frequent use of programming symbols like '{}();', navigation keys like '[ArrowUp]' '[Home]').
- Speed indicators (e.g. bursts of typing followed by pauses, smooth flow vs hesitant typing - infer this qualitatively if possible).
- Use of navigation keys (e.g. extensive use of arrow keys, page up/down).

Keep the identified patterns concise. Do NOT try to interpret the meaning of the typed text itself. Only analyze the pattern of keystrokes.

Keystroke Sequence:
{{{keystrokeSequence}}}
`,
  // Example config to potentially reduce blocking for slightly sensitive patterns, adjust as needed
  config: {
      safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ]
  }
});

// Define the Flow
const analyzeKeystrokesFlow = ai.defineFlow(
  {
    name: 'analyzeKeystrokesFlow',
    inputSchema: AnalyzeKeystrokesInputSchema,
    outputSchema: AnalyzeKeystrokesOutputSchema,
  },
  async (input) => {
    console.log('Analyzing keystrokes:', input.keystrokeSequence.substring(0, 100) + '...'); // Log start

    try {
        const result = await analyzePrompt(input);

        if (!result.output) {
            console.error('Analysis prompt returned no output.');
            throw new Error('Analysis failed to generate a response.');
        }

        console.log('Analysis successful:', result.output);
        return result.output; // No need for non-null assertion if checked
    } catch (error) {
        console.error('Error in analyzeKeystrokesFlow:', error);
        // Re-throw the error to be caught by the caller
        throw error;
    }

  }
);

// Exported wrapper function
export async function analyzeKeystrokes(input: AnalyzeKeystrokesInput): Promise<AnalyzeKeystrokesOutput> {
  // Input validation is handled by Zod within the flow itself
  return analyzeKeystrokesFlow(input);
}
