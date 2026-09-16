CREATE TABLE public.sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.sites TO anon;
GRANT SELECT, INSERT ON public.sites TO authenticated;
GRANT ALL ON public.sites TO service_role;

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sites" ON public.sites FOR SELECT USING (true);
CREATE POLICY "Anyone can create sites" ON public.sites FOR INSERT WITH CHECK (true);

CREATE INDEX sites_created_at_idx ON public.sites (created_at DESC);