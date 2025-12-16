module.exports = function (req, res, next) {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ msg: 'Access denied. Not a Super Admin.' });
  }
  next();
};
