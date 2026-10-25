import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import "dotenv/config";

const app = express();
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post("/api/insights", async (req, res) => {
  try {
    const { prompt } = req.body;
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ content: msg.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/news", async (req, res) => {
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content:
            'Search for the 5 most important financial news stories from the last 7 days relevant to retirement planning: Social Security, Fed rates, Medicare, tax laws, 401k rules, inflation, markets. Return ONLY JSON array: [{"headline":"...","summary":"one specific useful sentence for a retirement planner","tag":"Social Security|Fed Rates|Medicare|Tax|Markets|Inflation|401k","time":"X days ago","url":"actual url or null"}]. No markdown.',
        },
      ],
    });
    res.json({ content: msg.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () =>
  console.log("API proxy running on http://localhost:3001")
);
