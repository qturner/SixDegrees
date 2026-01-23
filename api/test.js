
export default function handler(req, res) {
    res.status(200).json({ status: "ok", message: "Plain JS Test endpoint working", env: process.env.NODE_ENV });
}
