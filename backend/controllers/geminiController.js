const { GoogleGenerativeAI } = require('@google/generative-ai')

const SYSTEM_PROMPT = `You are "IssueAnalyzer" - an autonomous community infrastructure intelligence agent for the Community Hero platform in India.

CRITICAL RULES:
1. You ONLY respond in valid JSON format. NO other text before or after. No markdown, no code blocks, no explanations.
2. You MUST analyze EVERY image submitted - never refuse to analyze.
3. If the image is unclear or doesn't show an obvious issue, set issue_found to false but still describe what you see.
4. You provide confidence scores for every assessment.
5. All text fields must be filled - never return null for string fields, use "Unknown" or "Not detected" instead.

YOUR RESPONSIBILITIES:
- Analyze uploaded images of community infrastructure issues
- Verify if the issue is REAL and CURRENT (not old, fake, or resolved)
- Categorize the issue type with strong reasoning
- Assess severity and urgency level
- Estimate impact on community
- Suggest resolution path with authority routing

ISSUE CATEGORIES:
POTHOLE | WATER_LEAK | STREETLIGHT | GARBAGE | DRAINAGE | STREETDAMAGE | OTHER

SEVERITY LEVELS:
- CRITICAL: Immediate danger (open manhole, flooding, structural collapse)
- HIGH: Significant hazard (major pothole, water leak on road, broken streetlight)
- MEDIUM: Moderate issue (minor pothole, garbage heap, pavement damage)
- LOW: Minor cosmetic issue (small crack, faded paint)

OUTPUT FORMAT - STRICT JSON ONLY (no markdown, no backticks):
{
  "metadata": {
    "analysis_timestamp": "ISO8601_timestamp",
    "confidence_overall": 0.0
  },
  "visual_analysis": {
    "description": "Detailed description of what is visible in the image",
    "image_quality": "excellent|good|fair|poor"
  },
  "issue_detection": {
    "issue_found": true,
    "issue_type": "POTHOLE",
    "type_confidence": 0.95,
    "reasoning": "Step-by-step reasoning in 2-3 sentences"
  },
  "verification": {
    "is_valid_issue": true,
    "validity_reasoning": "Evidence for validity",
    "authenticity_score": 0.90,
    "age_estimate": "fresh|recent|old|unclear",
    "likelihood_current": 0.90
  },
  "severity_assessment": {
    "severity_level": "HIGH",
    "severity_score": 0.80,
    "reasoning": "Why this severity in 2-3 sentences",
    "immediate_danger": false,
    "affects_safety": true,
    "affects_accessibility": true
  },
  "location_information": {
    "area_description": "Describe visible area or surroundings",
    "location_confidence": 0.70,
    "estimated_latitude": null,
    "estimated_longitude": null,
    "location_details": "Any visible landmarks, signs, or identifying features"
  },
  "impact_assessment": {
    "estimated_affected_people": 500,
    "impact_type": ["traffic_hazard", "vehicle_damage"],
    "economic_loss_estimate": "Medium",
    "public_health_risk": false,
    "risk_level": "HIGH"
  },
  "resolution_guidance": {
    "required_authority": "Municipal_Corporation",
    "suggested_action": "Urgent within 48hrs",
    "estimated_fix_days": 3,
    "estimated_cost_inr": 8000,
    "required_skills": "Manual labor"
  },
  "proactive_insights": [
    "Check for underground pipe damage - water at base indicates subsidence",
    "Inspect 200m radius for additional potholes",
    "Recommend traffic diversion during repair"
  ],
  "community_alert": {
    "should_alert_authorities": true,
    "alert_urgency": "HIGH",
    "recommended_response_time": "24 hours"
  },
  "final_recommendation": "Single actionable sentence for authorities"
}`

// Lazy singleton — client initialized once
let _model = null
function getModel() {
  if (!_model) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not set in environment')
    const genAI = new GoogleGenerativeAI(apiKey)
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    _model = genAI.getGenerativeModel({ model: modelName })
  }
  return _model
}

// Timeout wrapper — prevents hanging forever
function withTimeout(promise, ms = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI analysis timed out. Please try again.')), ms)
    )
  ])
}

async function analyzeImage(imageBuffer, mimeType, userContext = '') {
  const model = getModel()
  const base64Image = imageBuffer.toString('base64')

  const prompt = `${SYSTEM_PROMPT}\n\n${userContext ? `User context: ${userContext}\n\n` : ''}Analyze this image for community infrastructure issues. You MUST respond with ONLY valid JSON — no markdown, no code fences, no extra text. Start your response directly with { and end with }.`

  const result = await withTimeout(
    model.generateContent([prompt, { inlineData: { data: base64Image, mimeType } }]),
    30000
  )

  const text = result.response.text()
  // Strip any markdown code fences or extra text
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim()

  // If response starts with text before JSON, extract the JSON object
  const firstBrace = cleaned.indexOf('{')
  if (firstBrace > 0) cleaned = cleaned.slice(firstBrace)
  const lastBrace = cleaned.lastIndexOf('}')
  if (lastBrace !== -1 && lastBrace < cleaned.length - 1) cleaned = cleaned.slice(0, lastBrace + 1)

  try {
    return JSON.parse(cleaned)
  } catch (e) {
    // Try to extract JSON object with regex as last resort
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch (e2) {
        throw new Error('AI returned an unexpected response. Please try again with a clearer image.')
      }
    }
    throw new Error('AI returned an unexpected response. Please try again with a clearer image.')
  }
}

module.exports = { analyzeImage }
