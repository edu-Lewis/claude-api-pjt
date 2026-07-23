const { config } = require("../config");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const VISION_SYSTEM_PROMPT =
  "너는 냉장고 내부 사진을 보고 식재료를 인식하는 어시스턴트다. " +
  "사진에서 식별 가능한 식재료명만 한국어로 JSON 배열로 응답해라. " +
  '예: ["계란", "우유", "양파"] ' +
  "다른 설명, 마크다운, 코드블록 없이 JSON 배열 하나만 출력해라.";

const RECIPE_SYSTEM_PROMPT =
  "너는 보유한 식재료를 기반으로 레시피를 추천하는 요리 어시스턴트다. " +
  "사용자가 제공한 보유 재료를 최대한 활용하고, 추가로 필요한 재료는 최소화한 레시피를 2~3개 추천해라. " +
  "다른 설명, 마크다운, 코드블록 없이 아래 형식의 JSON 객체 하나만 출력해라: " +
  '{"recipes":[{"title":"요리명","used_ingredients":["보유 재료 중 사용한 것"],' +
  '"additional_ingredients":["추가로 필요한 재료"],"steps":["1. ...","2. ..."],' +
  '"estimated_time_minutes":15}]}';

function stripCodeFence(text) {
  return text.replace(/```json|```/g, "").trim();
}

function extractJsonArray(text) {
  const cleaned = stripCodeFence(text);
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {
    // fall through to regex fallback
  }
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {
      // give up, caller handles empty result
    }
  }
  return null;
}

function extractJsonObject(text) {
  const cleaned = stripCodeFence(text);
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch (_) {
    // fall through to regex fallback
  }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch (_) {
      // give up, caller handles empty result
    }
  }
  return null;
}

async function callChatCompletion(messages, maxTokens, temperature = 0.2) {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openrouterApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.visionModel,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    const message = data?.error?.message || `OpenRouter 요청 실패 (status ${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return data.choices?.[0]?.message?.content || "";
}

async function recognizeIngredients(imageDataUrl) {
  const rawContent = await callChatCompletion(
    [
      { role: "system", content: VISION_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "이 냉장고 사진 속 식재료를 모두 나열해줘." },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    500
  );

  const items = extractJsonArray(rawContent);

  return {
    items: items || [],
    raw_model_response: rawContent,
    model: config.visionModel,
  };
}

function buildRecipeUserMessage(items, preferences) {
  const lines = [`보유 재료: ${items.join(", ")}`];
  if (preferences?.servings) {
    lines.push(`인분 수: ${preferences.servings}인분`);
  }
  if (preferences?.exclude?.length) {
    lines.push(`제외할 조건/재료: ${preferences.exclude.join(", ")}`);
  }
  lines.push("위 재료로 만들 수 있는 레시피를 추천해줘.");
  return lines.join("\n");
}

// 모델이 보유 재료 목록에 없는 재료를 used_ingredients에 끼워 넣는 환각을 보정한다.
// (input에 없는 항목은 additional_ingredients로 재분류)
function reconcileHallucinatedIngredients(recipe, inputItems) {
  const inputSet = new Set(inputItems.map((s) => s.trim()));
  const used = [];
  const hallucinated = [];

  for (const ing of recipe.used_ingredients || []) {
    if (inputSet.has(String(ing).trim())) {
      used.push(ing);
    } else {
      hallucinated.push(ing);
    }
  }

  const additional = [...new Set([...(recipe.additional_ingredients || []), ...hallucinated])];

  return { ...recipe, used_ingredients: used, additional_ingredients: additional };
}

async function generateRecipes(items, preferences) {
  const recipeMessages = [
    { role: "system", content: RECIPE_SYSTEM_PROMPT },
    { role: "user", content: buildRecipeUserMessage(items, preferences) },
  ];

  let rawContent = await callChatCompletion(recipeMessages, 1000);
  let parsed = extractJsonObject(rawContent);

  if (!Array.isArray(parsed?.recipes)) {
    // 첫 응답이 JSON 형식을 지키지 않은 경우 1회 재시도
    rawContent = await callChatCompletion(recipeMessages, 1000);
    parsed = extractJsonObject(rawContent);
  }

  const recipes = (Array.isArray(parsed?.recipes) ? parsed.recipes : []).map((recipe) =>
    reconcileHallucinatedIngredients(recipe, items)
  );

  return {
    recipes,
    raw_model_response: rawContent,
    model: config.visionModel,
  };
}

module.exports = { recognizeIngredients, generateRecipes };
