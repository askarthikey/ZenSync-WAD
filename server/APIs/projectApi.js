const express = require("express");
const { ObjectId } = require("mongodb");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middlewares/auth");
const router = express.Router();
const uploadDir = path.join(__dirname, "..", "uploads");
const videoDir = path.join(uploadDir, "videos");
const thumbnailDir = path.join(uploadDir, "thumbnails");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir);
}
if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "video") {
      cb(null, videoDir);
    } else if (file.fieldname === "thumbnail") {
      cb(null, thumbnailDir);
    } else {
      cb(new Error("Invalid fieldname"));
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "video") {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed for video field"));
    }
  } else if (file.fieldname === "thumbnail") {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for thumbnail field"));
    }
  } else {
    cb(new Error("Unexpected field"));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: (file) => {
      if (file.fieldname === "video") {
        return 1000 * 1024 * 1024;
      } else if (file.fieldname === "thumbnail") {
        return 500 * 1024 * 1024;
      }
      return 100 * 1024 * 1024;
    },
  },
  fileFilter: fileFilter,
});
const uploadFields = upload.fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message:
          "File too large. Video must be under 1GB and thumbnail under 500MB",
      });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/videos");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "video-" + uniqueSuffix + ext);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 1000 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-ms-wmv",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only video files are allowed"), false);
    }
    cb(null, true);
  },
}).single("video");

router.post(
  "/project",
  (req, res, next) => {
    console.log("Auth header received:", req.headers.authorization);
    next();
  },
  authMiddleware,
  uploadFields,
  handleUploadErrors,
  async (req, res, next) => {
    try {
      const db = req.app.get("zensync");
      const projectsCollection = db.collection("projectsCollection");
      if (
        !req.body.title ||
        !req.body.description ||
        !req.files.video ||
        !req.files.thumbnail ||
        !req.body.tags ||
        !req.body.deadline
      ) {
        return res.status(400).json({
          message:
            "Required fields missing: title, description, video, thumbnail, tags, and deadline",
        });
      }
      const editorEmail = req.body.editorEmail || "";
      if (!req.files || !req.files.video || !req.files.thumbnail) {
        return res
          .status(400)
          .json({ message: "Both video and thumbnail are required" });
      }
      const videoFile = req.files.video[0];
      const thumbnailFile = req.files.thumbnail[0];
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const videoUrl = `${baseUrl}/uploads/videos/${videoFile.filename}`;
      const thumbnailUrl = `${baseUrl}/uploads/thumbnails/${thumbnailFile.filename}`;
      const {
        title,
        description,
        tags,
        deadline,
        userCreated,
        status = "Draft",
      } = req.body;
      if (!title || !description || !tags || !deadline || !userCreated) {
        return res.status(400).json({ message: "All fields are required" });
      }
      let parsedTags = tags;
      if (typeof tags === "string") {
        parsedTags = tags.split(",").map((tag) => tag.trim());
      }
      const project = {
        title,
        videoUrl,
        videoFilename: videoFile.filename,
        description,
        tags: parsedTags,
        editorEmail,
        thumbnailUrl,
        thumbnailFilename: thumbnailFile.filename,
        deadline: new Date(deadline),
        userCreated,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await projectsCollection.insertOne(project);
      if (result.acknowledged) {
        return res.status(201).json({
          message: "Project created successfully",
          project: { ...project, _id: result.insertedId },
        });
      } else {
        fs.unlinkSync(videoFile.path);
        fs.unlinkSync(thumbnailFile.path);
        return res.status(500).json({ message: "Failed to create project" });
      }
    } catch (error) {
      console.error("Error creating project:", error);
      if (req.files) {
        if (req.files.video && req.files.video[0]) {
          fs.unlinkSync(req.files.video[0].path);
        }
        if (req.files.thumbnail && req.files.thumbnail[0]) {
          fs.unlinkSync(req.files.thumbnail[0].path);
        }
      }
      next(error);
    }
  },
);

router.get("/user-projects", authMiddleware, async (req, res, next) => {
  try {
    const db = req.app.get("zensync");
    const projectsCollection = db.collection("projectsCollection");
    const username = req.query.username;
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }
    const projects = await projectsCollection
      .find({ userCreated: username })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json({ projects });
  } catch (error) {
    next(error);
  }
});

