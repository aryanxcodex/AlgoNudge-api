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
  // console.log(apiKey);
  const { code, prompt, title, description } = await c.req.json();

  try {
    const ai = new GoogleGenAI({ apiKey });

    const fullPrompt = `
You are an expert LeetCode mentor and debugging assistant. Your role is to provide strategic hints that guide users toward the solution without giving it away.

**CONTEXT:**
Problem: ${title}
Description: ${description}
User's Code: ${code}
User's Question: ${prompt}

**YOUR TASK:**
Analyze the code and provide a targeted hint that helps the user discover the issue themselves.

**HINT GUIDELINES:**
✅ DO:
- Pinpoint the specific issue (algorithm, logic, edge case, implementation detail)
- Reference exact line numbers or code sections when relevant
- Ask probing questions that lead to the "aha!" moment
- Suggest debugging techniques or test cases that would reveal the bug
- Point out missed constraints, edge cases, or problem requirements
- Hint at better approaches if the current one is fundamentally flawed
- Use analogies or simpler examples to clarify complex concepts

❌ DON'T:
- Provide the complete solution or corrected code
- Simply restate the problem description
- Give vague advice like "check your logic"
- Overwhelm with multiple hints at once
- Assume what the user already knows

**RESPONSE STRUCTURE:**
🔍 Issue Spotted: [Brief identification of the main problem]
💡 Hint: [Your strategic guidance]
🧪 Test This: [Specific test case or scenario to help verify the fix]

**TONE:** Encouraging, precise, and educational - like a patient mentor guiding discovery.

---

Provide your response now:`;

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
