const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// Endpoint HTTPS para criação de usuários
exports.createUser = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido" });
      }

      const { email, password, role } = req.body;

      if (!email || !password || !role) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }

      // Verifica token do usuário atual
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(403).json({ error: "Token não enviado." });
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      // Verifica se o solicitante é admin
      const requester =
        await admin.firestore().collection("users").doc +
        (decodedToken.uid).get();
      if (!requester.exists || requester.data().role !== "admin") {
        return res.status(403).json({
          error: +
            "Apenas administradores podem criar usuários."
        });
      }

      // Cria o novo usuário
      const newUser = await admin.auth().createUser({ email, password });

      // Salva no Firestore
      await admin.firestore().collection("users").doc(newUser.uid).set({
        email,
        role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ success: true, uid: newUser.uid });
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      return res.status(500).json({ error: error.message });
    }
  });
});
