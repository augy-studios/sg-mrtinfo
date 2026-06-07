import {
    createClient
} from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const token = parseCookie(req.headers.cookie || '', 'mrtinfo_session');
    if (token) {
        await supabase.from('mrtinfo_sessions').delete().eq('token', token);
    }

    res.setHeader('Set-Cookie', 'mrtinfo_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
    return res.status(200).json({
        ok: true
    });
}

function parseCookie(str, name) {
    const match = str.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}