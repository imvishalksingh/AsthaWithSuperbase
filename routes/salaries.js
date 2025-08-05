const express = require("express");
const router = express.Router();

// ✅ Get All Salaries (for Admin UI)
router.get("/", async (req, res) => {
  const supabase = req.supabase;

  try {
    const { data, error } = await supabase
      .from("salaries")
      .select("id, teacher_id, month, amount, paid, paid_date, users(name)")
      .order("id", { ascending: false });

    if (error) throw error;

    const result = data.map((item) => ({
      ...item,
      status: item.paid ? "Paid" : "Pending",
      teacher_name: item.users?.name || "N/A",
    }));

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Admin Adds Salary Record
router.post("/add", async (req, res) => {
  const supabase = req.supabase;
  const { teacher_id, month, amount } = req.body;

  try {
    const { data, error } = await supabase
      .from("salaries")
      .insert([{ teacher_id, month, amount }])
      .select("*")
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Mark Salary as Paid
router.put("/pay/:id", async (req, res) => {
  const supabase = req.supabase;

  try {
    const { data, error } = await supabase
      .from("salaries")
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

// ✅ View Salaries of a Teacher
router.get("/:teacher_id", async (req, res) => {
  const supabase = req.supabase;

  try {
    const { data, error } = await supabase
      .from("salaries")
      .select("*")
      .eq("teacher_id", req.params.teacher_id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
