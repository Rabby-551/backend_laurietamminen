const sendResponse = (
  res,
  { statusCode = 200, success = true, message = 'Success', data = null, meta = null },
) => {
  const payload = {
    success,
    message,
  };

  if (meta) {
    payload.meta = meta;
  }

  if (data !== null) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
};

export default sendResponse;
