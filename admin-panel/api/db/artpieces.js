import {
    supabase,
    requireAuth,
    paginate
} from './_middleware.js';

export default async function handler(req, res) {
    const needsKey = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
    const user = await requireAuth(req, res, needsKey);
    if (!user) return;

    const {
        id
    } = req.query;

    if (req.method === 'GET' && req.query.count === '1') {
        const {
            count
        } = await supabase.from('mrtinfo_artpieces').select('*', {
            count: 'exact',
            head: true
        });
        return res.json({
            count
        });
    }

    if (req.method === 'GET' && !id) {
        const {
            from,
            to,
            page
        } = paginate(req.query);
        const search = req.query.search || '';

        let q = supabase
            .from('mrtinfo_artpieces')
            .select(`*, mrtinfo_stations!mrtinfo_artpieces_station_fkey(name_en)`, {
                count: 'exact'
            })
            .range(from, to)
            .order('title');

        if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

        const {
            data,
            count,
            error
        } = await q;
        if (error) return res.status(500).json({
            error: error.message
        });

        const rows = (data || []).map(r => ({
            ...r,
            station_name: r.mrtinfo_stations?.name_en,
        }));
        return res.json({
            rows,
            total: count,
            page
        });
    }

    if (req.method === 'GET' && id) {
        const {
            data,
            error
        } = await supabase.from('mrtinfo_artpieces').select('*').eq('uid', id).single();
        if (error) return res.status(404).json({
            error: 'Not found'
        });
        return res.json(data);
    }

    if (req.method === 'POST') {
        const {
            data,
            error
        } = await supabase.from('mrtinfo_artpieces').insert(req.body).select().single();
        if (error) return res.status(400).json({
            error: error.message
        });
        return res.status(201).json(data);
    }

    if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
        const {
            data,
            error
        } = await supabase.from('mrtinfo_artpieces').update(req.body).eq('uid', id).select().single();
        if (error) return res.status(400).json({
            error: error.message
        });
        return res.json(data);
    }

    if (req.method === 'DELETE' && id) {
        const {
            error
        } = await supabase.from('mrtinfo_artpieces').delete().eq('uid', id);
        if (error) return res.status(400).json({
            error: error.message
        });
        return res.status(204).end();
    }

    return res.status(405).json({
        error: 'Method not allowed'
    });
}