router.get("/editor-projects", authMiddleware, async (req, res, next) => {
  try {
    const db = req.app.get("zensync");
    const projectsCollection = db.collection("projectsCollection");
    const reviewsCollection = db.collection("reviewsCollection");
    const editorEmail = req.query.email;
    if (!editorEmail) {
      return res.status(400).json({ message: "Editor email is required" });
    }
    const projects = await projectsCollection
      .find({ editorEmail })
      .sort({ deadline: 1 })
      .toArray();
    const creatorFeedback = [];
    for (const project of projects) {
      const projectReviews = await reviewsCollection
        .find({
          projectId: project._id.toString(),
          creatorUsername: { $ne: req.user.username },
        })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();
      if (projectReviews.length > 0) {
        creatorFeedback.push({
          id: projectReviews[0]._id,
          projectId: project._id,
          title: project.title,
          creator: project.userCreated || "Unknown Creator",
          reviewedOn: projectReviews[0].createdAt,
          comment: projectReviews[0].comment || "",
          status: project.status,
        });
      }
    }
    const sentForReview = creatorFeedback.slice(0, 3);
    res.status(200).json({ projects, sentForReview });
  } catch (error) {
    next(error);
  }
});

router.get("/project/:id", authMiddleware, async (req, res, next) => {
  try {
    const db = req.app.get("zensync");
    const projectsCollection = db.collection("projectsCollection");
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    const project = await projectsCollection.findOne({ _id: new ObjectId(id) });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json({ project });
  } catch (error) {
    next(error);
  }
});

router.put("/project/:id", authMiddleware, async (req, res, next) => {
  try {
    const db = req.app.get("zensync");
    const projectsCollection = db.collection("projectsCollection");
    const id = req.params.id;
    const { status, feedback } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    // Check if project exists
    const existingProject = await projectsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!existingProject) {
      return res.status(404).json({ message: "Project not found" });
    }
    const updateData = {
      $set: {
        updatedAt: new Date(),
      },
    };
    if (status) updateData.$set.status = status;
    if (feedback) updateData.$set.feedback = feedback;
    const result = await projectsCollection.updateOne(
      { _id: new ObjectId(id) },
      updateData,
    );
    if (result.modifiedCount === 0) {
      return res
        .status(400)
        .json({ message: "No changes made to the project" });
    }
    const updatedProject = await projectsCollection.findOne({
      _id: new ObjectId(id),
    });
    res.status(200).json({
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/project/:id/status", authMiddleware, async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { status, completionPercentage } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    const db = req.app.get("zensync");
    const projectsCollection = db.collection("projectsCollection");
    const ObjectId = require("mongodb").ObjectId;
    const updateData = {
      status,
      completionPercentage: completionPercentage || 0,
      updatedAt: new Date().toISOString(),
    };
    const result = await projectsCollection.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: updateData },
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Project not found" });
    }
    const updatedProject = await projectsCollection.findOne({
      _id: new ObjectId(projectId),
    });
    res.status(200).json({
      message: "Project status updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Error updating project status:", error);
    next(error);
  }
});

router.delete("/project/:id", authMiddleware, async (req, res, next) => {
  try {
    const db = req.app.get("zensync");
    const projectsCollection = db.collection("projectsCollection");
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    const project = await projectsCollection.findOne({ _id: new ObjectId(id) });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    const result = await projectsCollection.deleteOne({
      _id: new ObjectId(id),
    });
    if (result.deletedCount === 1) {
      try {
        if (project.videoFilename) {
          const videoPath = path.join(videoDir, project.videoFilename);
          if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
          }
        }
        if (project.thumbnailFilename) {
          const thumbnailPath = path.join(
            thumbnailDir,
            project.thumbnailFilename,
          );
          if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
          }
        }
      } catch (fileError) {
        console.error("Error deleting files:", fileError);
      }
      return res.status(200).json({ message: "Project deleted successfully" });
    } else {
      return res.status(500).json({ message: "Failed to delete project" });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/editors", authMiddleware, async (req, res, next) => {
  try {
    const usersCollection = req.app.get("usersCollection");
    const editors = await usersCollection
      .find({ userType: "editor" })
      .project({ _id: 1, fullName: 1, email: 1 })
      .toArray();
    const formattedEditors = editors.map((editor) => ({
      id: editor._id,
      name: editor.fullName || editor.username,
      email: editor.email,
    }));
    res.status(200).json({ editors: formattedEditors });
  } catch (error) {
    next(error);
  }
});

