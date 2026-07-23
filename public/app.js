const fileInput = document.getElementById("file-input");
const preview = document.getElementById("preview");
const recognizeBtn = document.getElementById("recognize-btn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const itemsEl = document.getElementById("items");
const rawEl = document.getElementById("raw");

const recipeBtn = document.getElementById("recipe-btn");
const recipeStatusEl = document.getElementById("recipe-status");
const recipeResultEl = document.getElementById("recipe-result");
const recipeListEl = document.getElementById("recipe-list");
const recipeRawEl = document.getElementById("recipe-raw");

let currentDataUrl = null;
let recognizedItems = [];

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    currentDataUrl = reader.result;
    preview.src = currentDataUrl;
    preview.hidden = false;
    recognizeBtn.disabled = false;
    resultEl.hidden = true;
    statusEl.textContent = "";
  };
  reader.readAsDataURL(file);
});

recognizeBtn.addEventListener("click", async () => {
  if (!currentDataUrl) return;

  recognizeBtn.disabled = true;
  statusEl.textContent = "인식 중...";
  resultEl.hidden = true;

  try {
    const res = await fetch("/api/recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: currentDataUrl }),
    });
    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = data.error || "인식에 실패했습니다.";
      return;
    }

    statusEl.textContent = "";
    itemsEl.innerHTML = "";
    recognizedItems = data.items;
    if (data.items.length === 0) {
      itemsEl.innerHTML = "<li>인식된 식재료가 없습니다.</li>";
    } else {
      data.items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        itemsEl.appendChild(li);
      });
    }
    rawEl.textContent = data.raw_model_response;
    resultEl.hidden = false;
    recipeResultEl.hidden = true;
    recipeStatusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = "네트워크 오류가 발생했습니다.";
  } finally {
    recognizeBtn.disabled = false;
  }
});

recipeBtn.addEventListener("click", async () => {
  if (recognizedItems.length === 0) return;

  recipeBtn.disabled = true;
  recipeStatusEl.textContent = "레시피 생성 중...";
  recipeResultEl.hidden = true;

  try {
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: recognizedItems }),
    });
    const data = await res.json();

    if (!res.ok) {
      recipeStatusEl.textContent = data.error || "레시피 생성에 실패했습니다.";
      return;
    }

    recipeStatusEl.textContent = "";
    recipeListEl.innerHTML = "";
    if (data.recipes.length === 0) {
      recipeListEl.innerHTML = "<p>생성된 레시피가 없습니다.</p>";
    } else {
      data.recipes.forEach((recipe) => {
        const card = document.createElement("div");
        card.className = "recipe-card";
        card.innerHTML = `
          <h3>${recipe.title ?? "(제목 없음)"}</h3>
          <p><strong>사용 재료:</strong> ${(recipe.used_ingredients ?? []).join(", ")}</p>
          <p><strong>추가 필요 재료:</strong> ${(recipe.additional_ingredients ?? []).join(", ") || "없음"}</p>
          <p><strong>예상 소요 시간:</strong> ${recipe.estimated_time_minutes ?? "?"}분</p>
          <ol>${(recipe.steps ?? []).map((s) => `<li>${s}</li>`).join("")}</ol>
        `;
        recipeListEl.appendChild(card);
      });
    }
    recipeRawEl.textContent = data.raw_model_response;
    recipeResultEl.hidden = false;
  } catch (err) {
    recipeStatusEl.textContent = "네트워크 오류가 발생했습니다.";
  } finally {
    recipeBtn.disabled = false;
  }
});
