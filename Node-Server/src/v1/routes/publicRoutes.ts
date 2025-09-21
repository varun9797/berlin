import { Router } from "express";
import userRoutes from "../components/user/userRoutes";
import { getInvitationDetails } from "../components/invitation/invitationController";
const router = Router();

router.use('/user', userRoutes);

// Public invitation route (no auth required for viewing invitation details)
router.get('/invitation/details/:token', getInvitationDetails);

export default router;