router.get("/unassigned-projects", authMiddleware, async (req, res, next) => {
  try {
    const db = req.app.get("zensync");
    const projectsCollection = db.collection("projectsCollection");
    const projects = await projectsCollection
      .find({
        $or: [
          { status: "Unassigned" },
          { editorEmail: { $exists: false } },
          { editorEmail: "" },
        ],
      })
      .toArray();
    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Error fetching unassigned projects:", error);
    next(error);
  }
});

router.post(
  "/project/:id/request-access",
  authMiddleware,
  async (req, res, next) => {
    try {
      const {
        editorEmail,
        editorName,
        message,
        projectId,
        projectTitle,
        projectThumbnail,
        creatorUsername,
      } = req.body;
      if (!editorEmail) {
        return res
          .status(400)
          .json({ success: false, message: "Editor email is required" });
      }
      const db = req.app.get("zensync");
      const projectsCollection = db.collection("projectsCollection");
      const accessRequestsCollection = db.collection(
        "accessRequestsCollection",
      );
      const usersCollection = db.collection("usersCollection");
      const project = await projectsCollection.findOne({
        _id: new ObjectId(projectId),
        status: { $ne: "Assigned" },
      });
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found or not available for request",
        });
      }
      const creator = await usersCollection.findOne({
        username: creatorUsername,
      });
      if (!creator) {
        return res
          .status(404)
          .json({ success: false, message: "Project creator not found" });
      }
      const existingRequest = await accessRequestsCollection.findOne({
        projectId: projectId.toString(),
        editorEmail: editorEmail,
        status: "pending",
      });
      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: "You have already requested access to this project",
        });
      }
      const accessRequest = {
        projectId: projectId,
        projectTitle: projectTitle,
        projectThumbnail: projectThumbnail,
        editorEmail: editorEmail,
        editorName: editorName,
        creatorEmail: creator.email,
        creatorName: creatorUsername,
        message: message,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      await accessRequestsCollection.insertOne(accessRequest);
      res.status(201).json({
        success: true,
        message:
          "Access request sent successfully. The creator will be notified.",
        requestId: accessRequest._id,
      });
    } catch (error) {
      console.error("Error in request-access endpoint:", error);
      next(error);
    }
  },
);

router.get(
  "/access-requests/creator",
  authMiddleware,
  async (req, res, next) => {
    try {
      const db = req.app.get("zensync");
      const accessRequestsCollection = db.collection(
        "accessRequestsCollection",
      );
      const projectsCollection = db.collection("projectsCollection");
      const creatorEmail = req.user.email;
      const creatorProjects = await projectsCollection
        .find({
          $or: [
            { creatorEmail: creatorEmail },
            { userCreated: req.user.username },
          ],
        })
        .toArray();
      const creatorProjectIds = creatorProjects.map((project) =>
        project._id.toString(),
      );
      const accessRequests = await accessRequestsCollection
        .find({
          projectId: { $in: creatorProjectIds },
          status: "pending",
        })
        .sort({ createdAt: -1 })
        .toArray();
      res.status(200).json({
        success: true,
        count: accessRequests.length,
        accessRequests,
      });
    } catch (error) {
      console.error("Error fetching creator access requests:", error);
      next(error);
    }
  },
);

