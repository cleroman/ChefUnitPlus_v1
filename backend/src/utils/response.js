// ChefUnitPlus - Reponses standard

function success(res, data = null, message = null, statusCode = 200) {
  const response = { success: true };
  if (message) response.message = message;
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
}

function error(res, message, statusCode = 400, code = null, errors = null) {
  const response = { success: false, message };
  if (code) response.code = code;
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
}

module.exports = { success, error };