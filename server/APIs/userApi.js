const exp = require("express");
const bcryptjs = require("bcryptjs");
const expAsyncHandler = require("express-async-handler");
const userApp = exp.Router();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const authMiddleware = require("../middlewares/auth");

userApp.use((req, res, next) => {
  usersCollection = req.app.get("usersCollection");
  next();
});

userApp.post(
  "/user",
  expAsyncHandler(async (req, res) => {
    const newUser = req.body;
    const dbUser = await usersCollection.findOne({
      username: newUser.username,
    });
    if (dbUser !== null) {
      res.send({ message: "User already exists" });
    } else {
      const hashedPass = await bcryptjs.hash(newUser.password, 5);
      newUser.password = hashedPass;
      await usersCollection.insertOne(newUser);
      res.status(201).json({ message: "User created successfully!" });
    }
  }),
);

userApp.post(
  "/login",
  expAsyncHandler(async (req, res) => {
    const userCred = req.body;
    const dbUser = await usersCollection.findOne({
      username: userCred.username,
    });
    if (dbUser === null) {
      res.send({ message: "Invalid username or password" });
    } else {
      const status = await bcryptjs.compare(userCred.password, dbUser.password);
      if (status === false) {
        res.send({ message: "Invalid username or password" });
      } else {
        const signedToken = jwt.sign(
          { username: dbUser.username },
          process.env.SECRET_KEY,
        );
        res.send({
          message: "Login Successful",
          token: signedToken,
          user: dbUser,
        });
      }
    }
  }),
);

userApp.get(
  "/user",
  expAsyncHandler(async (req, res) => {
    const users = await usersCollection.find().toArray();
    res.send({ message: "Users list", users: users });
  }),
);

userApp.get(
  "/editors",
  expAsyncHandler(async (req, res) => {
    const editors = await usersCollection
      .find({ userType: "editor" })
      .project({ _id: 1, fullName: 1, email: 1 })
      .toArray();
    const formattedEditors = editors.map((editor) => ({
      id: editor._id,
      name: editor.fullName || editor.username,
      email: editor.email,
    }));
    res.send({ message: "Editors list", editors: formattedEditors });
  }),
);

userApp.get(
  "/usernamebyemail",
  expAsyncHandler(async (req, res) => {
    const users = await usersCollection.find().toArray();
    const usernames = users.map((user) => ({
      username: user.username,
      email: user.email,
    }));
    res.send({ message: "Usernames list", usernames: usernames });
  }),
);

userApp.get("/user/:username", async (req, res, next) => {
  try {
    const username = req.params.username;
    const db = req.app.get("zensync");
    const usersCollection = db.collection("usersCollection");
    const user = await usersCollection.findOne({ username: username });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    delete user.password;
    res.status(200).json({
      success: true,
      user: user,
    });
  } catch (error) {
    next(error);
  }
});

userApp.put(
  "/user/:username/update",
  authMiddleware,
  async (req, res, next) => {
    try {
      const { username } = req.params;
      const updates = req.body;
      const db = req.app.get("zensync");
      const usersCollection = db.collection("usersCollection");
      if (req.user.username !== username) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own profile",
        });
      }
      const allowedUpdates = {
        fullName: updates.fullName,
        bio: updates.bio,
        location: updates.location,
        skills: updates.skills,
        profileImage: updates.profileImage,
      };
      const result = await usersCollection.updateOne(
        { username: username },
        { $set: allowedUpdates },
      );
      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      next(error);
    }
  },
);

userApp.get("/user-by-email", authMiddleware, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email parameter is required",
      });
    }
    const usersCollection = req.app.get("usersCollection");
    const user = await usersCollection.findOne(
      { email },
      { projection: { password: 0 } },
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user by email:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

userApp.get("/editor-ratings", authMiddleware, async (req, res) => {
  try {
    const editorEmail = req.query.email;
    if (!editorEmail) {
      return res.status(400).json({ message: "Editor email is required" });
    }
    const editor = await usersCollection.findOne({ email: editorEmail });
    if (!editor) {
      return res.status(404).json({ message: "Editor not found" });
    }
    const averageRating = editor.rating || 0;
    const totalRatings = editor.totalReviews || 0;
    res.status(200).json({
      averageRating,
      totalRatings,
    });
  } catch (error) {
    console.error("Error fetching editor ratings:", error);
    res
      .status(500)
      .json({ message: "Error fetching editor ratings", error: error.message });
  }
});

module.exports = userApp;
