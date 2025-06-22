import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { GoogleGenAI } from "@google/genai";

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => c.text("Hello from AlgoNudge API!"));

app.post("/hint", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid API key" }, 401);
  }

  const apiKey = authHeader.split(" ")[1];
  const { code, prompt, title, description } = await c.req.json();

  try {
    const ai = new GoogleGenAI({ apiKey });

    const fullPrompt = `
You're helping a developer understand and improve their LeetCode solution.
Below is the problem and their code:

Title: ${title}

Description:
${description}

Code:
${code}

User's Question:
${prompt}

---

Example Use Case:

Problem:
"Two Sum"

Description:
Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.

Code:
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // implementation
    }
};

User's Question:
"I'm getting wrong output for some inputs. What could be wrong?"

Example Hint:
"Check if you're comparing each number with every other number and not skipping any valid pair. Also make sure you're not using the same element twice."

---

Now based on the current problem and code above, give a similar subtle and helpful hint.
Don't give the solution directly.
Just guide the user to think in the right direction.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
          systemInstruction: `
You are a helpful AI assistant for a Chrome extension that gives coding hints to users solving LeetCode problems.

Your goal is to guide the user with subtle, constructive hints to help them think critically and debug their code. Do NOT provide direct answers or full solutions.

Always:
- Consider the user's code, problem description, and their optional question.
- Point out areas they may want to investigate further.
- Offer small nudges, not step-by-step answers.
- Use clear, concise language (1–3 short paragraphs).
- If the user asks again or is unsatisfied, try offering a different perspective or new line of reasoning.
`,
          temperature: 0.7,
        },
      },
    });

    const text = response.text;

    return c.json({ hint: text });
  } catch (error) {
    console.error("Gemini error:", error);
    return c.json({ error: "Failed to generate content" }, 500);
  }
});

serve({
  fetch: app.fetch,
  port: 3000,
});
