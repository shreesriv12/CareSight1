import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request) {
  try {
    const { email, password, fullName } = await request.json();

    console.log('Creating nurse with:', { email, fullName });
    
    // Create user with nurse role directly in user_metadata
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName,
        role: 'nurse'  // Set role in metadata
      },
      email_confirm: true
    });

    if (error) throw error;

    if (data.user) {
      // Insert directly into users table with nurse role
      // This bypasses any trigger that might create a patient record
      const { data: userData, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          role: 'nurse',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Ignore error inserting user:', insertError);
        // If insert fails, try update (in case trigger already created a record)
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('users')
          .update({ 
            role: 'nurse',
            full_name: fullName
          })
          .eq('id', data.user.id)
          .select()
          .single();

        if (updateError) throw updateError;
        
        // Delete from patients table if it exists there
        await supabaseAdmin
          .from('patients')
          .delete()
          .eq('user_id', data.user.id);

        return NextResponse.json({ 
          data: data, 
          nurse: updatedUser 
        });
      }

      return NextResponse.json({ 
        data: data, 
        nurse: userData 
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error creating nurse:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}