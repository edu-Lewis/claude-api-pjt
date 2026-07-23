const express = require("express");
const { recognizeIngredients } = require("../services/openrouter");

const router = express.Router();

router.post("/recognize", async (req, res) => {
  const { image } = req.body;

  if (!image || typeof image !== "string" || !image.startsWith("data:image")) {
    return res.status(400).json({
      error: "유효한 이미지(data:image/... base64)를 image 필드로 전달해주세요.",
    });
  }

  try {
    const result = await recognizeIngredients(image);
    res.json(result);
  } catch (err) {
    console.error("recognize error:", err.message);
    res.status(502).json({ error: "이미지 인식 중 오류가 발생했습니다." });
  }
});

module.exports = router;