router.get(
  "/access-requests/editor",
  authMiddleware,
  async (req, res, next) => {
    try {
      const db = req.app.get("zensync");
      const accessRequestsCollection = db.collection(
        "accessRequestsCollection",
      );

      const editorEmail = req.user.email;
      const accessRequests = await accessRequestsCollection
        .find({
          editorEmail: editorEmail,
        })
        .sort({ createdAt: -1 })
        .toArray();
      res.status(200).json({
        success: true,
        count: accessRequests.length,
        accessRequests,
      });
    } catch (error) {
      console.error("Error fetching editor access requests:", error);
      next(error);
    }
  },
);

router.put(
  "/access-requests/:id/approve",
  authMiddleware,
  async (req, res, next) => {
    try {
      const requestId = req.params.id;
      const db = req.app.get("zensync");
      const accessRequestsCollection = db.collection(
        "accessRequestsCollection",
      );
      const projectsCollection = db.collection("projectsCollection");
      // Check if request exists
      const request = await accessRequestsCollection.findOne({
        _id: new ObjectId(requestId),
      });
      if (!request) {
        return res
          .status(404)
          .json({ success: false, message: "Access request not found" });
      }
      const projectUpdateResult = await projectsCollection.updateOne(
        { _id: new ObjectId(request.projectId) },
        {
          $set: {
            editorEmail: request.editorEmail,
            status: "Assigned",
            assignedAt: new Date().toISOString(),
          },
        },
      );
      if (projectUpdateResult.matchedCount === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }
      await accessRequestsCollection.updateOne(
        { _id: new ObjectId(requestId) },
        { $set: { status: "approved", updatedAt: new Date().toISOString() } },
      );
      await accessRequestsCollection.updateMany(
        {
          projectId: request.projectId,
          _id: { $ne: new ObjectId(requestId) },
          status: "pending",
        },
        { $set: { status: "rejected", updatedAt: new Date().toISOString() } },
      );
      res.status(200).json({
        success: true,
        message: "Editor assigned to project successfully",
      });
    } catch (error) {
      console.error("Error approving access request:", error);
      next(error);
    }
  },
);

router.put(
  "/access-requests/:id/reject",
  authMiddleware,
  async (req, res, next) => {
    try {
      const requestId = req.params.id;
      const db = req.app.get("zensync");
      const accessRequestsCollection = db.collection(
        "accessRequestsCollection",
      );
      const request = await accessRequestsCollection.findOne({
        _id: new ObjectId(requestId),
      });
      if (!request) {
        return res
          .status(404)
          .json({ success: false, message: "Access request not found" });
      }
      const result = await accessRequestsCollection.updateOne(
        { _id: new ObjectId(requestId) },
        { $set: { status: "rejected", updatedAt: new Date().toISOString() } },
      );
      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Access request not found" });
      }
      res.status(200).json({
        success: true,
        message: "Editor request rejected successfully",
      });
    } catch (error) {
      console.error("Error rejecting access request:", error);
      next(error);
    }
  },
);

router.get(
  "/projects/creator/:username",
  authMiddleware,
  async (req, res, next) => {
    try {
      const username = req.params.username;
      const db = req.app.get("zensync");
      const projectsCollection = db.collection("projectsCollection");
      const projects = await projectsCollection
        .find({ userCreated: username })
        .toArray();
      res.status(200).json({
        success: true,
        projects: projects,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/projects/editor/:email",
  authMiddleware,
  async (req, res, next) => {
    try {
      const editorEmail = req.params.email;
      const db = req.app.get("zensync");
      const projectsCollection = db.collection("projectsCollection");
      const projects = await projectsCollection
        .find({ editorEmail: editorEmail })
        .toArray();
      res.status(200).json({
        success: true,
        projects: projects,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put("/close-project/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid project ID" });
    }
    const db = req.app.get("zensync");
    const projectsCollection = db.collection("projectsCollection");
    const result = await projectsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "Closed" } },
    );
    if (result.modifiedCount === 1) {
      return res.status(200).json({ success: true, message: "Project closed" });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }
  } catch (error) {
    console.error("Error closing project:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to close project" });
  }
});

