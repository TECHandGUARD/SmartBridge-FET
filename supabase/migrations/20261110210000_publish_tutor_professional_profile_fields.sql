-- Publish the non-sensitive professional fields that the public tutor profile
-- already renders. Never expose the SACE registration number or clearance data.
DROP VIEW public.tutor_directory;
DROP FUNCTION smartbridge_private.verified_tutor_directory();

CREATE FUNCTION smartbridge_private.verified_tutor_directory()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_email text,
  full_name text,
  bio text,
  avatar_url text,
  subjects text[],
  grades text[],
  hourly_rate numeric,
  rating numeric,
  total_reviews integer,
  is_verified boolean,
  video_url text,
  subject_rates jsonb,
  offers_free_intro boolean,
  institution text,
  study_field text,
  study_year text,
  qualifications text[],
  specializations text[],
  teaching_languages text[],
  certifications text[],
  teaching_experience_years integer,
  tutoring_experience_years integer,
  teaching_style text,
  offers_online_tutoring boolean,
  offers_in_person_tutoring boolean,
  sace_details_submitted boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active = true
  ) THEN
    RAISE EXCEPTION 'Active account required';
  END IF;

  RETURN QUERY
  SELECT
    t.id, t.user_id, t.user_email, t.full_name, t.bio, t.avatar_url,
    t.subjects, t.grades, t.hourly_rate, t.rating, t.total_reviews, t.is_verified,
    NULLIF(t.metadata->>'video_url',''), t.subject_rates, t.offers_free_intro,
    t.institution, t.study_field, t.study_year,
    ARRAY(
      SELECT q.value
      FROM unnest(COALESCE(t.qualifications, ARRAY[]::text[])) WITH ORDINALITY AS q(value, position)
      WHERE q.value !~* '^SACE([[:space:]:#-]|$)'
        AND q.value !~* 'SACE[^0-9]{0,30}[0-9]{8,12}'
      ORDER BY q.position
    ),
    t.specializations,
    t.teaching_languages,
    ARRAY(
      SELECT cert.value
      FROM unnest(COALESCE(t.certifications, ARRAY[]::text[])) WITH ORDINALITY AS cert(value, position)
      WHERE cert.value !~* '^SACE([[:space:]:#-]|$)'
        AND cert.value !~* 'SACE[^0-9]{0,30}[0-9]{8,12}'
      ORDER BY cert.position
    ),
    COALESCE(t.teaching_experience_years,0), COALESCE(t.tutoring_experience_years,0),
    t.teaching_style, COALESCE(t.offers_online_tutoring,true),
    COALESCE(t.offers_in_person_tutoring,false),
    NULLIF(BTRIM(t.sace_number),'') IS NOT NULL
  FROM public.tutor_profiles t
  JOIN public.users u ON u.id = t.user_id
  WHERE t.is_verified = true
    AND COALESCE(t.is_active,true)
    AND u.is_active = true;
END;
$$;

REVOKE ALL ON FUNCTION smartbridge_private.verified_tutor_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION smartbridge_private.verified_tutor_directory() TO authenticated;

CREATE VIEW public.tutor_directory WITH (security_invoker=true)
AS SELECT * FROM smartbridge_private.verified_tutor_directory();

REVOKE ALL ON public.tutor_directory FROM PUBLIC, anon;
GRANT SELECT ON public.tutor_directory TO authenticated;
