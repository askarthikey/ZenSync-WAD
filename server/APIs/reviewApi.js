const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middlewares/auth");

router.post("/submit-review", authMiddleware, async (req, res) => {
  try {
    const db = req.app.get("zensync");
    const reviewsCollection = db.collection("reviewsCollection");
    const projectsCollection = db.collection("projectsCollection");
    const usersCollection = db.collection("usersCollection");
    const {
      projectId,
      editorEmail,
      rating,
      comments,
      creatorUsername,
      closeProject,
    } = req.body;
    if (!projectId || !editorEmail || !rating || !creatorUsername) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const review = {
      projectId: new ObjectId(projectId),
      editorEmail,
      creatorUsername,
      rating: Number(rating),
      comments: comments || "",
      createdAt: new Date(),
    };
    const result = await reviewsCollection.insertOne(review);
    const updateFields = { hasRated: true };
    if (closeProject !== false) {
      updateFields.status = "Closed";
    }
    await projectsCollection.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: updateFields },
    );
    const allEditorReviews = await reviewsCollection
      .find({ editorEmail })
      .toArray();
    const totalRating = allEditorReviews.reduce(
      (sum, review) => sum + review.rating,
      0,
    );
    const averageRating = totalRating / allEditorReviews.length;
    await usersCollection.updateOne(
      { email: editorEmail },
      {
        $set: {
          rating: parseFloat(averageRating.toFixed(1)),
          totalReviews: allEditorReviews.length,
        },
      },
    );
    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      reviewId: result.insertedId,
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

router.get("/editor/:email", authMiddleware, async (req, res) => {
  try {
    const db = req.app.get("zensync");
    const reviewsCollection = db.collection("reviewsCollection");
    const { email } = req.params;
    const reviews = await reviewsCollection
      .find({ editorEmail: email })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error("Error fetching editor reviews:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

router.get("/project/:projectId", authMiddleware, async (req, res) => {
  try {
    const db = req.app.get("zensync");
    const reviewsCollection = db.collection("reviewsCollection");
    const { projectId } = req.params;
    if (!ObjectId.isValid(projectId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid project ID" });
    }
    const reviews = await reviewsCollection
      .find({ projectId: new ObjectId(projectId) })
      .toArray();
    res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error("Error fetching project reviews:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

router.get("/editor-ratings", async (req, res) => {
  try {
    const db = req.app.get("zensync");
    const usersCollection = db.collection("usersCollection");
    const editors = await usersCollection
      .find({
        userType: "editor",
        rating: { $exists: true },
      })
      .project({
        email: 1,
        fullName: 1,
        username: 1,
        rating: 1,
        totalReviews: 1,
      })
      .toArray();
    res.status(200).json({
      success: true,
      editors,
    });
  } catch (error) {
    console.error("Error fetching editor ratings:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

router.get("/check-review", authMiddleware, async (req, res) => {
  try {
    const { projectId, creatorUsername } = req.query;
    if (!projectId || !creatorUsername) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }
    const db = req.app.get("zensync");
    const reviewsCollection = db.collection("reviewsCollection");
    const review = await reviewsCollection.findOne({
      projectId: new ObjectId(projectId),
      creatorUsername,
    });
    res.status(200).json({
      success: true,
      hasReview: !!review,
    });
  } catch (error) {
    console.error("Error checking review status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
