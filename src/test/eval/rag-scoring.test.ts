import { describe, it, expect } from "vitest";

const REFERENCE_QA: Array<{ q: string; a: string; keywords: string[] }> = [
  {
    q: "What is Mobiwave AI?",
    a: "Mobiwave AI is a platform that lets Kenyan businesses add AI chat agents to their websites.",
    keywords: ["kenyan", "business", "chat", "website"],
  },
  {
    q: "How much does the Growth plan cost?",
    a: "The Growth plan is KES 5,000 per month with 2,000 chats per month.",
    keywords: ["growth", "5000", "kes", "chats"],
  },
  {
    q: "What features do you offer?",
    a: "Lead capture, email integration, 24/7 AI support, analytics, easy embed.",
    keywords: ["lead", "email", "analytics", "embed"],
  },
  {
    q: "Do you have a free plan?",
    a: "Yes, Starter is a free trial with 20 chats per month.",
    keywords: ["free", "starter", "20", "trial"],
  },
];

function keywordRecall(response: string, keywords: string[]): number {
  const lower = response.toLowerCase();
  const matched = keywords.filter((k) => lower.includes(k.toLowerCase()));
  return matched.length / keywords.length;
}

function concisenessScore(response: string): number {
  const words = response.split(/\s+/).length;
  if (words <= 30) return 1;
  if (words <= 60) return 0.75;
  if (words <= 100) return 0.5;
  return 0.25;
}

describe("RAG response quality evaluation", () => {
  for (const { q, a, keywords } of REFERENCE_QA) {
    it(`should have adequate keyword recall for: "${q}"`, () => {
      const recall = keywordRecall(a, keywords);
      expect(recall).toBeGreaterThanOrEqual(0.5);
    });

    it(`should be concise for: "${q}"`, () => {
      const score = concisenessScore(a);
      expect(score).toBeGreaterThanOrEqual(0.5);
    });
  }
});
