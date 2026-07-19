import { Router } from "express";
import { validate } from "../middleware/validateRequest.js";
import { chat } from "../controllers/chatController.js";
import { checkEligibilityHandler } from "../controllers/eligibilityController.js";
import { answerQuestionHandler } from "../controllers/questionController.js";

const router = Router();

// Feature 1: Conversational AI chatbot
router.post(
  "/chat",
  validate({ body: { message: "string" } }),
  chat
);

// Feature 2: Donor eligibility check
router.post(
  "/eligibility",
  validate({
    body: {
      age: "number",
      weight: "number",
      gender: "string",
      lastDonationDate: "?string",
      medicalConditions: "?string",
      medications: "?string",
      recentIllness: "?string",
      lifestyleInformation: "?string",
      otherDetails: "?string",
    },
  }),
  checkEligibilityHandler
);

// Feature 3: General donor questions
router.post(
  "/questions",
  validate({ body: { question: "string" } }),
  answerQuestionHandler
);

export default router;