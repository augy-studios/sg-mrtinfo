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
        } = await supabase.from('mrtinfo_transfers').select('*', {
            count: 'exact',
            head: true
        });
        return res.json({
            count
        });
    }

    if (req.method === 'GET' && !id) {
        const { from, to, page } = paginate(req.query);
        const search = req.query.search || '';
        const sortBy = req.query.sortBy || '';
        const ascending = req.query.sortDir !== 'desc';
        const indoors = 'indoors' in req.query ? req.query.indoors === 'true' : null;
        const coveredwalkway = 'coveredwalkway' in req.query ? req.query.coveredwalkway === 'true' : null;
        const jsSort = sortBy === 'from_name' || sortBy === 'to_name';

        let q = supabase
            .from('mrtinfo_transfers')
            .select(`*, from_station:mrtinfo_stations!mrtinfo_transfers_from_fkey(name_en), to_station:mrtinfo_stations!mrtinfo_transfers_to_fkey(name_en)`, { count: 'exact' });
        if (!jsSort) q = q.range(from, to);

        if (sortBy && !jsSort) {
            q = q.order(sortBy, { ascending });
        } else if (!sortBy) {
            q = q.order('duration');
        }

        if (search) q = q.or(`from_station.name_en.ilike.%${search}%,to_station.name_en.ilike.%${search}%`);
        if (indoors !== null) q = q.eq('indoors', indoors);
        if (coveredwalkway !== null) q = q.eq('coveredwalkway', coveredwalkway);

        const { data, count, error } = await q;
        if (error) return res.status(500).json({ error: error.message });

        let rows = (data || []).map(r => ({
            ...r,
            from_name: r.from_station?.name_en,
            to_name: r.to_station?.name_en,
        }));

        if (jsSort) {
            rows = rows.sort((a, b) => {
                const av = (a[sortBy] || '').toLowerCase();
                const bv = (b[sortBy] || '').toLowerCase();
                return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
            });
            rows = rows.slice(from, to + 1);
        }

        return res.json({ rows, total: count, page });
    }

    if (req.method === 'GET' && id) {
        const {
            data,
            error
        } = await supabase.from('mrtinfo_transfers').select('*').eq('uid', id).single();
        if (error) return res.status(404).json({
            error: 'Not found'
        });
        return res.json(data);
    }

    if (req.method === 'POST') {
        const {
            data,
            error
        } = await supabase.from('mrtinfo_transfers').insert(req.body).select().single();
        if (error) return res.status(400).json({
            error: error.message
        });
        return res.status(201).json(data);
    }

    if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
        const {
            data,
            error
        } = await supabase.from('mrtinfo_transfers').update(req.body).eq('uid', id).select().single();
        if (error) return res.status(400).json({
            error: error.message
        });
        return res.json(data);
    }

    if (req.method === 'DELETE' && id) {
        const {
            error
        } = await supabase.from('mrtinfo_transfers').delete().eq('uid', id);
        if (error) return res.status(400).json({
            error: error.message
        });
        return res.status(204).end();
    }

    return res.status(405).json({
        error: 'Method not allowed'
    });
}