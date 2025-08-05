const express = require("express");
const router = express.Router();
const supabase = require("../services/superbaseClient"); // ✅ correct import
require("dotenv").config();

// POST /students/admissions/apply
router.post("/apply", async (req, res) => {
  console.log("📥 Incoming request:", req.body);

  try {
    const {
      student_name,
      father_name,
      mother_name,
      dob,
      mobile_number,
      aadhar_number,
      permanent_address,
      father_occupation,
      last_institution,
      religion,
      class_applied,
      parent_email,
      photo_url,
    } = req.body;

    const { error } = await supabase.from("pending_admissions").insert({
      student_name,
      father_name,
      mother_name,
      dob,
      mobile_number,
      aadhar_number,
      permanent_address,
      father_occupation,
      last_institution,
      religion,
      class_applied,
      parent_email,
      photo_url,
    });

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return res.status(500).json({ error: "Failed to submit application" });
    }

    res.status(200).json({ message: "✅ Application submitted successfully" });
  } catch (err) {
    console.error("❌ Catch Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// POST /api/admissions/approve/:id
router.post("/approve/:id", async (req, res) => {
  const id = req.params.id;
  try {
    // Fetch pending admission
    const { data: admission, error: fetchError } = await supabase
      .from("pending_admissions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !admission)
      return res.status(404).json({ error: "Pending admission not found" });

    const className = admission.class_applied;

    // Get max roll number for that class
    const { data: maxRoll, error: rollError } = await supabase
      .from("students")
      .select("roll_no")
      .eq("class", className)
      .order("roll_no", { ascending: false })
      .limit(1)
      .single();

    const nextRoll = maxRoll?.roll_no ? maxRoll.roll_no + 1 : 1;

    // Insert into students
    const { error: insertError } = await supabase.from("students").insert([
      {
        name: admission.student_name,
        class: admission.class_applied,
        roll_no: nextRoll,
        parent_id: null, // You can update this later after parent signup/linking
      },
    ]);

    if (insertError) throw insertError;

    // Delete from pending
    await supabase.from("pending_admissions").delete().eq("id", id);

    res.json({ message: "✅ Admission approved and student added" });
  } catch (err) {
    console.error("❌ Error approving admission:", err.message);
    res.status(500).json({ error: "Failed to approve admission" });
  }
});

// GET /admissions/pending
router.get("/pending", async (req, res) => {
  const { data, error } = await supabase
    .from("pending_admissions")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


module.exports = router;
