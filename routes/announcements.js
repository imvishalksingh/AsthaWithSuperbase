const express = require("express");
const router = express.Router();

// ✅ Admin Posts Announcement
router.post("/add", async (req, res) => {
  const supabase = req.supabase;
  const { title, message } = req.body;

  try {
    const { data, error } = await supabase
      .from("announcements")
      .insert([{ title, message }])
      .select("*")
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Everyone Views Announcements
router.get("/", async (req, res) => {
  const supabase = req.supabase;

  try {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
