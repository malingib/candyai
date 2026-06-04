ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS widget_config text NOT NULL DEFAULT '{"border_radius":16,"font_family":"system","dark_mode":false,"width":380,"height":580,"button_radius":8,"animations":true,"show_branding":true,"show_avatar":true,"position_x":24,"position_y":24}';
