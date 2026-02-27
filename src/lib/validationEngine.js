export async function runVisionAnalysis(imageUrl, apiKey) {
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama-3.2-90b-vision-preview",
                temperature: 0,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Does this image show real-world civic infrastructure? Does it appear to be AI-generated? Extract: image_description, realism_score (0-100), ai_generated_likelihood (0-100). Return ONLY valid JSON." },
                            { type: "image_url", image_url: { url: imageUrl } }
                        ]
                    }
                ],
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) throw new Error("Vision analysis failed");
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
    } catch (err) {
        console.error("Vision Analysis Error:", err);
        return null; // Fallback gracefully
    }
}

export async function validateComplaint(text, imageUrl, apiKey) {
    try {
        let visionSummary = "";
        if (imageUrl) {
            const visionRes = await runVisionAnalysis(imageUrl, apiKey);
            if (visionRes) {
                visionSummary = `\nIMAGE ANALYSIS:\nDescription: ${visionRes.image_description}\nRealism Score: ${visionRes.realism_score}/100\nAI Generated Likelihood: ${visionRes.ai_generated_likelihood}/100\n`;
            }
        }

        const prompt = `You are an AI Civic Complaint Validation Engine.

Your task is to determine whether a complaint submission is legitimate or suspicious.

Analyze:
- Is the text describing a real civic issue?
- Is the issue realistic and plausible?
- Is the damage description exaggerated or illogical?
- Does the text contain spam, nonsense, or unrelated content?
- If an image description is provided, does it match the complaint text?
- Does the image appear synthetic, AI-generated, cartoonish, or unrealistic?

Complaint Text: "${text}"
${visionSummary}

Return ONLY valid JSON:
{
  "is_valid": true or false,
  "spam_score": 0-100,
  "plausibility_score": 0-100,
  "image_consistency_score": 0-100,
  "fake_probability": 0-100,
  "reason": "clear explanation",
  "confidence": 0-100
}

Rules:
- spam_score > 70 → likely spam
- plausibility_score < 40 → unrealistic claim
- image_consistency_score < 50 → mismatch
- fake_probability > 60 → suspicious
If multiple high-risk factors → is_valid = false`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama3-70b-8192",
                temperature: 0,
                messages: [{ role: "system", content: prompt }],
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) throw new Error("Validation AI failed");
        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);

        // Ensure numeric values
        const spam_score = Number(result.spam_score) || 0;
        const plausibility_score = Number(result.plausibility_score) || 100;
        const image_consistency_score = Number(result.image_consistency_score) || 100;
        const fake_probability = Number(result.fake_probability) || 0;

        // Calculate suspicion risk score
        const riskScore =
            (spam_score * 0.3) +
            ((100 - plausibility_score) * 0.3) +
            ((100 - image_consistency_score) * 0.2) +
            (fake_probability * 0.2);

        result.risk_score = Math.round(riskScore);

        // Override is_valid based on strict mathematical rule defined by user
        if (result.risk_score > 60) {
            result.is_valid = false;
        }

        return result;
    } catch (err) {
        console.error("Pre-Validation Error:", err);
        // If AI fails, fallback to allow so we don't block the system
        return {
            is_valid: true,
            spam_score: 0,
            plausibility_score: 100,
            image_consistency_score: 100,
            fake_probability: 0,
            risk_score: 0,
            reason: "Validation bypassed due to system error",
            confidence: 0
        };
    }
}
