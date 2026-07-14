import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("DB_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { field_of_study, household_income, average_mark, province } = await req.json();

    // Fetch all active bursaries
    const { data: bursaries, error: bursariesError } = await supabase
      .from("bursaries")
      .select("*")
      .eq("is_active", true);

    if (bursariesError) {
      return new Response(
        JSON.stringify({ error: bursariesError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!bursaries || bursaries.length === 0) {
      return new Response(
        JSON.stringify({ bursaries: [] }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const scored = bursaries.map((b: any) => {
      let score = 0;
      const reasons: string[] = [];

      // Field of study match (40 pts)
      if (!b.fields_of_study || b.fields_of_study.length === 0) {
        score += 20;
        reasons.push("Open to all fields");
      } else {
        const fieldLower = (field_of_study || "").toLowerCase();
        const match = b.fields_of_study.some((f: string) =>
          f.toLowerCase().includes(fieldLower) || fieldLower.includes(f.toLowerCase())
        );
        if (match) {
          score += 40;
          reasons.push("Matches your field of study");
        }
      }

      // Income match (30 pts)
      if (!b.max_household_income || b.max_household_income === 0) {
        score += 15;
        reasons.push("No income limit");
      } else if (household_income && household_income <= b.max_household_income) {
        score += 30;
        reasons.push("Within household income requirement");
      }

      // Academic match (20 pts)
      if (!b.min_average || b.min_average === 0) {
        score += 10;
        reasons.push("No minimum average required");
      } else if (average_mark && average_mark >= b.min_average) {
        score += 20;
        reasons.push(`Meets minimum average (${b.min_average}%)`);
      }

      // Province (10 pts)
      if (!b.provinces || b.provinces.length === 0) {
        score += 10;
        reasons.push("Available nationwide");
      } else if (province && b.provinces.includes(province)) {
        score += 10;
        reasons.push("Available in your province");
      }

      // Deadline bonus — reward bursaries still open
      if (b.deadline) {
        const daysLeft = Math.ceil((new Date(b.deadline).getTime() - new Date().getTime()) / 86400000);
        if (daysLeft < 0) {
          score = Math.max(0, score - 30); // penalise expired
          reasons.push("⚠️ Deadline has passed");
        } else if (daysLeft < 30) {
          reasons.push(`⚠️ Deadline approaching (${daysLeft} days left)`);
        }
      }

      return { ...b, match_score: Math.min(100, score), match_reasons: reasons };
    });

    const results = scored
      .filter((b: any) => b.match_score > 0)
      .sort((a: any, b: any) => b.match_score - a.match_score);

    return new Response(
      JSON.stringify({ bursaries: results }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});