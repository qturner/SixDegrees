export default async function handler(req, res) {
    let serverImportResult = "Not attempted";
    let serverImportError = null;

    try {
        const server = await import('./server/index.js');
        serverImportResult = "Success: " + Object.keys(server).join(', ');
    } catch (e) {
        serverImportResult = "Failed";
        serverImportError = {
            message: e.message,
            stack: e.stack,
            code: e.code
        };
    }

    res.status(200).json({
        status: "ok",
        message: "Plain JS Test endpoint working",
        serverImportResult,
        serverImportError,
        env: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        importMetaDirnameSupported: !!(import.meta.dirname),
        timestamp: new Date().toISOString()
    });
}
