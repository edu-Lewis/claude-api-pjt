const express = require("express");
const { generateRecipes } = require("../services/openrouter");

const router = express.Router();

router.post("/recipes", async (req, res) => {
  const { items, preferences } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: "먼저 냉장고 사진을 인식해주세요. (items 배열이 비어있습니다)",
    });
  }

  try {
    const result = await generateRecipes(items, preferences);
    res.json(result);
  } catch (err) {
    console.error("recipes error:", err.message);
    res.status(502).json({ error: "레시피 생성 중 오류가 발생했습니다." });
  }
});

module.exports = router;
