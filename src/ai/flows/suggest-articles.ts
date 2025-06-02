'use server';

/**
 * @fileOverview AI-powered article suggestions based on user goals.
 *
 * - suggestArticles - A function that suggests articles based on user goals.
 * - SuggestArticlesInput - The input type for the suggestArticles function.
 * - SuggestArticlesOutput - The return type for the suggestArticles function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestArticlesInputSchema = z.object({
  userGoals: z
    .string()
    .describe('The user goals for which articles are being suggested.'),
  articleTopics: z.string().describe('A list of available article topics.'),
});
export type SuggestArticlesInput = z.infer<typeof SuggestArticlesInputSchema>;

const SuggestArticlesOutputSchema = z.object({
  suggestedArticles: z
    .array(z.string())
    .describe('The list of suggested article topics relevant to user goals.'),
});
export type SuggestArticlesOutput = z.infer<typeof SuggestArticlesOutputSchema>;

export async function suggestArticles(input: SuggestArticlesInput): Promise<SuggestArticlesOutput> {
  return suggestArticlesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestArticlesPrompt',
  input: {schema: SuggestArticlesInputSchema},
  output: {schema: SuggestArticlesOutputSchema},
  prompt: `You are an AI assistant helping users find relevant articles based on their goals.

  Given the user's goals and a list of available article topics, suggest the most relevant articles.

  User Goals: {{{userGoals}}}
  Available Article Topics: {{{articleTopics}}}

  Suggest only articles from the list of Available Article Topics that directly relate to the User Goals.
  If no articles are relevant, return an empty array.
  `,
});

const suggestArticlesFlow = ai.defineFlow(
  {
    name: 'suggestArticlesFlow',
    inputSchema: SuggestArticlesInputSchema,
    outputSchema: SuggestArticlesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
