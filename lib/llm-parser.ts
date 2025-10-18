import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { WeekScheduleSchema, type WeekSchedule } from "./types";

/**
 * LLM Parsing Prompt
 * This prompt is used to parse Polish gym training schedules from markdown
 */
const PARSING_PROMPT = `You are a data extraction specialist. Parse the provided Polish gym training schedule into a structured JSON format.

## Input Format
The input is a weekly training schedule in Polish markdown format containing:
- Week date range (e.g., "Tydzień 20/10-26/10")
- Daily schedules with training sessions
- Each session includes: training type name, exercises, training method, and duration

## Output Requirements

Create a JSON object with this exact structure:

{
  "week": "DD/MM/YYYY-DD/MM/YYYY",
  "days": [
    {
      "date": "DD.MM",
      "dayName": "string",
      "trainingSessions": [
        {
          "type": "string",
          "exercises": ["string"],
          "trainingMethod": "string",
          "mainPartDuration": "string (number + unit)"
        }
      ]
    }
  ]
}

## Parsing Rules

1. **Week**: Extract from "Tydzień X" header and include full year in format DD/MM/YYYY-DD/MM/YYYY
   - Infer the year from context or current date
   - Handle year boundaries (e.g., "30/12/2024-05/01/2025")
2. **Date**: Extract from format "DD.MM Day" (e.g., "20.10 Poniedziałek")
3. **Day Name**: Polish day name (Poniedziałek, Wtorek, Środa, Czwartek, Piątek, Sobota, Niedziela)
4. **Training Type**: Text after ⇒ symbol (e.g., "Speed", "Athletic", "HYROX SPEED")
   - Keep original casing and spacing
   - Do NOT convert to enum - preserve exact text as it varies
   - Training types can include: "Speed", "Speed Beginners", "HYROX SPEED", "Athletic", "Athletic Beginners", "HYROX ATHLETIC", "FBB", "Calisthenics", "Fast&strong"
5. **Exercises**: Parse from "Ćwiczenia:" line
   - Split by commas
   - Trim whitespace
   - Keep original Polish names and abbreviations
6. **Training Method**: Extract from "Metoda treningowa:" line
   - Preserve full text including numbers
   - Examples: "2 x EMOM", "4 rundy, co 2,5 min wykonaj parę ćwiczeń", "WORK + TABATA"
7. **Duration**: Extract from "Czas pracy w części głównej:" or "Czas pracy w części głównej" line
   - Format: "XX min" (preserve as string)

## Special Cases
- Some days have multiple training sessions (different types) - include all
- Training type names may include "Beginners", "HYROX", etc.
- Handle both "głównej:" and "głównej" spellings
- Ignore non-training content (navigation, images, footer text, links)
- If a day has no sessions, include it with empty trainingSessions array

## Example Output
{
  "week": "20/10/2024-26/10/2024",
  "days": [
    {
      "date": "20.10",
      "dayName": "Poniedziałek",
      "trainingSessions": [
        {
          "type": "Speed",
          "exercises": ["cal SKI/bike ERG", "box jump", "DU (skakanka)", "DB's hang muscle clean + push press"],
          "trainingMethod": "2 x EMOM",
          "mainPartDuration": "21 min"
        },
        {
          "type": "HYROX SPEED",
          "exercises": ["ROW", "burpee broad jump", "SKI/bike ERG", "slam ball lift + slam ball lunge"],
          "trainingMethod": "4 rundy, co 1:30",
          "mainPartDuration": "24 min"
        }
      ]
    }
  ]
}

Parse the entire weekly schedule following these rules strictly. Return only valid JSON, no additional text.

IMPORTANT: The week field MUST include the full year in both dates (DD/MM/YYYY-DD/MM/YYYY format).`;

/**
 * Parse markdown content using LLM to extract structured training schedule
 * @param markdown - Raw markdown content from blog post
 * @param sourceUrl - Source URL of the blog post
 * @returns Parsed and validated WeekSchedule object
 */
export async function parseScheduleWithLLM(
  markdown: string,
  sourceUrl: string
): Promise<WeekSchedule> {
  try {
    console.log("Parsing schedule with LLM...");

    // Use Vercel AI SDK with structured output
    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: WeekScheduleSchema.omit({ sourceUrl: true, scrapedAt: true }),
      prompt: `${PARSING_PROMPT}\n\n## Markdown Content to Parse:\n\n${markdown}`,
      maxRetries: 2,
    });

    if (!result.object) {
      throw new Error("LLM failed to generate valid object");
    }

    // Add metadata
    const schedule: WeekSchedule = {
      ...result.object,
      sourceUrl,
      scrapedAt: new Date().toISOString(),
    };

    // Validate with Zod
    const validated = WeekScheduleSchema.parse(schedule);

    console.log(`Successfully parsed schedule for week: ${validated.week}`);
    console.log(
      `Days: ${validated.days.length}, Total sessions: ${validated.days.reduce(
        (sum, day) => sum + day.trainingSessions.length,
        0
      )}`
    );

    return validated;
  } catch (error) {
    console.error("Error parsing schedule with LLM:", error);
    throw error;
  }
}

/**
 * Parse multiple blog posts and return valid schedules
 * @param posts - Array of blog posts with markdown content
 * @returns Array of successfully parsed schedules
 */
export async function parseAllSchedules(
  posts: Array<{ markdown: string; url: string }>
): Promise<WeekSchedule[]> {
  const schedules: WeekSchedule[] = [];
  const errors: string[] = [];

  for (const post of posts) {
    try {
      const schedule = await parseScheduleWithLLM(post.markdown, post.url);
      schedules.push(schedule);
    } catch (error) {
      const errorMessage = `Failed to parse ${post.url}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      console.error(errorMessage);
      errors.push(errorMessage);
    }
  }

  if (errors.length > 0) {
    console.warn(`Parsing completed with ${errors.length} error(s)`);
  }

  return schedules;
}
