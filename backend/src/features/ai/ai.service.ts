import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../common/config/env';

export class AiService {
  private static genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

  public static async getProfileSuggestions(bio: string, skills: string[]): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `
        You are an expert copywriter and SEO optimizer for content creators.
        Analyze the creator bio and skills below:
        
        BIO: "${bio}"
        SKILLS: ${skills.join(', ')}
        
        Provide constructive recommendations to:
        1. Optimize the bio for professional client engagement and tone.
        2. Format services layout cleanly.
        3. Recommend 5 specific SEO keyword search tags.
        4. Suggest 3 profile hooks to capture clients.
        
        Return your suggestions formatted in clean, easy-to-read Markdown format.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text() || 'No recommendations generated';
    } catch (error) {
      console.error('[AiService] Gemini recommendation error:', error);
      throw { status: 500, message: 'Failed to contact Gemini AI optimizer service' };
    }
  }
}
