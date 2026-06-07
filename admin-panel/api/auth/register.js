import {
    createClient
} from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({
        error: 'Method not allowed'
    });

    const {
        username,
        email,
        display_name,
        password
    } = req.body || {};

    if (!username || !email || !password) return res.status(400).json({
        error: 'Missing required fields'
    });

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return res.status(400).json({
        error: 'Username must be 3–30 characters (letters, numbers, underscores only)'
    });

    if (password.length < 8) return res.status(400).json({
        error: 'Password must be at least 8 characters'
    });

    const {
        data: existing
    } = await supabase
        .from('mrtinfo_users')
        .select('id, username, email')
        .or(`username.eq.${username},email.eq.${email}`)
        .limit(1);

    if (existing?.length) {
        const taken = existing[0];
        const field = taken.username === username ? 'Username' : 'Email';
        return res.status(409).json({ error: `${field} already taken` });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const {
        error
    } = await supabase.from('mrtinfo_users').insert({
        username,
        email,
        display_name: display_name?.trim() || username,
        password_hash,
        is_approved: false,
        is_admin: false
    });

    if (error) {
        console.error('register insert error:', error);
        return res.status(500).json({
            error: 'Registration failed'
        });
    }

    return res.status(201).json({
        message: 'Registration submitted'
    });
}
