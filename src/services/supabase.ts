import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zhcupwgfxrwawqcyejrx.supabase.co";
const supabaseAnonKey = "sb_publishable_VhLGfEXOxTdmwYkANRHk0g_KVsxWBLI"
export const supabase = createClient(supabaseUrl, supabaseAnonKey);