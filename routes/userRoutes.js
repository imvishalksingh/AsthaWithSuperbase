const express = require("express");
const router = express.Router();
const verifyToken = require("../midleware/verifyToken");
const adminOnly = require("../midleware/adminOnly");

// ✅ Cloudinary + Multer Setup
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "aastha-users",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});
const upload = multer({ storage });

// ✅ GET all users or filter by role (Admin Only)
router.get("/", verifyToken, adminOnly, async (req, res) => {
  const supabase = req.supabase;
  const { role } = req.query;

  try {
    const query = supabase
      .from("users")
      .select("id, name, email, role, photo");

    const { data, error } = role
      ? await query.eq("role", role)
      : await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Upload/Update Photo (Admin can update any user)
router.put("/update-photo/:id", verifyToken, adminOnly, upload.single("photo"), async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;

  try {
    if (!req.file) return res.status(400).json({ error: "No photo uploaded" });

    const photoUrl = req.file.path;

    const { error } = await supabase
      .from("users")
      .update({ photo: photoUrl })
      .eq("id", id);

    if (error) throw error;

    res.json({ message: "Photo updated successfully", photo: photoUrl });
  } catch (error) {
    console.error("Error updating photo:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ DELETE Teacher (Admin only, if no pending salaries)
router.delete("/:id", verifyToken, adminOnly, async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;

  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (userError) throw userError;
    if (!user || user.role !== "teacher") {
      return res.status(400).json({ error: "Only teachers can be deleted here" });
    }

    const { data: salaryRows, error: salaryError } = await supabase
      .from("salaries")
      .select("paid")
      .eq("teacher_id", id);

    if (salaryError) throw salaryError;

    const hasPending = salaryRows.some((s) => s.paid === false);
    if (hasPending) {
      return res.status(400).json({
        error: "Cannot delete teacher. Some salary records are still pending.",
      });
    }

    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    res.json({ message: "Teacher deleted successfully" });
  } catch (error) {
    console.error("Error deleting teacher:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Public Teachers Route
router.get("/public-teachers", async (req, res) => {
  const supabase = req.supabase;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role, photo")
      .eq("role", "teacher");

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
