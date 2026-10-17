// ChefUnitPlus - Chat Controller (placeholder)
// Retourne une liste vide pour que le front ne crashe pas

exports.listConversations = async (req, res) => {
  return res.json({
    success: true,
    data: [],
    message: 'Chat non implemente - retourne liste vide'
  });
};

exports.getMessages = async (req, res) => {
  return res.json({
    success: true,
    data: [],
    message: 'Chat non implemente'
  });
};

exports.sendMessage = async (req, res) => {
  return res.status(501).json({
    success: false,
    message: 'Envoi de message non implemente'
  });
};

exports.createConversation = async (req, res) => {
  return res.status(501).json({
    success: false,
    message: 'Creation de conversation non implementee'
  });
};