import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Auth helpers
export const signUp = async (email, password, fullName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) throw error;

  // Insert user data
  if (data.user) {
    // Wait a bit for the user to be confirmed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: 'patient'
      }, {
        onConflict: 'id'
      });

    if (userError) throw userError;
  }

  return data;
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  
  // Get user data after successful sign in
  if (data.user) {
    const userData = await getCurrentUser();
    return { ...data, userData };
  }
  
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  console.log('getCurrentUser - auth user:', user, 'error:', authError);
  
  if (authError || !user) return null;

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  console.log('getCurrentUser - user data from DB:', userData, 'error:', error);

  if (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
  return userData;
};

export const createNurse = async (email, password, fullName) => {
  try {
    const response = await fetch('/api/admin/create-nurse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, fullName }),
    });

    // Read the response body once, regardless of success or error
    const responseText = await response.text();
    let responseData;

    // Try to parse as JSON
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      // If JSON parsing fails, use the raw text
      responseData = { error: responseText || 'Unknown error occurred' };
    }

    if (!response.ok) {
      const errorMessage = responseData.error || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    return responseData;
  } catch (error) {
    console.error('Error in createNurse:', error);
    throw error;
  }
};