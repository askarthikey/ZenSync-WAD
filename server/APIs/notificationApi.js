const express = require("express");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middlewares/auth");
const router = express.Router();

router.get("/notifications", authMiddleware, async (req, res, next) => {
  try {
    const db = req.app.get("zensync");
    const accessRequestsCollection = db.collection("accessRequestsCollection");
    const userEmail = req.user.email;
    const notifications = await accessRequestsCollection
      .find({
        $or: [{ editorEmail: userEmail }, { creatorEmail: userEmail }],
      })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    next(error);
  }
});

router.put(
  "/notifications/:id/read",
  authMiddleware,
  async (req, res, next) => {
    try {
      const notificationId = req.params.id;
      const db = req.app.get("zensync");
      const accessRequestsCollection = db.collection(
        "accessRequestsCollection",
      );
      if (!ObjectId.isValid(notificationId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid notification ID" });
      }
      const result = await accessRequestsCollection.updateOne(
        { _id: new ObjectId(notificationId) },
        { $set: { status: "read" } },
      );
      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Notification not found" });
      }
      res.status(200).json({
        success: true,
        message: "Notification marked as read",
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      next(error);
    }
  },
);

router.put(
  "/notifications/mark-all-read",
  authMiddleware,
  async (req, res, next) => {
    try {
      const db = req.app.get("zensync");
      const accessRequestsCollection = db.collection(
        "accessRequestsCollection",
      );
      const userEmail = req.user.email;
      const result = await accessRequestsCollection.updateMany(
        {
          $or: [
            { editorEmail: userEmail, status: "pending" },
            { creatorEmail: userEmail, status: "pending" },
          ],
        },
        { $set: { status: "read" } },
      );
      res.status(200).json({
        success: true,
        message: "All notifications marked as read",
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      next(error);
    }
  },
);

router.get(
  "/notifications/unread-count",
  authMiddleware,
  async (req, res, next) => {
    try {
      const db = req.app.get("zensync");
      const accessRequestsCollection = db.collection(
        "accessRequestsCollection",
      );
      const userEmail = req.user.email;
      const count = await accessRequestsCollection.countDocuments({
        $or: [
          { editorEmail: userEmail, status: "pending" },
          { creatorEmail: userEmail, status: "pending" },
        ],
      });
      res.status(200).json({
        success: true,
        unreadCount: count,
      });
    } catch (error) {
      console.error("Error counting unread notifications:", error);
      next(error);
    }
  },
);

router.delete("/notifications/:id", authMiddleware, async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const db = req.app.get("zensync");
    const accessRequestsCollection = db.collection("accessRequestsCollection");
    if (!ObjectId.isValid(notificationId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notification ID" });
    }
    const userEmail = req.user.email;
    const result = await accessRequestsCollection.deleteOne({
      _id: new ObjectId(notificationId),
      $or: [{ editorEmail: userEmail }, { creatorEmail: userEmail }],
    });
    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Notification not found or you do not have permission to delete it",
        });
    }
    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    next(error);
  }
});

module.exports = router;
