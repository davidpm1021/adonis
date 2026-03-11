import { NextResponse } from "next/server";
import { getAnthropicClient, getModel, logAIUsage } from "@/lib/ai";

// Allowed image MIME types
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// 10 MB max
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Expected JSON shape from the AI
interface PhotoParseItem {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

interface PhotoParseResult {
  items: PhotoParseItem[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  confidence: number;
  assumptions: string[];
}

// Extract JSON from a string that may contain markdown code fences
function extractJSON(text: string): string {
  // Try to find JSON inside ```json ... ``` or ``` ... ``` blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  // Otherwise find first { ... } or [ ... ] block
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  return text.trim();
}

// Compute totals from items
function computeTotals(items: PhotoParseItem[]): PhotoParseResult["totals"] {
  return {
    calories: Math.round(items.reduce((s, i) => s + (i.calories || 0), 0)),
    protein_g: Math.round(items.reduce((s, i) => s + (i.protein_g || 0), 0) * 10) / 10,
    carbs_g: Math.round(items.reduce((s, i) => s + (i.carbs_g || 0), 0) * 10) / 10,
    fat_g: Math.round(items.reduce((s, i) => s + (i.fat_g || 0), 0) * 10) / 10,
    fiber_g: Math.round(items.reduce((s, i) => s + (i.fiber_g || 0), 0) * 10) / 10,
  };
}

const PHOTO_PARSE_PROMPT = `Analyze this food photo. Identify each food item visible and estimate the nutritional macros for each.

Return a JSON object with this exact structure:
{
  "items": [
    {
      "name": "item name",
      "quantity": "estimated amount with unit",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number
    }
  ],
  "totals": {
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number
  },
  "confidence": number (0 to 1, where 1 = very confident identification and estimation),
  "assumptions": ["list any assumptions about portion sizes, preparation methods, or ingredients"]
}

Guidelines:
- Be specific about portion sizes based on visual cues (plate size, utensils, etc.)
- If you can't identify a food clearly, note it in assumptions and provide your best estimate
- Estimate on the conservative side for calories
- Set confidence lower if the image is blurry, dark, or items are hard to identify
- Return ONLY valid JSON, no other text`;

// POST /api/nutrition/photo — Photo-based food parsing via Claude Vision
export async function POST(req: Request) {
  try {
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No image file provided. Send a file with field name 'image'." },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type: ${file.type}. Allowed types: JPEG, PNG, WebP, GIF.`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 10MB.`,
        },
        { status: 400 }
      );
    }

    // Check if API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your-api-key-here") {
      return NextResponse.json(
        {
          success: false,
          error: "AI photo parsing not configured. Set ANTHROPIC_API_KEY in .env.local",
        },
        { status: 503 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    // Send to Claude Vision
    const client = getAnthropicClient();
    const model = getModel("PHOTO_PARSE");

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text",
              text: PHOTO_PARSE_PROMPT,
            },
          ],
        },
      ],
    });

    // Log AI usage
    logAIUsage({
      feature: "photo_parse",
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cached: false,
    });

    // Extract text content from the response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { success: false, error: "AI returned no text content" },
        { status: 502 }
      );
    }

    // Parse JSON from the response (handle markdown code blocks)
    const rawJSON = extractJSON(textBlock.text);
    let parsed: PhotoParseResult;

    try {
      parsed = JSON.parse(rawJSON) as PhotoParseResult;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "AI returned invalid JSON. Please try again with a clearer photo.",
          raw: textBlock.text,
        },
        { status: 502 }
      );
    }

    // Validate the parsed result has the expected shape
    if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "AI could not identify any food items in the photo. Try a clearer, well-lit image.",
        },
        { status: 422 }
      );
    }

    // Normalize items: ensure all numeric fields exist
    parsed.items = parsed.items.map((item) => ({
      name: item.name || "Unknown item",
      quantity: item.quantity || "1 serving",
      calories: Math.round(item.calories || 0),
      protein_g: Math.round((item.protein_g || 0) * 10) / 10,
      carbs_g: Math.round((item.carbs_g || 0) * 10) / 10,
      fat_g: Math.round((item.fat_g || 0) * 10) / 10,
      fiber_g: Math.round((item.fiber_g || 0) * 10) / 10,
    }));

    // Recompute totals from normalized items for consistency
    parsed.totals = computeTotals(parsed.items);

    // Normalize confidence
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence || 0.5));

    // Ensure assumptions is an array
    if (!Array.isArray(parsed.assumptions)) {
      parsed.assumptions = [];
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (err) {
    console.error("[photo-parse] Error:", err);

    // Handle specific Anthropic errors
    if (err instanceof Error) {
      if (err.message.includes("rate_limit") || err.message.includes("429")) {
        return NextResponse.json(
          { success: false, error: "AI rate limit reached. Please try again in a moment." },
          { status: 429 }
        );
      }
      if (err.message.includes("authentication") || err.message.includes("401")) {
        return NextResponse.json(
          { success: false, error: "AI authentication failed. Check your API key." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error during photo analysis",
      },
      { status: 500 }
    );
  }
}
