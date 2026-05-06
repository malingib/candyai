-- Add pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted_token column to github_tokens table
ALTER TABLE public.github_tokens ADD COLUMN IF NOT EXISTS encrypted_token TEXT;

-- Create function to encrypt tokens before storing
CREATE OR REPLACE FUNCTION public.encrypt_github_token_func()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Encrypt the token using pgcrypto
    NEW.encrypted_token = encode(pgp_sym_encrypt(NEW.token, current_setting('app.secret_key', true)), 'base64');
    -- Clear the plain text token
    NEW.token = NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically encrypt tokens
DROP TRIGGER IF EXISTS encrypt_github_token_trigger ON public.github_tokens;
CREATE TRIGGER encrypt_github_token_trigger
  BEFORE INSERT OR UPDATE ON public.github_tokens
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_github_token_func();

-- Create function to decrypt token for use
CREATE OR REPLACE FUNCTION public.decrypt_github_token_func(encrypted_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(encrypted_token, 'base64'), current_setting('app.secret_key', true));
END;
$$;

-- Update existing records to encrypt tokens
UPDATE public.github_tokens 
SET encrypted_token = encode(pgp_sym_encrypt(token, current_setting('app.secret_key', true)), 'base64')
WHERE token IS NOT NULL AND encrypted_token IS NULL;