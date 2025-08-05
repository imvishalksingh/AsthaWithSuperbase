const express = require("express");
const router = express.Router();
const verifyToken = require("../midleware/verifyToken.js");

// ✅ Get Fees
router.get("/", verifyToken, async (req, res) => {
  const supabase = req.supabase;

  try {
    if (req.user.role === "parent") {
      // Join fees with students to filter by parent_id
      const { data, error } = await supabase
        .from("fees")
        .select("*, students!inner(id, parent_id)")
        .eq("students.parent_id", req.user.id);

      if (error) throw error;
      return res.json(data);
    }

    const { data, error } = await supabase.from("fees").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Add Fee (Admin only)
router.post("/add", verifyToken, async (req, res) => {
  const supabase = req.supabase;

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admin can add fees" });
  }

  const { student_id, amount, due_date } = req.body;

  try {
    const { data, error } = await supabase
      .from("fees")
      .insert([{ student_id, amount, due_date }])
      .select("*")
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Pay Fee (Admin only)
router.put("/pay/:id", verifyToken, async (req, res) => {
  const supabase = req.supabase;

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admin can update fee status" });
  }

  try {
    const { data, error } = await supabase
      .from("fees")
      .update({ paid: true, paid_date: new Date().toISOString() })
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