router.post("/add-video-response/:id", (req, res, next) => {
  console.log("Request received for video upload, headers:", {
    auth: req.headers.authorization?.substring(0, 20) + "..." || "MISSING",
    contentType: req.headers["content-type"],
  });
  videoUpload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err);
      return res
        .status(400)
        .json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }
    authMiddleware(req, res, async function (authErr) {
      if (authErr) {
        console.error("Auth error:", authErr);
        return res
          .status(401)
          .json({ success: false, message: "Authentication failed" });
      }
      try {
        const { id } = req.params;
        const { description } = req.body;
        const username = req.user?.username;
        let editorEmail;
        console.log("Processing upload for:", { id, description, username });
        if (!username) {
          return res
            .status(401)
            .json({ success: false, message: "User not found in token" });
        }
        const dbss = req.app.get("zensync");
        const usersCollection = dbss.collection("usersCollection");
        const user = await usersCollection.findOne({ username });
        if (!user) {
          return res
            .status(401)
            .json({ success: false, message: "User not found in database" });
        }
        editorEmail = user.email;
        console.log("Found editor email:", editorEmail);
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid project ID" });
        }
        if (!description) {
          return res
            .status(400)
            .json({ success: false, message: "Description is required" });
        }
        const db = req.app.get("zensync");
        if (!db) {
          console.error("Database connection not available");
          return res
            .status(500)
            .json({ success: false, message: "Database connection error" });
        }
        const projectsCollection = db.collection("projectsCollection");
        const project = await projectsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!project) {
          return res.status(404).json({
            success: false,
            message: "Project not found",
          });
        }
        const videoUrl = req.file
          ? `/uploads/videos/${req.file.filename}`
          : null;
        if (!videoUrl) {
          return res
            .status(400)
            .json({ success: false, message: "No video file uploaded" });
        }
        console.log("Video uploaded successfully:", videoUrl);
        await projectsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $push: {
              resProject: description,
              resVideoLinks: videoUrl,
            },
          },
        );
        res.status(201).json({
          success: true,
          message: "Video response added successfully",
          videoUrl,
          description,
        });
      } catch (error) {
        console.error("Error processing video response:", error);
        res.status(500).json({
          success: false,
          message: "Server error",
          error: error.message,
        });
      }
    });
  });
});

