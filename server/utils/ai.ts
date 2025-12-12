export const generatePersonaRewrite = async (originalText: string): Promise<string> => {
    const config = useRuntimeConfig()
    const apiKey = config.public?.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

    if (!apiKey) {
        console.warn('[AI] Missing GOOGLE_GENERATIVE_AI_API_KEY. Using fallback.')
        return "This user has elected to speak in Corporate Email Tone: 'I must respectfully disagree with your statement.'"
    }

    const prompt = `
System / Instruction:
"You rewrite rude or aggressive chat messages into short, playful 'Corporate Email Tone' system responses.
- DO NOT repeat slurs, hate speech, or banned words.
- You must NOT include the original profanity or slur.
- Be clever and light, not mean.
- Speak as the chat system narrating the transformation.
- Maximum 180 characters."

User input example:
original_message: "Man shut the hell up"

Expected output style:
"This user has elected to speak in Corporate Email Tone:
'I must respectfully disagree with your statement.'"

Input message to rewrite:
"${originalText}"
    `

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        })

        if (!response.ok) {
            const err = await response.text()
            console.error('[AI] Gemini API Error:', err)
            throw new Error(`Gemini API returned ${response.status}`)
        }

        const data = await response.json()
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!candidate) {
            throw new Error('No candidate returned from AI model')
        }

        return candidate.trim()

    } catch (error) {
        console.error('[AI] Generation Failed:', error)
        return "This user has elected to speak in Corporate Email Tone: 'I must respectfully disagree with your statement.'"
    }
}
