function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = header.slice(7);
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Invalid token' });
  }
  next();
}

module.exports = auth;
