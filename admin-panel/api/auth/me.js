import {
    createClient
} from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export function parseCookie(str, name) {
    const match = str.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

export async function getSession(req) {
    const token = parseCookie(req.headers.cookie || '', 'mrtinfo_session');
    if (!token) return null;

    const {
        data: sessions
    } = await supabase
        .from('mrtinfo_sessions')
        .select('user_id, expires_at')
        .eq('token', token)
        .limit(1);

    if (!sessions?.length) return null;
    const sess = sessions[0];
    if (new Date(sess.expires_at) < new Date()) {
        await supabase.from('mrtinfo_sessions').delete().eq('token', token);
        return null;
    }

    const {
        data: users
    } = await supabase
        .from('mrtinfo_users')
        .select('id, username, display_name, email, is_admin, is_approved')
        .eq('id', sess.user_id)
        .limit(1);

    if (!users?.length || !users[0].is_approved) return null;
    return users[0];
}

export default async function handler(req, res) {
    const user = await getSession(req);
    if (!user) return res.status(401).json({
        error: 'Not authenticated'
    });
    return res.status(200).json(user);
}