router.post("/add-url-response/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, videoUrl } = req.body;
    const editorEmail = req.user.email;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }
    if (!description) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }
    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: "Video URL is required",
      });
    }
    const projectsCollection = req.app.get("projectsCollection");
    const project = await projectsCollection.findOne({
      _id: new ObjectId(id),
      editorEmail: editorEmail,
    });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or you are not authorized to add responses",
      });
    }
    if (project.status !== "Completed") {
      return res.status(400).json({
        success: false,
        message: "Only completed projects can have video responses",
      });
    }
    const responseEntry = {
      timestamp: new Date(),
      description: description,
      videoUrl: videoUrl,
    };
    await projectsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $push: {
          resProject: description,
          resVideoLinks: videoUrl,
        },
      },
    );
    res.status(201).json({
      success: true,
      message: "Video response added successfully",
      response: responseEntry,
    });
  } catch (error) {
    console.error("Error adding video response:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});
router.get("/project-responses/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid project ID" });
    }
    const db = req.app.get("zensync");
    const projectsCollection = db.collection("projectsCollection");
    const project = await projectsCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { resProject: 1, resVideoLinks: 1 } },
    );
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }
    const responses = [];
    const descriptions = project.resProject || [];
    const videoLinks = project.resVideoLinks || [];
    const maxLength = Math.max(descriptions.length, videoLinks.length);
    for (let i = 0; i < maxLength; i++) {
      responses.push({
        description: descriptions[i] || "",
        videoUrl: videoLinks[i] || null,
        index: i,
      });
    }
    res.status(200).json({
      success: true,
      responses,
    });
  } catch (error) {
    console.error("Error fetching project responses:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/add-video-response/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }
    const db = req.app.get("zensync");
    const projectsCollection = db.collection("projectsCollection");
    const project = await projectsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }
    res.status(200).json({
      success: true,
      project: {
        _id: project._id,
        title: project.title,
        status: project.status,
        editorEmail: project.editorEmail,
        hasResponses:
          Array.isArray(project.resVideoLinks) &&
          project.resVideoLinks.length > 0,
      },
    });
  } catch (error) {
    console.error("Error checking video response status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.post("/add-review", authMiddleware, async (req, res) => {
  try {
    const { projectId, comment, creatorUsername } = req.body;
    if (!ObjectId.isValid(projectId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid project ID" });
    }
    if (!comment) {
      return res
        .status(400)
        .json({ success: false, message: "Comment is required" });
    }
    const db = req.app.get("zensync");
    const projectsCollection = db.collection("projectsCollection");
    const reviewsCollection = db.collection("reviewsCollection");
    const project = await projectsCollection.findOne({
      _id: new ObjectId(projectId),
    });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }
    const review = {
      projectId: new ObjectId(projectId),
      creatorUsername,
      comment,
      createdAt: new Date(),
    };
    await reviewsCollection.insertOne(review);
    res.status(201).json({
      success: true,
      message: "Review added successfully",
      review,
    });
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/project-reviews/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid project ID" });
    }
    const db = req.app.get("zensync");
    const reviewsCollection = db.collection("reviewsCollection");
    const reviews = await reviewsCollection
      .find({ projectId: new ObjectId(id) })
      .sort({ createdAt: 1 })
      .toArray();
    res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error("Error fetching project reviews:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/project-reviews-by-editor", authMiddleware, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Editor email is required" });
    }
    const db = req.app.get("zensync");
    const usersCollection = db.collection("usersCollection");
    const reviewsCollection = db.collection("reviewsCollection");
    const user = await usersCollection.findOne({ email });
    const username = user ? user.username : null;
    if (!username) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const reviews = await reviewsCollection
      .find({ creatorUsername: username })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error("Error fetching editor reviews:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.put("/update-review/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid review ID" });
    }
    if (!comment) {
      return res
        .status(400)
        .json({ success: false, message: "Comment text is required" });
    }
    const db = req.app.get("zensync");
    const reviewsCollection = db.collection("reviewsCollection");
    const existingReview = await reviewsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!existingReview) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }
    if (existingReview.creatorUsername !== req.user.username) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to edit this review",
      });
    }
    const result = await reviewsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          comment: comment,
          updatedAt: new Date(),
        },
      },
    );
    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }
    res.status(200).json({
      success: true,
      message: "Review updated successfully",
    });
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.delete("/delete-review/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid review ID" });
    }
    const db = req.app.get("zensync");
    const reviewsCollection = db.collection("reviewsCollection");
    const existingReview = await reviewsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!existingReview) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }
    if (existingReview.creatorUsername !== req.user.username) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this review",
      });
    }
    const result = await reviewsCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }
    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/creator-feedback-for-editor", authMiddleware, async (req, res) => {
  try {
    const editorEmail = req.query.email;
    // Get the database collections
    const db = req.app.get("zensync");
    const usersCollection = db.collection("usersCollection");
    const projectsCollection = db.collection("projectsCollection");
    const reviewsCollection = db.collection("reviewsCollection");
    const editor = await usersCollection.findOne({ email: editorEmail });
    if (!editor) {
      return res.status(404).json({ message: "Editor not found" });
    }
    const editorProjects = await projectsCollection
      .find({
        editorEmail: editor.email,
      })
      .toArray();
    if (editorProjects.length === 0) {
      return res.json({ success: true, reviews: [] });
    }
    const projectIds = editorProjects.map(
      (project) => new ObjectId(project._id),
    );
    const reviews = await reviewsCollection
      .find({
        projectId: { $in: projectIds },
      })
      .sort({ createdAt: -1 })
      .toArray();
    console.log(
      `Found ${reviews.length} feedback entries for editor ${editor.username}`,
    );
    res.json({ success: true, reviews });
  } catch (error) {
    console.error("Error fetching creator feedback:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching feedback",
      error: error.message,
    });
  }
});

module.exports = router;
