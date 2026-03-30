-- Daily Sparks: Supabase Database Schema

-- 1. 家長帳戶表 (擴充自 Supabase 原生 Auth)
CREATE TABLE public.parents (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'free', -- 'free', 'active', 'canceled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. 學童配置表 (Students Profile)
-- 每位家長可以設定一個(或多個)孩子，每個孩子能獨立派發至不同的 iPad
CREATE TABLE public.students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    
    -- IB 學科偏好 (TEXT 陣列存放字串)
    ib_subjects TEXT[] DEFAULT '{}',
    
    -- 投遞設置
    goodnotes_email TEXT,
    notion_database_id TEXT,
    notion_access_token TEXT,
    
    -- 給 AI prompt 的特化微調 (選用)
    curriculum_level TEXT DEFAULT 'K-5', -- P5 (11歲)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. 安全權限設置 (RLS: Row Level Security)
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 確定家長只能讀取與修改自己的資料與孩子的資料
CREATE POLICY "Parents can view their own profile" ON public.parents FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Parents can update their own profile" ON public.parents FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Parents can view their children" ON public.students FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY "Parents can create children profile" ON public.students FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can update their children profile" ON public.students FOR UPDATE USING (auth.uid() = parent_id);
