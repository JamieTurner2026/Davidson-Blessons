import { verifyNivAccess, YouVersionError } from "../../lib/youversion.js";

const ERROR_STATUS = {
  MISSING_APP_KEY: 500,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  PROVIDER_ERROR: 502,
  NETWORK_ERROR: 502,
  NIV_NOT_FOUND: 500,
  NIV_NOT_LICENSED: 403
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ configured: false, message: "Method not allowed." });
  }

  try {
    const status = await verifyNivAccess();
    return res.status(status.configured ? 200 : 500).json(status);
  } catch (err) {
    if (err instanceof YouVersionError) {
      // Developer-facing detail goes to server logs only, never to the client.
      console.error(`[bible/verify-access] ${err.code}:`, err.detail || err.message);
      return res.status(ERROR_STATUS[err.code] || 500).json({
        configured: false,
        reason: err.code,
        message: err.publicMessage
      });
    }
    console.error("[bible/verify-access] unexpected error:", err);
    return res.status(500).json({
      configured: false,
      reason: "UNKNOWN_ERROR",
      message: "Unable to verify NIV access right now. Please try again."
    });
  }
}
