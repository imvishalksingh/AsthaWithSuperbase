const express = require("express");
const router = express.Router();
const verifyToken = require("../midleware/verifyToken.js");

// ✅ Add Student (Admin only)
router.post("/add", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admin can add students" });
  }

  const { name, className, parent_id, roll_no } = req.body;
  try {
    const { data, error } = await req.supabase
      .from("students")
      .insert([{ name, class: className, parent_id, roll_no }])
      .select("*")
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Update Student (Admin + Teacher)
router.put("/:id", verifyToken, async (req, res) => {
  if (!["admin", "teacher"].includes(req.user.role)) {
    return res.status(403).json({ error: "Only admin or teacher can update" });
  }

  const { name, className, parent_id, roll_no } = req.body;
  try {
    const { data, error } = await req.supabase
      .from("students")
      .update({ name, class: className, parent_id, roll_no })
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Get Students (Parents see only their own child)
router.get("/", verifyToken, async (req, res) => {
  const supabase = req.supabase;

  try {
    if (req.user.role === "parent") {
      const { data, error } = await supabase
        .rpc("get_students_with_stats", { parent_id_input: req.user.id });

      if (error) throw error;
      return res.json(data);
    }

    // if (req.user.role === "teacher") {
    //   const { data, error } = await supabase.rpc("get_all_students_with_stats");

    //   if (error) throw error;
    //   return res.json(data);
    // }

    if (req.user.role === "admin" || req.user.role === "teacher") {
      const { data, error } = await supabase.from("students").select("*");
      if (error) throw error;
      return res.json(data);
    }

    return res.status(403).json({ error: "Access denied" });
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Delete Student (Admin only & after clearing fees)
router.delete("/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admin can delete students" });
  }


  router.delete('/:id',(req, res)=>{
      console.log("Hello");
  })
  const supabase = req.supabase;
  const studentId = req.params.id;

  try {
    // Check pending fees
    const { data: unpaidFees, error: feeError } = await supabase
      .from("fees")
      .select("id")
      .eq("student_id", studentId)
      .eq("paid", false);

    if (feeError) throw feeError;

    if (unpaidFees.length > 0) {
      return res.status(400).json({ error: "Clear pending fees before deleting student" });
    }

    // Delete attendance and fees, then student
    await supabase.from("attendance").delete().eq("student_id", studentId);
    await supabase.from("fees").delete().eq("student_id", studentId);

    const { error } = await supabase.from("students").delete().eq("id", studentId);
    if (error) throw error;

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});




module.exports = router;
