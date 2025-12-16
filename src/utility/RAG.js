const { GoogleGenAI } = require("@google/genai");

// -----------------------------------------------------
// GEMINI SEARCH QUERY ANALYZER (RAG)
// -----------------------------------------------------
async function analyzeSearchQuery(query) {
    try {
        console.log("Analyzing query:", query);

        const prompt = `
      You are a search query parser for a college alumni/student directory.
      Analyze the following search query and extract structured filters.
      
      Query: "${query}"
      
      Available filters:
      - skills (e.g., Java, Python, React, Machine Learning)
      - company (e.g., Google, Microsoft, Amazon)
      - userType (only "student" or "alumni")
      - name (any person's name mentioned)
      - graduationYear (e.g., 2024, 2025)
      - department (e.g., CSE, ECE, Mechanical)
      - section (e.g., A, B, C)
      
      Return ONLY a JSON object with the following keys:
      {
        "skills": ["..."],
        "companies": ["..."],
        "userType": "..." (or null),
        "name": "..." (or null),
        "graduationYear": ["..."],
        "department": ["..."],
        "section": "..." (or null)
      }
      
      If a term is ambiguous (could be a company or skill), infer from context or list in both if unsure, but prefer specific categories.
      If the query is just a name, put it in "name".
      If the query is "Java developers", "Java" is a skill.
      If the query is "Google employees", "Google" is a company.
      
      Example 1: "Vijay at Google knowing React"
      Output: { "skills": ["React"], "companies": ["Google"], "userType": null, "name": "Vijay", "graduationYear": [], "department": [], "section": null }
      
      Example 2: "Alumni working in Microsoft"
      Output: { "skills": [], "companies": ["Microsoft"], "userType": "alumni", "name": null, "graduationYear": [], "department": [], "section": null }
      
      Example 3: "Python developers from CSE 2024"
      Output: { "skills": ["Python"], "companies": [], "userType": null, "name": null, "graduationYear": ["2024"], "department": ["CSE"], "section": null }

      Example 4: "Students of Section A"
      Output: { "skills": [], "companies": [], "userType": "student", "name": null, "graduationYear": [], "department": [], "section": "A" }
      
      Rules:
      - Output ONLY valid JSON.
      - Do not include markdown formatting like \`\`\`json.
    `;

        // -----------------------------------
        //  Initialize Google AI (NEW SDK)
        // -----------------------------------
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const rawText = result.text;
        console.log("RAG Output:", rawText);

        // ------------------------------
        // SAFE JSON PARSE
        // ------------------------------
        try {
            // Clean up any markdown code blocks if present
            const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (err) {
            console.log("⚠ Fixing invalid JSON...");
            const extracted = rawText.match(/\{[\s\S]*\}/);
            return extracted ? JSON.parse(extracted[0]) : { skills: [], companies: [], userType: null, name: query, graduationYear: [], department: [], section: null };
        }

    } catch (err) {
        console.error("RAG Analysis error:", err);
        return { skills: [], companies: [], userType: null, name: query, graduationYear: [], department: [], section: null };
    }
}

module.exports = analyzeSearchQuery;
