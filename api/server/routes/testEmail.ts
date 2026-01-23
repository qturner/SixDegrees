import type { Express } from "express";
import { emailService } from "../services/email.js";

export function registerTestEmailRoutes(app: Express) {
  // Test email endpoint for debugging
  app.get("/api/test-email", async (req, res) => {
    try {
      console.log("Manual email connection test requested...");
      const isConnected = await emailService.testConnection();

      if (isConnected) {
        res.json({
          success: true,
          message: "Gmail SMTP connection successful"
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Gmail SMTP connection failed - check server logs for details"
        });
      }
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({
        success: false,
        message: "Error testing email connection",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}