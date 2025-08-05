const express = require("express");
const router = express.Router();

// ✅ Admin Sends Notification
router.post("/add", async (req, res) => {
  const supabase = req.supabase;
  const { title, message, user_id } = req.body;

  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert([{ title, message, user_id: user_id || null }])
      .select("*")
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Get Notifications for a User
router.get("/:user_id", async (req, res) => {
  const supabase = req.supabase;

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${req.params.user_id},user_id.is.null`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
