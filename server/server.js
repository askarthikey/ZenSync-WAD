const exp = require("express");
const mongoClient = require("mongodb").MongoClient;
const path = require("path");
require("dotenv").config();
const app = exp();
const cors = require("cors");

app.use(cors());

app.use(exp.json());

app.use(
  "/uploads",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
  },
  exp.static(path.join(__dirname, "uploads")),
);

mongoClient
  .connect(process.env.DB_URL)
  .then((client) => {
    const zensync = client.db("zensync");
    const usersCollection = zensync.collection("usersCollection");
    app.set("zensync", zensync);
    app.set("usersCollection", usersCollection);
    console.log("DB Connection Successful");
  })
  .catch((err) => console.log("Error in connection of database", err));

const userApp = require("./APIs/userApi");
const projectApp = require("./APIs/projectApi");
const notificationApi = require("./APIs/notificationApi");
const reviewApi = require("./APIs/reviewApi");

app.use("/userApi", userApp);
app.use("/projectApi", projectApp);
app.use("/notificationApi", notificationApi);
app.use("/reviewApi", reviewApi);

app.use((err, req, res, next) => {
  res.send({ message: "error", payload: err.message });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server is running on port ${port}`));
