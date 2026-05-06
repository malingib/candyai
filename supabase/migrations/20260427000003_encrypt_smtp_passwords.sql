-- Add encrypted_password column to smtp_settings table
ALTER TABLE public.smtp_settings ADD COLUMN IF NOT EXISTS encrypted_password TEXT;

-- Create function to encrypt passwords before storing
CREATE OR REPLACE FUNCTION public.encrypt_smtp_password_func()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Encrypt the password using pgcrypto
    NEW.encrypted_password = encode(pgp_sym_encrypt(NEW.password, current_setting('app.secret_key', true)), 'base64');
    NEW.password = NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically encrypt passwords
DROP TRIGGER IF EXISTS encrypt_smtp_password_trigger ON public.smtp_settings;
CREATE TRIGGER encrypt_smtp_password_trigger
  BEFORE INSERT OR UPDATE ON public.smtp_settings
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_smtp_password_func();

-- Update existing records to encrypt passwords
UPDATE public.smtp_settings 
SET encrypted_password = encode(pgp_sym_encrypt(password, current_setting('app.secret_key', true)), 'base64')
WHERE password IS NOT NULL;