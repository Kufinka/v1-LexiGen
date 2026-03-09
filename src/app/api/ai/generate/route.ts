import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiGenerateSchema } from "@/lib/validations";
import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "AI service not configured. Set GROQ_API_KEY." }, { status: 503 });
    }

    const body = await req.json();
    const result = aiGenerateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { words, languageA, languageB } = result.data;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a language learning assistant. Generate natural, contextual sentences for language learners studying ${languageA} and ${languageB}. Return ONLY a valid JSON array of objects with "sideA" (sentence in ${languageA}) and "sideB" (sentence in ${languageB}). No markdown, no explanation.`,
        },
        {
          role: "user",
          content: `Generate 3 to 6 sentences (going from easy to hard, with more easy ones) using these words: ${words.join(", ")}. Use only these words if possible. Each sentence must contain at least one of the provided words. Return a JSON array of {"sideA": "...", "sideB": "..."}.`,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 1024,
    });

    const content = completion.choices[0]?.message?.content || "[]";

    let sentences;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      sentences = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    if (!Array.isArray(sentences)) {
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }

    return NextResponse.json({ sentences });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
