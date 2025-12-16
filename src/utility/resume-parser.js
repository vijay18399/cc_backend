const { PDFParse } = require("pdf-parse");
const { GoogleGenAI } = require("@google/genai");

// -----------------------------------------------------
// PDF TEXT EXTRACTION
// -----------------------------------------------------
async function extractPdfText(filePath) {
    try {
        const parser = new PDFParse({ url: filePath });
        const result = await parser.getText();

        return result.pages
            ? result.pages.map(p => p.text).join(" ")
            : result.text || "";
    } catch (err) {
        console.error("PDF extraction error:", err);
        return "";
    }
}

// -----------------------------------------------------
// GEMINI RESUME PARSER
// -----------------------------------------------------
async function resumeParser(filePath) {
    try {
        console.log("File received:", filePath);

        const resumeText = await extractPdfText(filePath);

        if (!resumeText.trim()) {
            console.log("❌ No text extracted from PDF");
            return {};
        }

        const prompt = `
You are a resume parser for the *College Connect Alumni Platform*.

Extract the following JSON structure:

{
  "experiences": [
    {
      "companyName": "string",
      "title": "string",
      "startDate": "string", // Strictly YYYY-MM-DD  format. If only year and month, use YYYY-MM-01. E.g., "Feb 2020" -> "2020-02-01".
      "endDate": "string", // Strictly YYYY-MM-DD  format, or 'Present'. If only year and month, use YYYY-MM-01.
      "description": "string"
    }
  ],
  "skills": [
    { "name": "string" }
  ],
  "city": "string", // Infer current city from address or latest job
  "country": "string" // Infer current country from address or latest job
}

Rules:
- Output ONLY valid JSON.
- If a field is missing, use "".
- Use arrays always.
- For city and country, infer from the most recent "Present" job location or contact address.
                                                                                                                              │
RESUME TEXT:                                                                                                                 │
"""                                                                                                                          │
${resumeText}                                                                                                                │
""" 
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
        console.log(rawText)
        // ------------------------------
        // SAFE JSON PARSE
        // ------------------------------
        try {
            return JSON.parse(rawText);
        } catch (err) {
            console.log("⚠ Fixing invalid JSON...");

            const extracted = rawText.match(/\{[\s\S]*\}/);
            return extracted ? JSON.parse(extracted[0]) : {};
        }

    } catch (err) {
        console.error("resumeParser error:", err);
        return {};
    }
}

module.exports = resumeParser;
