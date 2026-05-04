
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'free',
  chats_used INTEGER NOT NULL DEFAULT 0,
  chats_limit INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create knowledge_base table
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create smtp_settings table
CREATE TABLE public.smtp_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  host TEXT NOT NULL DEFAULT '',
  port INTEGER NOT NULL DEFAULT 587,
  username TEXT NOT NULL DEFAULT '',
  password TEXT NOT NULL DEFAULT '',
  encryption TEXT NOT NULL DEFAULT 'tls',
  from_email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check ownership via conversation
CREATE OR REPLACE FUNCTION public.get_conversation_owner(conv_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.conversations WHERE id = conv_id;
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON public.knowledge_base FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_smtp_settings_updated_at BEFORE UPDATE ON public.smtp_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies: profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies: knowledge_base
CREATE POLICY "Users can view own kb" ON public.knowledge_base FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kb" ON public.knowledge_base FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kb" ON public.knowledge_base FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own kb" ON public.knowledge_base FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: conversations
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies: messages (via conversation ownership)
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = public.get_conversation_owner(conversation_id));
CREATE POLICY "Users can insert own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = public.get_conversation_owner(conversation_id));

-- RLS Policies: leads
CREATE POLICY "Users can view own leads" ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leads" ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leads" ON public.leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leads" ON public.leads FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: smtp_settings
CREATE POLICY "Users can view own smtp" ON public.smtp_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own smtp" ON public.smtp_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own smtp" ON public.smtp_settings FOR UPDATE USING (auth.uid() = user_id);
