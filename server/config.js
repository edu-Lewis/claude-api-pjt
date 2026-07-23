require("dotenv").config();

const config = {
  port: process.env.PORT || 3000,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  visionModel: "nvidia/nemotron-nano-12b-v2-vl:free",
};

function validateEnv() {
  if (!config.openrouterApiKey) {
    throw new Error(
      "OPENROUTER_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요."
    );
  }
}

module.exports = { config, validateEnv };
