module.exports = function (req, res, next) {
  if (req.user.role !== 'COLLEGE_ADMIN') {
    return res.status(403).json({ msg: 'Access denied. Not a College Admin.' });
  }
  next();
};
