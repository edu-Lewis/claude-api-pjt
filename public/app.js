const supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!supabase) {
  console.error("Supabase 클라이언트를 번마오니치 못했습니다.");
}

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

const authLoggedOutEl = document.getElementById("auth-logged-out");
const authLoggedInEl = document.getElementById("auth-logged-in");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const signupBtn = document.getElementById("signup-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const authStatusEl = document.getElementById("auth-status");
const authEmailDisplay = document.getElementById("auth-email-display");

const savedRecipesSectionEl = document.getElementById("saved-recipes-section");
const savedRecipesStatusEl = document.getElementById("saved-recipes-status");
const savedRecipesListEl = document.getElementById("saved-recipes-list");

let currentDataUrl = null;
let recognizedItems = [];
let currentSession = null;

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

function renderRecipeCard(recipe) {
  const card = document.createElement("div");
  card.className = "recipe-card";
  card.innerHTML = `
    <h3>${recipe.title ?? "(제목 없음)"}</h3>
    <p><strong>사용 재료:</strong> ${(recipe.used_ingredients ?? []).join(", ")}</p>
    <p><strong>추가 필요 재료:</strong> ${(recipe.additional_ingredients ?? []).join(", ") || "없음"}</p>
    <p><strong>예상 소요 시간:</strong> ${recipe.estimated_time_minutes ?? "?"}분</p>
    <ol>${(recipe.steps ?? []).map((s) => `<li>${s}</li>`).join("")}</ol>
  `;

  const saveBtn = document.createElement("button");
  saveBtn.textContent = currentSession ? "저장" : "저장 (로그인 필요)";
  saveBtn.disabled = !currentSession;
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "저장 중...";
    const { error } = await supabase.from("recipes_tbl").insert({
      title: recipe.title ?? "(제목 없음)",
      used_ingredients: recipe.used_ingredients ?? [],
      additional_ingredients: recipe.additional_ingredients ?? [],
      steps: recipe.steps ?? [],
      estimated_time_minutes: recipe.estimated_time_minutes ?? null,
    });

    if (error) {
      saveBtn.textContent = "저장 실패";
      console.error("save recipe error:", error.message);
    } else {
      saveBtn.textContent = "저장됨";
      loadSavedRecipes();
    }
  });
  card.appendChild(saveBtn);

  return card;
}

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
        recipeListEl.appendChild(renderRecipeCard(recipe));
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

signupBtn.addEventListener("click", async () => {
  if (!supabase) {
    authStatusEl.textContent = "로그인 기능을 사용할 수 없습니다. 새로고쳨 해주세요.";
    return;
  }
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  if (!email || !password) {
    authStatusEl.textContent = "이메일과 비밀번호를 입력해주세요.";
    return;
  }

  authStatusEl.textContent = "회원가입 중...";
  const { error } = await supabase.auth.signUp({ email, password });
  authStatusEl.textContent = error
    ? error.message
    : "가입 확인을 위해 이메일을 확인해주세요. (확인 후 로그인)";
});

loginBtn.addEventListener("click", async () => {
  if (!supabase) {
    authStatusEl.textContent = "로그인 기능을 사용할 수 없습니다. 새로고쳨 해주세요.";
    return;
  }
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  if (!email || !password) {
    authStatusEl.textContent = "이메일과 비밀번호를 입력해주세요.";
    return;
  }

  authStatusEl.textContent = "로그인 중...";
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    authStatusEl.textContent = error.message;
  }
});

logoutBtn.addEventListener("click", async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
});

function renderSavedRecipe(row) {
  const card = document.createElement("div");
  card.className = "recipe-card";
  card.innerHTML = `
    <h3>${row.title}</h3>
    <p><strong>사용 재료:</strong> ${(row.used_ingredients ?? []).join(", ")}</p>
    <p><strong>추가 필요 재료:</strong> ${(row.additional_ingredients ?? []).join(", ") || "없음"}</p>
    <p><strong>예상 소요 시간:</strong> ${row.estimated_time_minutes ?? "?"}분</p>
    <ol>${(row.steps ?? []).map((s) => `<li>${s}</li>`).join("")}</ol>
  `;

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "삭제";
  deleteBtn.addEventListener("click", async () => {
    deleteBtn.disabled = true;
    const { error } = await supabase.from("recipes_tbl").delete().eq("id", row.id);
    if (error) {
      console.error("delete recipe error:", error.message);
      deleteBtn.disabled = false;
    } else {
      loadSavedRecipes();
    }
  });
  card.appendChild(deleteBtn);

  return card;
}

async function loadSavedRecipes() {
  if (!currentSession) return;

  savedRecipesStatusEl.textContent = "불러오는 중...";
  const { data, error } = await supabase
    .from("recipes_tbl")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    savedRecipesStatusEl.textContent = "레시피를 불러오지 못했습니다.";
    console.error("load saved recipes error:", error.message);
    return;
  }

  savedRecipesStatusEl.textContent = "";
  savedRecipesListEl.innerHTML = "";
  if (data.length === 0) {
    savedRecipesListEl.innerHTML = "<p>저장된 레시피가 없습니다.</p>";
  } else {
    data.forEach((row) => savedRecipesListEl.appendChild(renderSavedRecipe(row)));
  }
}

function updateAuthUI(session) {
  currentSession = session;

  if (session) {
    authLoggedOutEl.hidden = true;
    authLoggedInEl.hidden = false;
    authEmailDisplay.textContent = session.user.email;
    savedRecipesSectionEl.hidden = false;
    loadSavedRecipes();
  } else {
    authLoggedOutEl.hidden = false;
    authLoggedInEl.hidden = true;
    savedRecipesSectionEl.hidden = true;
    savedRecipesListEl.innerHTML = "";
  }
}

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    updateAuthUI(session);
  });

  supabase.auth.getSession().then(({ data }) => {
    updateAuthUI(data.session);
  });
} else {
  authStatusEl.textContent = "로그인 기능을 사용할 수 없습니다. 새로고쳨 해주세요.";
}
