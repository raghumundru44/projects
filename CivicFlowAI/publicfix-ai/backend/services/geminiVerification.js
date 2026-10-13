const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

/**
 * Runs AI photo comparison using Gemini Vision.
 * Returns a structured verdict: LIKELY_RESOLVED, NOT_RESOLVED, or NEEDS_REVIEW.
 * 
 * IMPORTANT: API key is only on backend. Never exposed to frontend.
 */
async function runVerification(originalImagePath, completionImagePath, category) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  // Validate files exist
  if (!fs.existsSync(originalImagePath)) {
    throw new Error('Original image file not found on server.');
  }
  if (!fs.existsSync(completionImagePath)) {
    throw new Error('Completion image file not found on server.');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Read images as base64
  const originalData = fs.readFileSync(originalImagePath);
  const completionData = fs.readFileSync(completionImagePath);

  const originalBase64 = originalData.toString('base64');
  const completionBase64 = completionData.toString('base64');

  const originalMime = getMimeType(originalImagePath);
  const completionMime = getMimeType(completionImagePath);

  const prompt = `You are an AI assistant helping a municipal authority verify whether a public issue has been resolved.

You are given TWO images:
- Image 1: The ORIGINAL photograph showing the public problem (category: ${category})
- Image 2: The COMPLETION photograph uploaded by a municipal officer claiming the issue is resolved

Your task is to analyze both images carefully and provide a structured JSON assessment.

Instructions:
1. Compare the visible issue in Image 1 with the current state in Image 2.
2. Determine whether the same location or issue area appears to be shown in both images.
3. Identify visible improvements or any remaining visible problems.
4. Flag images that are unclear, unrelated, or insufficient to judge.
5. Do NOT make definitive legal or official determinations — this is an AI-assisted review only.

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "verdict": "LIKELY_RESOLVED" | "NOT_RESOLVED" | "NEEDS_REVIEW",
  "explanation": "A concise 2-4 sentence explanation of your assessment based on visible evidence.",
  "evidence": "Specific visible observations that support your verdict.",
  "limitations": "What you cannot determine from these images alone, or any concerns about image quality or relevance."
}

Verdict definitions:
- LIKELY_RESOLVED: The completion image shows clear, visible improvement consistent with addressing the reported issue.
- NOT_RESOLVED: The completion image shows the issue still present or a clearly unrelated scene.
- NEEDS_REVIEW: Images are unclear, too similar to judge, unrelated, or there is insufficient visual information.`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: originalMime,
          data: originalBase64
        }
      },
      {
        inlineData: {
          mimeType: completionMime,
          data: completionBase64
        }
      }
    ]);

    const responseText = result.response.text().trim();

    // Parse JSON response
    let parsed;
    try {
      // Remove potential markdown code blocks
      const cleaned = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse Gemini response:', responseText);
      return {
        verdict: 'NEEDS_REVIEW',
        explanation: 'AI response could not be parsed. Manual review required.',
        evidence: null,
        limitations: 'The AI returned an unexpected response format.'
      };
    }

    // Validate verdict
    const validVerdicts = ['LIKELY_RESOLVED', 'NOT_RESOLVED', 'NEEDS_REVIEW'];
    if (!validVerdicts.includes(parsed.verdict)) {
      parsed.verdict = 'NEEDS_REVIEW';
      parsed.limitations = (parsed.limitations || '') + ' Invalid verdict returned by AI.';
    }

    return {
      verdict: parsed.verdict,
      explanation: parsed.explanation || 'No explanation provided.',
      evidence: parsed.evidence || null,
      limitations: parsed.limitations || null
    };

  } catch (err) {
    console.error('Gemini API error:', err);
    // Handle specific API errors
    if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key')) {
      throw new Error('Gemini API key is invalid or not authorized.');
    }
    if (err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Gemini API quota exceeded. Please try again later.');
    }
    throw new Error(`AI service error: ${err.message}`);
  }
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
  return mimeMap[ext] || 'image/jpeg';
}

module.exports = { runVerification };
