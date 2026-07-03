export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(error, req, res, next) {
  const status = error.status || 500;
  const message = status >= 500 ? 'Server error' : error.message;
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json({ error: message });
}
