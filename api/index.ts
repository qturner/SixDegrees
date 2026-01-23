import { initServer } from '../server/index';
import { type VercelRequest, type VercelResponse } from '@vercel/node';

let cachedApp: any = null;

export default async (req: VercelRequest, res: VercelResponse) => {
    if (!cachedApp) {
        const { app } = await initServer();
        cachedApp = app;
    }
    return cachedApp(req, res);
};
