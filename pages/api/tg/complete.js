// pages/api/tg/complete.js

// This endpoint is called by the onboard page after wallet creation
// It validates the state token with the bot backend and saves the wallet info

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { state, privyUserId, solAddress, telegramId } = req.body || {};

  if (!state || !privyUserId || !solAddress) {
    return res.status(400).json({ 
      ok: false, 
      error: "Missing required fields: state, privyUserId, solAddress" 
    });
  }

  // Call bot backend to validate state and get expected Telegram ID
  const botBackendUrl = process.env.BOT_BACKEND_URL || 'http://localhost:8080';
  
  try {
    const validateResponse = await fetch(`${botBackendUrl}/validate-wallet-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });

    const validateResult = await validateResponse.json();

    if (!validateResult.ok) {
      return res.status(400).json({ 
        ok: false, 
        error: validateResult.error || "Invalid or expired state token" 
      });
    }

    const expectedTgId = validateResult.telegramId;

    // SECURITY: Verify that the Telegram user who authenticated matches the one who requested the link
    if (telegramId && String(telegramId) !== String(expectedTgId)) {
      console.error("⚠️ Telegram ID mismatch:", {
        expected: expectedTgId,
        received: telegramId,
      });
      return res.status(403).json({ 
        ok: false, 
        error: "Telegram identity mismatch. Please try again from your bot." 
      });
    }

    // Save wallet to bot backend (in-memory for now, will be database later)
    try {
      const saveResponse = await fetch(`${botBackendUrl}/save-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: expectedTgId,
          solAddress,
          privyUserId,
        }),
      });

      const saveResult = await saveResponse.json();
      
      if (!saveResult.ok) {
        console.error("⚠️ Failed to save wallet to bot backend:", saveResult.error);
        // Don't fail the request, just log it
      }
    } catch (saveError) {
      console.error("⚠️ Error saving wallet to bot backend:", saveError);
      // Don't fail the request, just log it
    }

    console.log("✅ Wallet created/confirmed for Telegram user:", {
      telegramId: expectedTgId,
      privyUserId,
      solAddress,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("Error validating state with bot backend:", error);
    return res.status(500).json({ 
      ok: false, 
      error: "Failed to validate with bot backend. Please try again." 
    });
  }
}
