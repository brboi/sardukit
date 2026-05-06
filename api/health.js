export default function handler(req, res) {
  res.status(200).json({ 
    ok: true, 
    service: "sardukit", 
    ts: new Date().toISOString() 
  });
}
