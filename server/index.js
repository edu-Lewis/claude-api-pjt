const path = require("path");
const express = require("express");
const { config, validateEnv } = require("./config");
const recognizeRouter = require("./routes/recognize");
const recipesRouter = require("./routes/recipes");

validateEnv();

const app = express();

app.use(express.json({ limit: "15mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/api", recognizeRouter);
app.use("/api", recipesRouter);

app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
});
