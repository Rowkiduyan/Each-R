import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://nokbftmzugwyfgyprcwh.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5va2JmdG16dWd3eWZneXByY3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2OTgzNDIsImV4cCI6MjA3NjI3NDM0Mn0.o7KoukclMG2myrnJRZUBbPlk0DhZ5SE8_AHOm00vyr4"

export const supabase = createClient(supabaseUrl, supabaseKey)